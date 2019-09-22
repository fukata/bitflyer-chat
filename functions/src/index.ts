import * as functions from 'firebase-functions'
import fetch from 'node-fetch'
import { WriteBatch, Timestamp } from '@google-cloud/firestore'
import moment, { Moment } from 'moment'
import 'moment-timezone'

const admin = require('firebase-admin')
admin.initializeApp();
const firestore = admin.firestore()
const storage = admin.storage()

const PromisePool = require('es6-promise-pool').PromisePool;

interface BitFlyerChatMessage {
  date: string;
  message: string;
  nickname: string;
}

interface FirestoreMessageDocData {
  date: Timestamp;
  message: string;
  nickname: string;
}

interface ArchiveMetadata {
  files: string[]
  messageNum: number 
  hours: {
    [key: string]: {
      files: string[]
      messageNum: number
    }
  }
}

/**
 * メッセージオブジェクトのIDを生成する。
 * @param message bitflyerから受け取ったメッセージオブジェクト
 */
function resolveMessageId(message: BitFlyerChatMessage): string {
  const sha256 = require('sha256')
  return sha256(`${message.date}:${message.nickname}:${message.message}`)
}

/**
 * BitFlyerChatMessageをDocの形式に変換する。
 * @param message bitflyerから受け取ったメッセージオブジェクト
 */
function convertMessageToDocData(message: BitFlyerChatMessage): FirestoreMessageDocData {
  return {
    date: Timestamp.fromDate(moment(message.date).utc().toDate()),
    message: message.message,
    nickname: message.nickname
  }
}

/**
 * bitFlyerのチャットログを取り込む。
 * @param fromDate 取り込む日時(YYYY-MM-DD) 日本時間
 */
async function importBitFlyerLogs(fromDate: string) {
  console.log(`importBitFlyerLogs. fromDate=${fromDate}`)
  const importDate = moment(fromDate)

  // 保存済みかどうかのキャッシュファイルを取得
  const bucket = storage.bucket()
  const file = bucket.file(`cache.json`)
  const cache: any = await file.download().then((data: any[]) => JSON.parse(data[0]))

  // キャッシュデータの構造が存在しなければ初期化
  cache['messageIds'] = cache['messageIds'] || {}
  const cacheMessageIds = cache['messageIds'][fromDate] = cache['messageIds'][fromDate] || {}

  // bitflyerからチャットログを取得する。
  const fetchDate = importDate.clone().add(-1, 'days').tz('Asia/Tokyo').format('YYYY-MM-DD')
  const bitFlyerApiEndpoint = `https://api.bitflyer.com/v1/getchats`
  const messages: Array<BitFlyerChatMessage> = await fetch(`${bitFlyerApiEndpoint}?from_date=${fetchDate}`).then(res => res.json())
  console.log(`messages.length=${messages.length}`)

  // firestoreにデータを格納する。
  // WriteBatchが500件ずつしか処理できないため、batchesに500件ずつ格納し、最後に一括で実行する。
  const messagesColRef = firestore.collection('messages')
  const batches: Array<WriteBatch> = []
  let processCount = 0
  const perProcess = 500 // WriteBatchの最大処理可能件数

  for (const message of messages) {
    processCount++
    const batchIdx = Math.floor(processCount / perProcess)
    console.log(`batchIdx=${batchIdx}`)
    if (!batches[batchIdx]) {
      batches[batchIdx] = firestore.batch()
    }
    const batch = batches[batchIdx]

    const messageDocId = resolveMessageId(message)
    // キャッシュをチェックし、存在すれば処理しない。
    cacheMessageIds[messageDocId] = cacheMessageIds[messageDocId] || {}
    if (cacheMessageIds[messageDocId].saved) {
      console.log(`Already saved messageDocId=${messageDocId}`)
    } else {
      console.log(`Save messageDocId=${messageDocId}`)
      const messageDocRef = messagesColRef.doc(messageDocId)
      const messageDocData = convertMessageToDocData(message)
      batch.set(messageDocRef, messageDocData)
      cacheMessageIds[messageDocId].saved = true
    }
  }

  console.log(`batches.length=${batches.length}`)
  for (const batch of batches) {
    await batch.commit()
  }

  //TODO messageIdsキャッシュの古い日付の物を削除する。
  await file.save(JSON.stringify(cache))

  return messages.length
}

/**
 * bitflyerのログをStorageにアーカイブする。
 * @param fromDate YYYY-MM-DD 日本時間の日付
 */
async function archiveBitFlyerLogs(fromDate: string) {
  console.log(`archiveBitFlyerLogs. fromDate=${fromDate}`)
  const archiveDate = moment(fromDate)

  // bitflyerからチャットログを取得する。
  const fetchDate = archiveDate.clone().add(-1, 'days').tz('Asia/Tokyo').format('YYYY-MM-DD')
  const bitFlyerApiEndpoint = `https://api.bitflyer.com/v1/getchats`
  const messages: Array<BitFlyerChatMessage> = await fetch(`${bitFlyerApiEndpoint}?from_date=${fetchDate}`).then(res => res.json())
  console.log(`messages.length=${messages.length}`)

  const archiveDateStr = archiveDate.format('YYYY-MM-DD')
  const metadata: ArchiveMetadata = {
    files: new Array<string>(), // ファイル一覧
    messageNum: 0,
    hours: {}, // 時間帯別のファイル一覧
  }
  let archiveMessages = new Array<BitFlyerChatMessage>()
  let currentIdx = 0
  let currentHour = '00' 
  let messageCount = 0
  const perFileMessage = 1000
  const fileIndexes: any = {}
  for (const message of messages) {
    if (!message.date.match(/Z$/)) {
      // 日付の形式をISO8601に変換
      message.date = `${message.date}Z`
    }
    // archiveDateStrは日本時間なのでメッセージ内の時間をAsia/Tokyoに変換
    const date = moment(message.date).tz('Asia/Tokyo')
    if (archiveDateStr !== date.format('YYYY-MM-DD')) {
      continue
    }
      
    const fileHour = date.format("HH")
    const fileIdx = Math.floor(messageCount / perFileMessage)

    if (currentHour !== fileHour) {
      fileIndexes[currentHour] = fileIndexes[currentHour] === undefined ? -1 : fileIndexes[currentHour]
      fileIndexes[currentHour] += 1

      const savedArchiveMessageInfo = await saveArchiveMessages(archiveDate, currentHour, fileIndexes[currentHour], archiveMessages)
      metadata.hours[`h${currentHour}`] = metadata.hours[`h${currentHour}`] || { files: [], messageNum: 0 }
      metadata.hours[`h${currentHour}`].files.push(savedArchiveMessageInfo.filename)
      metadata.hours[`h${currentHour}`].messageNum += savedArchiveMessageInfo.messageNum

      currentHour = fileHour
      currentIdx = 0
      archiveMessages = []
    } else if (currentIdx !== fileIdx) {
      fileIndexes[currentHour] = fileIndexes[currentHour] === undefined ? -1 : fileIndexes[currentHour]
      fileIndexes[currentHour] += 1

      const savedArchiveMessageInfo = await saveArchiveMessages(archiveDate, currentHour, fileIndexes[currentHour], archiveMessages)
      metadata.hours[`h${currentHour}`] = metadata.hours[`h${currentHour}`] || { files: [], messageNum: 0 }
      metadata.hours[`h${currentHour}`].files.push(savedArchiveMessageInfo.filename)
      metadata.hours[`h${currentHour}`].messageNum += savedArchiveMessageInfo.messageNum

      currentIdx = fileIdx
      archiveMessages = []
    }

    archiveMessages.push(message)
    messageCount++
  }

  if (archiveMessages.length > 0) {
    fileIndexes[currentHour] = fileIndexes[currentHour] === undefined ? -1 : fileIndexes[currentHour]
    fileIndexes[currentHour] += 1

    const savedInfo = await saveArchiveMessages(archiveDate, currentHour, fileIndexes[currentHour], archiveMessages)
    metadata.hours[`h${currentHour}`] = metadata.hours[`h${currentHour}`] || { files: [], messageNum: 0 }
    metadata.hours[`h${currentHour}`].files.push(savedInfo.filename)
    metadata.hours[`h${currentHour}`].messageNum += savedInfo.messageNum
  }

  const savedMetadata = await saveArchiveMetadata(archiveDate, metadata)

  return savedMetadata 
}

/**
 * Storageにアーカイブを保存する。
 * @param date 
 * @param hour 
 * @param idx 
 * @param messages 
 */
async function saveArchiveMessages(date: Moment, hour: string, idx: number, messages: Array<BitFlyerChatMessage>) {
  const filename = `messages.h${hour}.${idx}.json`
  const messageNum = messages.length
  console.log(`saveArchiveMessages. filename=${filename}, messagesNum=${messageNum}`)

  const bucket = storage.bucket()
  const file = bucket.file(`/public/archives/${date.format('YYYY/MM/DD')}/${filename}`)
  await file.save(JSON.stringify(messages), {
    gzip: true,
    contentType: 'application/json',
  })

  return {
    filename: filename,
    messageNum: messageNum,
  }
}

/**
 * Storageにアーカイブのメタデータを保存する。 
 * @param date 
 * @param metadata 
 */
async function saveArchiveMetadata(date: Moment, metadata: ArchiveMetadata) {
  const archiveMetadata: any = {
    files: [],
    message_num: 0,
    hours: {},
  }

  for (const hour in metadata.hours) {
    if (metadata.hours.hasOwnProperty(hour)) {
      const v = metadata.hours[hour]
      archiveMetadata.files = archiveMetadata.files.concat(v.files)
      archiveMetadata.message_num += v.messageNum 
      archiveMetadata.hours[hour] = {
        files: v.files,
        message_num: v.messageNum,
      } 
    }
  }
  
  const filename = `metadata.json`
  const bucket = storage.bucket()
  const file = bucket.file(`/public/archives/${date.format('YYYY/MM/DD')}/${filename}`)
  await file.save(JSON.stringify(archiveMetadata), {
    gzip: true,
    contentType: 'application/json',
  })

  return archiveMetadata
}

/**
 * 定期的にチャットログを取り込むためのスケジューラー
 */
export const scheduledImportLogs = functions.pubsub.schedule('every 1 mins').onRun(async _ => {
  const fromDate = moment().tz('Asia/Tokyo').format('YYYY-MM-DD')
  const concurrency = 1
  const promisePool = new PromisePool(() => importBitFlyerLogs(fromDate), concurrency)
  await promisePool.start();
  console.log(`Imported messages by schedule. fromDate=${fromDate}`)
});

/**
 * チャットログを取り込むFunctions
 */
//export const importLogs = functions.https.onRequest(async (request, response) => {
//  if (request.method !== 'POST') {
//    response.status(400).send(`Please use POST method.`)
//    return
//  }
//
//  let fromDate = request.query.from_date || ''
//  // 日付が指定されていない場合は当日を指定する。
//  if (!fromDate.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
//    fromDate = moment().tz('Asia/Tokyo').format('YYYY-MM-DD')
//  }
//
//  const importedNum = await importBitFlyerLogs(fromDate)
//  response.send(`Imported ${importedNum} messages. fromDate=${fromDate}`)
//})

/**
 * デプロイ日時を更新するFunctions
 */
export const deployComplete = functions.https.onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(400).send(`Please use POST method.`)
    return
  }

  //FIXME usernameとpasswordのチェック
  const params = request.body
  const username = params.username
  const password = params.password
  const config = functions.config().bitflyer_chat
  if (username !== config.username || password !== config.password) {
    response.status(400).send(`Can't authentication.`)
    return
  }

  const deployedAt = Timestamp.now()
  const batch = firestore.batch()
  const latestDeployLogRef = firestore.collection('deploy_logs').doc('latest')
  batch.set(latestDeployLogRef, {deployedAt: deployedAt})
  await batch.commit()

  response.send(`Deploy complete. ${deployedAt.seconds}`)
})

/**
 * チャットログをアーカイブするFunctions
 */
//export const archiveLogs = functions.runWith({ timeoutSeconds: 300 }).https.onRequest(async (request, response) => {
//  if (request.method !== 'POST') {
//    response.status(400).send(`Please use POST method.`)
//    return
//  }
//
//  const fromDate = request.query.from_date || ''
//  if (!fromDate.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
//    response.status(400).send(`from_date is must not blank. Please specify YYYY-MM-DD (recent 5 days)`)
//    return
//  }
//
//  const metadata = await archiveBitFlyerLogs(fromDate)
//  response.send(JSON.stringify(metadata))
//})

/**
 * 定期的にチャットログをアーカイブするためのスケジューラー
 */
export const scheduledArchiveLogs = functions.pubsub.schedule('every 1 hours').onRun(async _ => {
  const fromDate = moment().add(-1, 'hours').tz('Asia/Tokyo').format('YYYY-MM-DD')
  const concurrency = 1
  const promisePool = new PromisePool(() => archiveBitFlyerLogs(fromDate), concurrency)
  await promisePool.start();
  console.log(`Archived messages by schedule. fromDate=${fromDate}`)
});
