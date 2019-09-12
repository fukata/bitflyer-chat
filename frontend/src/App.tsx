import React from 'react'
import { Route, Switch, BrowserRouterProps } from 'react-router-dom'
import './App.css'
import Chat from './Chat'
import Archive from './Archive'
import Sidebar from './Sidebar'
import withProps from 'recompose/withProps'
import ReactGA from 'react-ga'; 

export default class extends React.Component<BrowserRouterProps> {
  componentDidMount() {
    const { pathname } = window.location;
    ReactGA.set({ page: pathname });
    ReactGA.pageview(pathname);
  }

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
          <div className="main col-md-10">
            <Switch>
              <Route path="/" exact component={Chat} />
              <Route path="/archives/:date" component={ArchiveWithProps} />
            </Switch>
          </div>
        </div>
      </div>
    )
  }
}