import React from "react"
import firebase from "firebase/app"
import { db } from "./firebase"
import "./Archive.css"
import ChatMessageList from './ChatMessageList'
import moment, { Moment } from 'moment'
import 'moment-timezone'
import { RouteComponentProps } from "react-router"
import InfiniteScroll from "react-infinite-scroller"

interface MatchParams {
  date: string
}

interface Props extends RouteComponentProps<MatchParams> {
  tz: string
}

interface State {
  pageLoaded: number 
  hasMore: boolean 
  lastLoadMoment: Moment | null 
  date: string 
  messages: Array<firebase.firestore.QueryDocumentSnapshot>
  messageIds: Array<string>
}

export default class extends React.Component<Props, State> {
  static defaultProps = {
    tz: moment.tz.guess()
  }

  constructor(props: Props) {
    super(props)
    const { date } = this.props.match.params
    this.state = {
      pageLoaded: 0,
      hasMore: true,
      lastLoadMoment: null,
      date: date,
      messages: new Array<firebase.firestore.QueryDocumentSnapshot>(),
      messageIds: new Array<string>()
    }
  }

  componentDidUpdate() {
    const { date } = this.props.match.params
    if (date === this.state.date) {
      return
    }
    this.setState({
      date: date,
      pageLoaded: 0,
      hasMore: true,
      lastLoadMoment: null,
      messages: new Array<firebase.firestore.QueryDocumentSnapshot>(),
      messageIds: new Array<string>()
    })
  }

  loadMore() {
    console.log(`hasMore. date=${this.state.date}, hasMore=${this.state.hasMore}, lastLoadMoment=${this.state.lastLoadMoment}`)
    const pageLoaded = this.state.pageLoaded + 1
    const perLoadHours = [0, 1, 2, 3, 6, 6, 6] // 一度に取得する時間間隔
    let perLoadHour = perLoadHours[pageLoaded]
    if (perLoadHour === undefined) {
      perLoadHour = 1
    }
    console.log(`perLoadHour=${perLoadHour}, pageLoaded=${pageLoaded}`)
    // 日本時間をベースに表示するため、日本との時差を計算する。
    const date = this.state.date
    const m = moment(date)
    const utcOffset = m.utcOffset()
    const offsetTokyo = m.tz(this.props.tz).utcOffset() - utcOffset 
    console.log(`offsetTokyo=${offsetTokyo}, utcOffset=${utcOffset}`)
    const fromDateMoment = this.state.lastLoadMoment !== null ? this.state.lastLoadMoment : m.add(-offsetTokyo, 'minutes')
    const toDateMoment = fromDateMoment.clone().add(perLoadHour, 'hours')
    const fromDate = firebase.firestore.Timestamp.fromDate(fromDateMoment.toDate())
    const toDate = firebase.firestore.Timestamp.fromDate(toDateMoment.toDate())
    console.log(`fromDate=${fromDate}, toDate=${toDate}`)
    db.collection('messages').where('date', '>=', fromDate).where('date', '<', toDate).orderBy('date', 'asc').get().then((querySnapshot: firebase.firestore.QuerySnapshot) => {
      // 24時間分ロードする前に日付を変更すると表示がおかしくなるので日付が正しいかチェック。
      if (date !== this.state.date) {
        console.log(`Not equal date so skip. date=${date}, state.date=${this.state.date}`)
        return
      }

      const messages = this.state.messages
      const messageIds = this.state.messageIds
      for (const doc of querySnapshot.docs) {
        if (messageIds.indexOf(doc.id) === -1) {
          messages.push(doc)
          messageIds.push(doc.id) 
        }
      }
      
      // 1日以上経過した場合は取得を止める。
      let hasMore = true
      if (parseInt(toDateMoment.format('x')) >= parseInt(m.add(-offsetTokyo, 'minutes').add(1, 'days').format('x'))) {
        console.log(`Stop load. date=${this.state.date}, fromDateMoment=${fromDateMoment}, toDateMoment=${toDateMoment}`)
        hasMore = false
      }
      this.setState({
        pageLoaded: pageLoaded,
        hasMore: hasMore,
        lastLoadMoment: toDateMoment.clone(),
        messages: messages,
        messageIds: messageIds
      })
    })
  }

  render() {
    return (
      <div>
        <InfiniteScroll
          loadMore={this.loadMore.bind(this)}
          hasMore={this.state.hasMore}
          loader={<div className="loading" key={0}>読み込み中 ...</div>}
          useWindow={false}
        >
          <ChatMessageList messages={this.state.messages} tz={this.props.tz} />
        </InfiniteScroll>
      </div>
    )
  }
}