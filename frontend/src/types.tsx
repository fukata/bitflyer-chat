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