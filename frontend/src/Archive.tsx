import React from "react"
import firebase from "firebase/app"
import { db } from "./firebase"
import "./Archive.css"
import ChatMessage from './ChatMessage'
import moment from 'moment'
import 'moment-timezone'
import { RouteComponentProps } from "react-router"

interface MatchParams {
  date: string
}

interface Props extends RouteComponentProps<MatchParams> {
  tz: string
}

interface State {
  loading: boolean 
  date: string 
  messages: Array<firebase.firestore.QueryDocumentSnapshot>;
  messageIds: Array<string>;
}

export default class extends React.Component<Props, State> {
  static defaultProps = {
    tz: moment.tz.guess()
  }

  constructor(props: Props) {
    super(props)
    const { date } = this.props.match.params
    this.state = {
      loading: true,
      date: date,
      messages: new Array<firebase.firestore.QueryDocumentSnapshot>(),
      messageIds: new Array<string>()
    }
  }

  componentDidMount() {
    this.fetchMessages(this.state.date)
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
    this.setState({ loading: true })
    const m = moment(dateStr)
    // 日本時間をベースに表示するため、日本との時差を計算する。
    const utcOffset = m.utcOffset()
    const offsetTokyo = m.tz(this.props.tz).utcOffset() - utcOffset 
    console.log(`offsetTokyo=${offsetTokyo}, utcOffset=${utcOffset}`)
    const fromDate = firebase.firestore.Timestamp.fromDate(m.add(-offsetTokyo, 'minutes').toDate())
    const toDate = firebase.firestore.Timestamp.fromDate(m.add(1, 'days').toDate())
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
        loading: false,
        messages: messages,
        messageIds: messageIds
      })
    })
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="col-md-10">
          <p className="loading">Loading...</p>
        </div>
      )
    } else {
      return (
        <div className="col-md-10">
          <table className="messages table table-dark table-sm">
            <tbody>
              {this.state.messages.map(message => {
                return <ChatMessage key={message.id} message={message} tz={this.props.tz} />
              })}
            </tbody>
          </table>
        </div>
      )
    }
  }
}