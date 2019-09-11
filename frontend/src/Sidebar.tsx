import React from "react"
import './Sidebar.css'
import Calendar from './Calendar'
import Settings from './Settings'

export default class extends React.Component {
  render() {
    return (
      <div className="sidebar col-md-2">
        <div className="sidebar-inner">
          <Calendar />
          <Settings />

          <p>※ 実装中</p>
        </div>
      </div>
    )
  }
}