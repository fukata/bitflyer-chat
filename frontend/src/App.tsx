import React from 'react'
import { Route, Switch, BrowserRouterProps } from 'react-router-dom'
import './App.css'
import Chat from './Chat'
import Archive from './Archive'
import Sidebar from './Sidebar'

export default class extends React.Component<BrowserRouterProps> {
  render() {
    return (
      <div className="App container-fluid">
        <div className="row">
          <Sidebar />
          <Switch>
            <Route path="/" exact component={Chat} />
            <Route path="/archives/:date" component={Archive} />
          </Switch>
        </div>
      </div>
    )
  }
}