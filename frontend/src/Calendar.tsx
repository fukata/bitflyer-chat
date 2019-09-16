import React from "react"
import { NavLink } from 'react-router-dom'
import "./Calendar.css"
import moment, { Moment } from 'moment'

interface Props {
  fromDate: string
  toDate: string
  displayMode: string
}

interface State {
  dateLinkNodeOpenStatuses: any 
  dateLinkNodes: JSX.Element[] 
}

export default class extends React.Component<Props, State> {
  private disabledDates: string[] 
  private cacheDates: any 
  
  static defaultProps = {
    fromDate: '2016-08-20',
    toDate: moment().tz('Asia/Tokyo').format('YYYY-MM-DD'),
    displayMode: 'sidebar', // sidebar or navbar 
  }

  constructor(props: Props) {
    super(props)
    this.disabledDates = [
      '2016-12-19', // ログが無い
    ]
    this.cacheDates = undefined 
    this.state = {
      dateLinkNodeOpenStatuses: this.makeDateLinkNodeStatuses(moment(this.props.fromDate), moment(this.props.toDate)),
      dateLinkNodes: []
    }
  }

  _changedDate(date: string) {
    console.log(`_changedDate. date=${date}`)
  }

  _toggleYearDir(year: string) {
    console.log(`_toggleYearDir`)
    const statuses = this.state.dateLinkNodeOpenStatuses[year]
    statuses.open = !statuses.open
    console.log(this.state.dateLinkNodeOpenStatuses)
    this.setState({
      dateLinkNodeOpenStatuses: this.state.dateLinkNodeOpenStatuses,
    })
  }

  _toggleMonthDir(year: string, month:string) {
    console.log(`_toggleMonthDir`)
    const statuses = this.state.dateLinkNodeOpenStatuses[year].nodes[month]
    statuses.open = !statuses.open
    this.setState({
      dateLinkNodeOpenStatuses: this.state.dateLinkNodeOpenStatuses,
    })
  }

  _isDisabledDate(date: string): boolean {
    return this.disabledDates.indexOf(date) !== -1
  }

  _makeDates(fromDate: Moment, toDate: Moment) {
    if (this.cacheDates) {
      return this.cacheDates
    }

    let currentDate = fromDate.clone()
    const dates: any = {} 
    while (currentDate <= toDate) {
      const yDir = dates[currentDate.format('YYYY')] = dates[currentDate.format('YYYY')] || {}
      const mDir = yDir[currentDate.format('MM')] = yDir[currentDate.format('MM')] || []
      mDir.push(currentDate.clone())
      currentDate.add(1, 'days')
    }
    this.cacheDates = dates
    return this.cacheDates 
  }

  makeDateLinkNodeStatuses(fromDate: Moment, toDate: Moment): {} {
    const dates = this._makeDates(fromDate, toDate) 
    const dateLinkNodeOpenStatuses: any = {} 
    for (const year in dates) {
      const yDir = dates[year]
      const yStatuses = dateLinkNodeOpenStatuses[year] = dateLinkNodeOpenStatuses[year] || { open: false, nodes: {} }
      for(const month in yDir) {
        yStatuses.nodes[month] = yStatuses.nodes[month] || { open: false }
      }
    }

    return dateLinkNodeOpenStatuses
  }

  /* eslint-disable jsx-a11y/anchor-is-valid, no-script-url */
  makeDateLinkNodes(fromDate: Moment, toDate: Moment, dateLinkNodeOpenStatuses: any): JSX.Element[] {
    const dates = this._makeDates(fromDate, toDate) 
    const dateLinkNodes = []
    const years = Object.keys(dates).sort().reverse()
    for (const year of years) {
      const yDir = dates[year]
      const monthLinks = []
      const months = Object.keys(yDir).sort().reverse()
      for(const month of months) {
        const dateLinks = yDir[month].map((date: Moment) => {
          const _dateStr = date.format('YYYY-MM-DD')
          if (this._isDisabledDate(_dateStr)) {
            return <li key={_dateStr}><del>{date.format('DD日')}</del></li>;
          } else {
            return <li key={date.format('YYYY-MM-DD')}><NavLink to={`/archives/${_dateStr}`}>{date.format('DD日')}</NavLink></li>;
          }
        }).reverse()
        monthLinks.push(
          <li key={`${year}-${month}`}>
            <a onClick={this._toggleMonthDir.bind(this, year, month)}>{month}月</a>
            <ul className="date-links clearfix" style={{display: dateLinkNodeOpenStatuses[year].nodes[month].open ? 'block' : 'none'}}>{dateLinks}</ul>
          </li>
        )
      }
      dateLinkNodes.push(
        <li key={`${year}`}>
          <a onClick={this._toggleYearDir.bind(this, year)}>{year}年</a>
          <ul className="month-links" style={{display: dateLinkNodeOpenStatuses[year].open ? 'block' : 'none'}}>{monthLinks}</ul>
        </li>
      )
    }

    return dateLinkNodes
  }
  /* eslint-enable jsx-a11y/anchor-is-valid, no-script-url */

  /* eslint-disable jsx-a11y/anchor-is-valid, no-script-url */
  makeDateLinkNodesNavbar(fromDate: Moment, toDate: Moment, dateLinkNodeOpenStatuses: any): JSX.Element[] {
    const dates = this._makeDates(fromDate, toDate) 
    const dateLinkNodes = []
    const years = Object.keys(dates).sort().reverse()
    for (const year of years) {
      const yDir = dates[year]
      const monthLinks = []
      const months = Object.keys(yDir).sort().reverse()
      for(const month of months) {
        const dateLinks = yDir[month].map((date: Moment) => {
          const _dateStr = date.format('YYYY-MM-DD')
          if (this._isDisabledDate(_dateStr)) {
            return <a key={`${_dateStr}`} className="dropdown-item"><del>{date.format('DD日')}</del></a>;
          } else {
            return <NavLink key={`${_dateStr}`} className="dropdown-item" to={`/archives/${_dateStr}`}>{date.format('DD日')}</NavLink>;
          }
        }).reverse()
        monthLinks.push(
          <React.Fragment key={`${year}-${month}`}>
            <a className="nav-link dropdown-toggle" href="#" role="button" onClick={this._toggleMonthDir.bind(this, year, month)}>
              {month}月
            </a>
            <div className="dropdown-menu sub-dropdown-menu" style={{display: dateLinkNodeOpenStatuses[year].nodes[month].open ? 'block' : 'none'}}>
              {dateLinks}
            </div>
          </React.Fragment>
        )
      }
      dateLinkNodes.push(
        <li key={`${year}`} className="nav-item dropdown archive-dropdown">
          <a className="nav-link dropdown-toggle" href="#" role="button" onClick={this._toggleYearDir.bind(this, year)}>
            {year}年
          </a>
          <div className="dropdown-menu sub-dropdown-menu" style={{display: dateLinkNodeOpenStatuses[year].open ? 'block' : 'none'}}>
            {monthLinks}
          </div>
        </li>
      )
    }

    return dateLinkNodes
  }
  /* eslint-enable jsx-a11y/anchor-is-valid, no-script-url */
  /* eslint-disable jsx-a11y/anchor-is-valid, no-script-url */
  render() {
    if (this.props.displayMode === 'navbar') {
      const dateLinkNodes = this.makeDateLinkNodesNavbar(moment(this.props.fromDate), moment(this.props.toDate), this.state.dateLinkNodeOpenStatuses)
      return (
        <React.Fragment>
          <li className="nav-item">
            <a href="#" className="nav-link disabled">アーカイブ</a>
          </li>
          {dateLinkNodes}
        </React.Fragment>
      )
    } else {
      const dateLinkNodes = this.makeDateLinkNodes(moment(this.props.fromDate), moment(this.props.toDate), this.state.dateLinkNodeOpenStatuses)
      return (
        <div className="calendar">
          <ul className="nav-links">
            <li>
              <NavLink to="/" exact>最新のチャット</NavLink>
            </li>
            <li>アーカイブ</li>
            {dateLinkNodes}
          </ul>
        </div>
      )
    }
  }
  /* eslint-enable jsx-a11y/anchor-is-valid, no-script-url */
}