import React from 'react'
import './Chat.css'
import { db } from './firebase'
import ChatMessageList from './ChatMessageList'
import firebase from 'firebase/app'
import { RouterProps } from 'react-router'
import moment from 'moment'
import 'moment-timezone'
import { animateScroll as scroll } from 'react-scroll'

interface Props extends RouterProps {
}
interface State {
  loading: boolean
  messages: Array<firebase.firestore.QueryDocumentSnapshot>
  messageIds: Array<string>
}

export default class extends React.Component<Props, State> {
  private unsubscribe: any 

  constructor(props: Props) {
    super(props)
    this.unsubscribe = null
    this.state = {
      loading: true,
      messages: new Array<firebase.firestore.QueryDocumentSnapshot>(),
      messageIds: new Array<string>()
    }
  }

  componentDidMount() {
    const today = moment()
    let fromDate = firebase.firestore.Timestamp.fromDate(today.add(-2, 'hours').utc().toDate()) // 2時間前から表示
    console.log(`fromDate=${fromDate}`)
    this.unsubscribe = db.collection('messages').where('date', '>=', fromDate).orderBy('date', 'asc').onSnapshot(querySnapshot => {
      const messages = this.state.messages
      const messageIds = this.state.messageIds
      for (const doc of querySnapshot.docs) {
        if (messageIds.indexOf(doc.id) === -1) {
          messages.push(doc)
          messageIds.push(doc.id) 
        }
      }
      this.setState({
        loading: false,
        messages: messages,
        messageIds: messageIds
      })

      const autoScroll = localStorage.getItem('settings.autoScroll') === '1'
      console.log(`autoScroll=${autoScroll}`)
      if (autoScroll) {
        scroll.scrollToBottom()
        console.log(`scrollToBottom`)
      }
    })
  }

  componentWillUnmount() {
    console.log(`componentWillUnmount`)
    if (this.unsubscribe) {
      console.log(`unsubscribe`)
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  render() {
    if (this.state.loading) {
      return (
        <div>
          <p className="loading">Loading...</p>
        </div>
      )
    } else {
      const tz = moment.tz.guess()
      return (
        <div>
          <ChatMessageList messages={this.state.messages} tz={tz} />
        </div>
      )
    }
  }
}