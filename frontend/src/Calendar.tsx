import React from "react"
import { NavLink } from 'react-router-dom'
import "./Calendar.css"
import moment, { Moment } from 'moment'

interface Props {
  fromDate: string
  toDate: string
}

interface State {
  dateLinkNodeOpenStatuses: any 
  dateLinkNodes: JSX.Element[] 
}

export default class extends React.Component<Props, State> {
  static defaultProps = {
    fromDate: '2019-09-09',
    toDate: moment().format('YYYY-MM-DD'),
  }

  constructor(props: Props) {
    super(props)
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

  makeDateLinkNodeStatuses(fromDate: Moment, toDate: Moment): {} {
    let currentDate = fromDate.clone()
    const dates: any = {} 
    while (currentDate < toDate) {
      const yDir = dates[currentDate.format('YYYY')] = dates[currentDate.format('YYYY')] || {}
      const mDir = yDir[currentDate.format('MM')] = yDir[currentDate.format('MM')] || []
      mDir.push(currentDate.clone())
      currentDate = currentDate.add(1, 'days')
    }
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
    let currentDate = fromDate.clone()
    const dates: any = {} 
    while (currentDate < toDate) {
      const yDir = dates[currentDate.format('YYYY')] = dates[currentDate.format('YYYY')] || {}
      const mDir = yDir[currentDate.format('MM')] = yDir[currentDate.format('MM')] || []
      mDir.push(currentDate.clone())
      currentDate = currentDate.add(1, 'days')
    }
    const dateLinkNodes = []
    for (const year in dates) {
      const yDir = dates[year]
      const monthLinks = [] 
      for(const month in yDir) {
        const dateLinks = yDir[month].map((date: Moment) => <li><NavLink to={`/archives/${date.format('YYYY-MM-DD')}`}>{date.format('YYYY-MM-DD')}</NavLink></li>) 
        monthLinks.push(
          <li>
            <a href="javascript:void(0)" onClick={this._toggleMonthDir.bind(this, year, month)}>{month}</a>
            <ul className="date-links" style={{display: dateLinkNodeOpenStatuses[year].nodes[month].open ? 'block' : 'none'}}>{dateLinks}</ul>
          </li>
        )
      }
      dateLinkNodes.push(
        <li>
          <a href="javascript:void(0)" onClick={this._toggleYearDir.bind(this, year)}>{year}</a>
          <ul className="month-links" style={{display: dateLinkNodeOpenStatuses[year].open ? 'block' : 'none'}}>{monthLinks}</ul>
        </li>
      )
    }

    return dateLinkNodes
  }
  /* eslint-enable jsx-a11y/anchor-is-valid, no-script-url */

  render() {
    const dateLinkNodes = this.makeDateLinkNodes(moment(this.props.fromDate), moment(this.props.toDate), this.state.dateLinkNodeOpenStatuses)
    return (
      <div className="calendar">
        <ul className="nav-links">
          <li>
            <NavLink to="/" exact>最新</NavLink>
          </li>
          <li>日付を指定</li>
          {dateLinkNodes}
        </ul>
      </div>
    )
  }
}