import * as functions from 'firebase-functions'
import fetch from 'node-fetch'
import { WriteBatch, Timestamp } from '@google-cloud/firestore'
import moment from 'moment'
import 'moment-timezone'

const admin = require('firebase-admin')
admin.initializeApp();
const firestore = admin.firestore()
const storage = admin.storage()

const PromisePool = require('es6-promise-pool').PromisePool;

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

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
 * @param fromDate 取り込む日時(YYYY-MM-DD)
 */
async function importBitFlyerLogs(fromDate: string) {
  console.log(`fromDate=${fromDate}`)

  // 保存済みかどうかのキャッシュファイルを取得
  const bucket = storage.bucket()
  const file = bucket.file(`cache.json`)
  const cacheStr: string = await file.download().then((data: any[]) => data[0])
  const cache: any = JSON.parse(cacheStr)

  // キャッシュデータの構造が存在しなければ初期化
  const cacheMessageIds = cache['messageIds'] = cache['messageIds'] || {} 

  // bitflyerからチャットログを取得する。
  const bitFlyerApiEndpoint = `https://api.bitflyer.com/v1/getchats`
  const messages: Array<BitFlyerChatMessage> = await fetch(`${bitFlyerApiEndpoint}?from_date=${fromDate}`).then(res => res.json())
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

  await file.save(JSON.stringify(cache))

  return messages.length
}

/**
 * 定期的にチャットログを取り込むためのスケジューラー
 */
export const scheduledImportLogs = functions.pubsub.schedule('every 1 mins').onRun(async _ => {
  const fromDate = moment().format('YYYY-MM-DD')
  const concurrency = 1
  const promisePool = new PromisePool(() => importBitFlyerLogs(fromDate), concurrency)
  await promisePool.start();
  console.log(`Imported messages by schedule. fromDate=${fromDate}`)
});

/**
 * チャットログを取り込むFunctions
 */
export const importLogs = functions.https.onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(400).send(`Please use POST method.`)
    return
  }

  let fromDate = request.query.from_date || ''
  // 日付が指定されていない場合は当日を指定する。
  if (!fromDate.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
    fromDate = moment().format('YYYY-MM-DD')
  }

  const importedNum = await importBitFlyerLogs(fromDate)
  response.send(`Imported ${importedNum} messages. fromDate=${fromDate}`)
})

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