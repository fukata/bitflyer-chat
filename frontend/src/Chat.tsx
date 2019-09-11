import React from 'react'
import './Chat.css'
import { db } from './firebase'
import ChatMessage from './ChatMessage'
import firebase from 'firebase/app'

interface Props {
}
interface State {
  messages: Array<firebase.firestore.QueryDocumentSnapshot>;
  messageIds: Array<string>;
}

export default class extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      messages: new Array<firebase.firestore.QueryDocumentSnapshot>(),
      messageIds: new Array<string>()
    }
  }
  componentDidMount() {
    const today = new Date()
    let fromDate = firebase.firestore.Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours() - 2, today.getMinutes())) // 2時間前から表示
    console.log(`fromDate=${fromDate}`)
    db.collection('messages').where('date', '>=', fromDate).orderBy('date', 'asc').onSnapshot(querySnapshot => {
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
    const messages = this.state.messages
    return (
      <div>
        <table className="messages table table-dark table-sm">
          <thead>
            <tr>
              <th className="message-date">日時</th>
              <th className="message-nickname">ユーザー</th>
              <th className="message-message">メッセージ</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(message => {
              return <ChatMessage key={message.id} message={message} />
            })}
          </tbody>
        </table>
      </div>
    )
  }
}