import * as functions from 'firebase-functions'
import fetch from 'node-fetch'
import { WriteBatch, Timestamp } from '@google-cloud/firestore'
import moment from 'moment'
import 'moment-timezone'

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

export const importLogs = functions.https.onRequest(async (request, response) => {
  const admin = require('firebase-admin')
  admin.initializeApp();
  
  let fromDate = request.query.from_date || ''
  // 日付が指定されていない場合は当日を指定する。
  if (!fromDate.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
    const now = new Date()
    fromDate = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}` // yyyy-mm-dd
  }

  console.log(`fromDate=${fromDate}`)
  // bitflyerからチャットログを取得する。
  const bitFlyerApiEndpoint = `https://api.bitflyer.com/v1/getchats`
  const messages: Array<BitFlyerChatMessage> = await fetch(`${bitFlyerApiEndpoint}?from_date=${fromDate}`).then(res => res.json())
  console.log(`messages.length=${messages.length}`)

  // firestoreにデータを格納する。
  // WriteBatchが500件ずつしか処理できないため、batchesに500件ずつ格納し、最後に一括で実行する。
  const firestore = admin.firestore()
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
    console.log(`messageDocId=${messageDocId}`)
    const messageDocRef = messagesColRef.doc(messageDocId)
    const messageDocData = convertMessageToDocData(message)
    batch.set(messageDocRef, messageDocData)
  }

  console.log(`batches.length=${batches.length}`)
  for (const batch of batches) {
    await batch.commit()
  }

  response.send(`Imported ${messages.length} messages.`)
})
