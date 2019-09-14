import React from "react"
import "./Archive.css"
import ChatMessageList from './ChatMessageList'
import moment, { Moment } from 'moment'
import 'moment-timezone'
import { RouteComponentProps } from "react-router"
import InfiniteScroll from "react-infinite-scroller"
import { ChatMessageData, ArchivedChatMessageData } from './types'

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
  messages: Array<ChatMessageData>
  messageIds: Array<string>
}

export default class extends React.Component<Props, State> {
  private metadata: {
    created_at: string
    files: string[]
  }

  static defaultProps = {
    tz: moment.tz.guess()
  }

  constructor(props: Props) {
    super(props)
    this.metadata = {
      created_at: '',
      files: []
    }
    const { date } = this.props.match.params
    this.state = {
      pageLoaded: 0,
      hasMore: false,
      lastLoadMoment: null,
      date: date,
      messages: [],
      messageIds: [] 
    }
  }

  componentDidMount() {
    this.loadMetadata()
  }

  componentDidUpdate() {
    const { date } = this.props.match.params
    if (date === this.state.date) {
      return
    }
    this.loadMetadata()
    this.setState({
      date: date,
      pageLoaded: 0,
      hasMore: true,
      lastLoadMoment: null,
      messages: [], 
      messageIds: [] 
    })
  }

  async loadMetadata() {
    console.log(`loadMetadata`)
    const [year, month, day] = this.state.date.split('-')
    const metadataUrl = `https://firebasestorage.googleapis.com/v0/b/bitflyer-chat.appspot.com/o/public%2Farchives%2F${year}%2F${month}%2F${day}%2Fmetadata.json?alt=media`
    this.metadata = await fetch(metadataUrl).then(res => res.json())
    console.log(this.metadata)

    this.setState({
      hasMore: true,
      pageLoaded: 0,
      messages: [],
      messageIds: [],
    })
  }

  loadMore() {
    const pageLoaded = this.state.pageLoaded + 1
    console.log(`hasMore. date=${this.state.date}, pageLoaded=${pageLoaded}, lastLoadMoment=${this.state.lastLoadMoment}`)
    const file: string = this.metadata.files[pageLoaded - 1] // インデックスは0始まり
    if (file === undefined) {
      this.setState({
        pageLoaded: pageLoaded,
        hasMore: false
      })
      return
    }

    //// アーカイブ用のjson内部の時間は日本時間なので時差分を引く。
    //const m = moment()
    //const utcOffset = m.utcOffset()
    //const offsetTz = m.tz(this.props.tz).utcOffset() - utcOffset 
 
    const [year, month, day] = this.state.date.split('-')
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/bitflyer-chat.appspot.com/o/public%2Farchives%2F${year}%2F${month}%2F${day}%2F${file}?alt=media`
    console.log(fileUrl)

    fetch(fileUrl).then(res => res.json()).then((_messages: ArchivedChatMessageData[]) => {
      const messages = this.state.messages
      _messages.forEach((message: ArchivedChatMessageData) => {
        messages.push({
          id: message.id,
          date: moment(message.date),
          nickname: message.nickname,
          message: message.message,
        }) 
      });

      console.log(`messages.length=${messages.length}`)
      this.setState({
        pageLoaded: pageLoaded,
        messages: messages,
        hasMore: pageLoaded < this.metadata.files.length,
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
        >
          <ChatMessageList messages={this.state.messages} tz={this.props.tz} />
        </InfiniteScroll>
      </div>
    )
  }
}