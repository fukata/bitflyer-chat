import React from 'react'
import Calendar from './Calendar'
import Settings from './Settings'
import { Metadata } from './types'
import { NavLink } from 'react-router-dom'

interface Props {
  title: string 
  displayHourLinks: boolean
  archiveDate: string 
  archiveMetadata: Metadata | null
}

export default class extends React.Component<Props> {
  static defaultProps = {
    string: '', 
    displayHourLinks: false,
    archiveDate: '', 
    archiveMetadata: null, 
  }

  getMessageNum(from: number, to: number) {
    if (this.props.archiveMetadata === null) {
      return '-'
    }
    if (this.props.archiveMetadata.error) {
      return '-'
    }

    let messageNum = 0
    for (let i=from; i<to; i++) {
      const hour = i.toString().padStart(2, '0')
      if (this.props.archiveMetadata.hours[`h${hour}`]) {
        messageNum += this.props.archiveMetadata.hours[`h${hour}`].message_num  
      }
    }
    return messageNum
  }

  /* eslint-disable jsx-a11y/anchor-is-valid, no-script-url */
  render() {
    let HourLinks = null
    if (this.props.displayHourLinks) {
      const hourLinks = [
        <NavLink key={`hour-all`} className="dropdown-item" to={`/archives/${this.props.archiveDate}`} exact>全時間帯 ({this.getMessageNum(0, 24)})</NavLink>
      ]
      const perHour = 3
      for (let i=0; i<24; i+=perHour) {
        const from = i
        const to = i + perHour
        const messageNum = this.getMessageNum(from, to)
        const hourFrom = from.toString().padStart(2, '0')
        const hourTo = to.toString().padStart(2, '0')
        hourLinks.push(
          <NavLink key={`hour-${hourFrom}-${hourTo}`} className="dropdown-item" to={`/archives/${this.props.archiveDate}/${hourFrom}-${hourTo}`}>{hourFrom}-{hourTo}時 ({messageNum})</NavLink>
        )
      }

      HourLinks = (
        <li className="nav-item dropdown">
          <a className="nav-link dropdown-toggle" href="#" id="hourLinksDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            時間帯を指定 
          </a>
          <div className="dropdown-menu" aria-labelledby="hourLinksDropdown">
            {hourLinks}
          </div>
        </li>
      )
    }
    const MobileNav = (
      <ul className="navbar-nav mr-auto d-block d-md-block d-lg-none">
        <li className="nav-item">
          <a href="/" className="nav-link">
            最新のチャット
          </a>
        </li>
        <Calendar displayMode="navbar" />
        <Settings displayMode="navbar" />
      </ul>
    )

    return (
      <nav className="screen-navbar navbar navbar-expand-lg sticky-top navbar-dark">
        <a className="navbar-brand" href="#">{this.props.title}</a>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#screenMenu" aria-controls="screenMenu" aria-expanded="false" aria-label="Toggle navigation">
		      <span className="navbar-toggler-icon"></span>
		    </button>
        <div className="collapse navbar-collapse" id="screenMenu">
          <ul className="navbar-nav mr-auto">
            {HourLinks}
          </ul>
          {MobileNav}
        </div>
      </nav>
    )
  }
  /* eslint-enable jsx-a11y/anchor-is-valid, no-script-url */
}