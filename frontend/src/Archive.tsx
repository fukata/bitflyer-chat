import React from "react"
import "./Archive.css"
import ChatMessageList from './ChatMessageList'
import moment, { Moment } from 'moment'
import 'moment-timezone'
import { RouteComponentProps } from "react-router"
import InfiniteScroll from "react-infinite-scroller"
import { ChatMessageData, ArchivedChatMessageData, Metadata } from './types'
import ReactLoading from 'react-loading'
import { animateScroll as scroll } from 'react-scroll'
import ScreenHeaderNav from './ScreenHeaderNav'

interface MatchParams {
  date: string
}

interface Props extends RouteComponentProps<MatchParams> {
  tz: string
}

interface State {
  ready: boolean
  notfoundMetadata: boolean
  pageLoaded: number
  hasMore: boolean 
  lastLoadMoment: Moment | null 
  date: string 
  messages: Array<ChatMessageData>
  messageIds: Array<string>
}

export default class extends React.Component<Props, State> {
  private metadata: Metadata

  static defaultProps = {
    tz: moment.tz.guess()
  }

  constructor(props: Props) {
    super(props)
    this.metadata = {
      created_at: '',
      files: [],
      message_num: 0,
      hours: {},
    }
    const { date } = this.props.match.params
    this.state = {
      ready: false,
      notfoundMetadata: false,
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
    scroll.scrollToTop()
  }

  componentDidUpdate() {
    const { date } = this.props.match.params
    if (date === this.state.date) {
      return
    }
    this.setState({
      ready: false,
      notfoundMetadata: false,
      date: date,
      pageLoaded: 0,
      hasMore: false,
      lastLoadMoment: null,
      messages: [], 
      messageIds: [] 
    })
    this.loadMetadata(date)
    scroll.scrollToTop()
  }

  async loadMetadata(date?: string) {
    date = (date || this.state.date)
    console.log(`loadMetadata. date=${date}`)

    const [year, month, day] = date.split('-')
    const metadataUrl = `https://firebasestorage.googleapis.com/v0/b/bitflyer-chat.appspot.com/o/public%2Farchives%2F${year}%2F${month}%2F${day}%2Fmetadata.json?alt=media`
    this.metadata = await fetch(metadataUrl).then(res => res.json())
    console.log(this.metadata)

    this.setState({
      ready: true,
      notfoundMetadata: this.metadata.error !== undefined,
      hasMore: this.metadata.error === undefined,
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
    const HeaderNav = (
      <ScreenHeaderNav
        title={`${this.state.date}のアーカイブ`}
        displayHourLinks={true}
        archiveDate={this.state.date}
        archiveMetadata={this.metadata}
      />
    )
    if (this.state.notfoundMetadata) {
      return (
        <div>
          {HeaderNav}
          <div className="screen-inner">
            <p className="attension">
              {this.state.date}のデータが見つかりません。他の日付を指定してください。
            </p>
          </div>
        </div>
      )
    } else if (!this.state.ready) {
      return (
        <div>
          {HeaderNav}
          <div className="screen-inner">
            <div className="loading">
              <ReactLoading type={"bars"} color={"white"} />
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div>
          {HeaderNav}
          <div className="screen-inner">
            <InfiniteScroll
              loadMore={this.loadMore.bind(this)}
              hasMore={this.state.hasMore}
              loader={ <div key="loading" className="loading"><ReactLoading type={"bars"} color={"white"} /></div> }
            >
              <ChatMessageList messages={this.state.messages} tz={this.props.tz} />
            </InfiniteScroll>
          </div>
        </div>
      )
    }
  }
}