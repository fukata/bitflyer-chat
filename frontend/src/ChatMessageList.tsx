import React from 'react'
import ChatMessage from './ChatMessage'
import './ChatMessageList.css'
import { ChatMessageData } from './types'

interface Props {
  tz: string
  messages: Array<firebase.firestore.QueryDocumentSnapshot | ChatMessageData>
  enabledTransition: boolean
}

export default class extends React.Component<Props> {
  static defaultProps = {
    enabledTransition: false
  }
  render() {
    return (
      <table className="messages table table-dark table-sm">
        <tbody>
          {this.props.messages.map((message, idx) => {
            return <ChatMessage key={idx} message={message} tz={this.props.tz} enabledTransition={this.props.enabledTransition} />
          })}
        </tbody>
      </table>
    )
  }
}