import { Moment } from "moment";

export interface ChatMessageData {
  id: string
  date: Moment
  nickname: string
  message: string
}

export interface ArchivedChatMessageData {
  id: string
  date: string
  nickname: string
  message: string
}

interface FirebaseErrorObject {
  code: number
  message: string
  status: string

}

export interface Metadata {
  error?: FirebaseErrorObject
  created_at: string
  files: string[]
  message_num: number
  hours: {
    [key: string]: {
      files: string[]
      message_num: number
    }
  }
}