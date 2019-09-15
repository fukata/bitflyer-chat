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
      <div className="messages bg-dark">
        {this.props.messages.map((message, _) => {
          return <ChatMessage key={message.id} message={message} tz={this.props.tz} enabledTransition={this.props.enabledTransition} />
        })}
      </div>
    )
  }
}