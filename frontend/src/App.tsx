import React from 'react'
import { Route, Switch } from 'react-router-dom'
import './App.css'
import Chat from './Chat'
import Archive from './Archive'
import Sidebar from './Sidebar'
import withProps from 'recompose/withProps'

export default class extends React.Component {
  render() {
    const ArchiveWithProps = withProps(
      (props: any) => ({
        ...props,
        tz: 'Asia/Tokyo'
      }),
    )(Archive)
    return (
      <div className="App container-fluid">
        <div className="row">
          <Sidebar />
          <Switch>
            <Route path="/" exact component={Chat} />
            <Route path="/archives/:date" component={ArchiveWithProps} />
          </Switch>
        </div>
      </div>
    )
  }
}