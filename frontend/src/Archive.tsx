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
  hour: string
}

interface Props extends RouteComponentProps<MatchParams> {
  tz: string
}

interface State {
  ready: boolean
  errorDate: boolean
  notfoundMetadata: boolean
  pageLoaded: number
  hasMore: boolean
  lastLoadMoment: Moment | null
  date: string
  dateMoment: Moment | null
  hours: string[]
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
    const dateMoment = this.parseDate(date)
    this.state = {
      ready: false,
      errorDate: dateMoment === null,
      notfoundMetadata: false,
      pageLoaded: 0,
      hasMore: false,
      lastLoadMoment: null,
      date: date,
      dateMoment: dateMoment,
      hours: [],
      messages: [],
      messageIds: []
    }
  }

  /**
   * 日付文字列をパースする。
   * @param date YYYY-MM-DD
   */
  parseDate(date: string): Moment | null {
    const m = moment(date, ['YYYY-MM-DD'], true)
    if (m.isValid()) {
      return m
    } else {
      return null
    }
  }

  componentDidMount() {
    this.loadMetadata()
    scroll.scrollToTop()
  }

  componentDidUpdate() {
    const { date, hour } = this.props.match.params
    const hours = this.parseHour(hour)
    //XXX 配列の値が同値かどうかチェックするためにJSON文字列を比較している。
    if (date === this.state.date && JSON.stringify(hours) === JSON.stringify(this.state.hours)) {
      return
    }
    const dateMoment = this.parseDate(date)
    this.setState({
      ready: false,
      errorDate: dateMoment === null,
      notfoundMetadata: false,
      date: date,
      dateMoment: dateMoment,
      hours: hours,
      pageLoaded: 0,
      hasMore: false,
      lastLoadMoment: null,
      messages: [],
      messageIds: []
    })
    this.loadMetadata(date)
    scroll.scrollToTop()
  }

  _isValidHour(hour: number) {
    if (hour < 0 || 24 < hour) {
      return false
    }
    return true
  }

  /**
   * 指定された時間をパースして連続する有効な時間一覧を配列で返す。
   * 例1: 00-03 => 00,01,02
   * 例2: 00 => 00
   * @param hour
   */
  parseHour(hour?: string) {
    if (hour === undefined) {
      return []
    }

    const hours = hour.split('-')

    // 範囲指定ではなく単一指定された場合
    if (hours.length === 1) {
      const from = parseInt(hours[0])
      if (this._isValidHour(from)) {
        return [from.toString().padStart(2, '0')]
      }
    }

    if (hours.length !== 2) {
      console.log(`Invalid hour. hour=${hour}`)
      return []
    }
    const from = parseInt(hours[0])
    const to = parseInt(hours[1])
    if (!this._isValidHour(from) || !this._isValidHour(to)) {
      console.log(`Invalid hour. from=${from}, to=${to}`)
      return []
    }

    const parsedHours: string[] = []
    for (let i=from; i<to; i++) {
      parsedHours.push(i.toString().padStart(2, '0'))
    }
    return parsedHours
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

  getLoadFiles() {
    if (this.state.hours.length === 0) {
      return this.metadata.files
    } else {
      return this.state.hours.map(h => this.metadata.hours[`h${h}`] || {}).map(v => v.files || []).reduce((a, b) => a.concat(b))
    }
  }

  loadMore() {
    const pageLoaded = this.state.pageLoaded + 1
    console.log(`hasMore. date=${this.state.date}, pageLoaded=${pageLoaded}, lastLoadMoment=${this.state.lastLoadMoment}`)
    const files = this.getLoadFiles()
    console.log(`files=${files}`)
    const file: string = files[pageLoaded - 1] // インデックスは0始まり
    if (file === undefined) {
      this.setState({
        pageLoaded: pageLoaded,
        hasMore: false
      })
      return
    }

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
        hasMore: pageLoaded < files.length,
      })
    })
  }


  render() {
    const dateStr = this.state.dateMoment === null ? '' : this.state.dateMoment.format('YYYY年MM月DD日')
    const title = this.state.errorDate ? `アーカイブ` : `${dateStr}のアーカイブ`
    const HeaderNav = (
      <ScreenHeaderNav
        title={title}
        displayHourLinks={!this.state.errorDate}
        archiveDate={this.state.date}
        archiveMetadata={this.metadata}
      />
    )
    if (this.state.errorDate) {
      return (
        <div>
          {HeaderNav}
          <div className="screen-inner">
            <p className="attension">
              指定された日付の形式(YYYY-MM-DD)が正しくありません。
            </p>
          </div>
        </div>
      )
    } else if (this.state.notfoundMetadata) {
      return (
        <div>
          {HeaderNav}
          <div className="screen-inner">
            <p className="attension">
              {dateStr}のデータが見つかりません。他の日付を指定してください。
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