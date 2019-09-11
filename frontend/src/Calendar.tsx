import React from "react"
import { NavLink } from 'react-router-dom'
import "./Calendar.css"

export default class extends React.Component {
  _changedDate(date: string) {
    console.log(`_changedDate. date=${date}`)
  }
  render() {
    return (
      <div className="calendar">
        <h4>Calendar</h4>

        <ul>
          <li>
            <NavLink to="/" exact>最新</NavLink>
          </li>
          <li>
            <NavLink to="/archives/2019-09-11">2019-09-11</NavLink>
          </li>
          <li>
            <NavLink to="/archives/2019-09-10">2019-09-10</NavLink>
          </li>
        </ul>
      </div>
    )
  }
}