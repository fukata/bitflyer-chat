import React from "react"
import './Sidebar.css'
import Calendar from './Calendar'
import Settings from './Settings'

export default class extends React.Component {
  render() {
    return (
      <div className="sidebar col-lg-2 d-none d-lg-block">
        <div className="sidebar-inner">
          <Calendar />
          <Settings />
        </div>
      </div>
    )
  }
}
