import React from "react"
import firebase from "firebase/app"
import { db } from "./firebase"
import "./Archive.css"
import ChatMessage from './ChatMessage'

interface State {
  date: Date 
  messages: Array<firebase.firestore.QueryDocumentSnapshot>;
  messageIds: Array<string>;
}

export default class extends React.Component<any, State> {
  constructor(props: any) {
    super(props)
    const { date } = this.props.match.params
    this.state = {
      date: date,
      messages: new Array<firebase.firestore.QueryDocumentSnapshot>(),
      messageIds: new Array<string>()
    }
    this.fetchMessages(date)
  }

  componentDidUpdate() {
    const { date } = this.props.match.params
    if (date === this.state.date) {
      return
    }
    this.setState({
      date: date,
      messages: new Array<firebase.firestore.QueryDocumentSnapshot>(),
      messageIds: new Array<string>()
    })
    this.fetchMessages(date)
  }

  fetchMessages(dateStr: string) {
    console.log(`fetchMessages. date=${dateStr}`)
    const date = new Date(dateStr)
    const fromDate = firebase.firestore.Timestamp.fromDate(date)
    const toDate = firebase.firestore.Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()+1))
    console.log(`fromDate=${fromDate}, toDate=${toDate}`)
    db.collection('messages').where('date', '>=', fromDate).where('date', '<', toDate).orderBy('date', 'asc').get().then((querySnapshot: firebase.firestore.QuerySnapshot) => {
      const messages = this.state.messages
      const messageIds = this.state.messageIds
      for (const doc of querySnapshot.docs) {
        if (messageIds.indexOf(doc.id) === -1) {
          messages.push(doc)
          messageIds.push(doc.id) 
        }
      }
      this.setState({
        messages: messages,
        messageIds: messageIds
      })
    })
  }

  render() {
    return (
      <div className="col-md-10">
        <table className="archives table table-dark table-sm">
          <thead>
            <tr>
              <th className="message-date">日時</th>
              <th className="message-nickname">ユーザー</th>
              <th className="message-message">メッセージ</th>
            </tr>
          </thead>
          <tbody>
            {this.state.messages.map(message => {
              return <ChatMessage key={message.id} message={message} />
            })}
          </tbody>
        </table>
      </div>
    )
  }
}