import React from 'react'
import ChatMessage from './ChatMessage'
import './ChatMessageList.css'

interface Props {
  tz: string
  messages: Array<firebase.firestore.QueryDocumentSnapshot>
}

export default class extends React.Component<Props> {
  render() {
    return (
      <table className="messages table table-dark table-sm">
        <tbody>
          {this.props.messages.map(message => {
            return <ChatMessage key={message.id} message={message} tz={this.props.tz} />
          })}
        </tbody>
      </table>
    )
  }
}