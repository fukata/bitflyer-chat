import React from 'react'
import { Route, Switch, BrowserRouterProps } from 'react-router-dom'
import './App.css'
import Chat from './Chat'
import Archive from './Archive'
import Sidebar from './Sidebar'
import withProps from 'recompose/withProps'
import ReactGA from 'react-ga'; 
import ReactLoading from 'react-loading'
import { db } from './firebase'

interface State {
  loaded: boolean
  loadError: boolean 
}
export default class extends React.Component<BrowserRouterProps, State> {
  constructor(props: BrowserRouterProps) {
    super(props)
    this.state = {
      loaded: false,
      loadError: false,
    }
  }

  componentDidMount() {
    const { pathname } = window.location;
    ReactGA.set({ page: pathname });
    ReactGA.pageview(pathname);

    const key = 'settings.latestDeployedAt' 
    const savedDeployedAt = localStorage.getItem(key)
    if (savedDeployedAt === null) {
      this.setState({
        loaded: true
      })
    } else {
      console.log(`savedDeployedAt=${savedDeployedAt}`)
      db.collection('deploy_logs').doc('latest').get().then(doc => {
        const data: any = doc.data()
        const latestDeployedAt: firebase.firestore.Timestamp = data.deployedAt
        const savedDeployedAtNumber = Number(savedDeployedAt)
        if (latestDeployedAt.seconds > savedDeployedAtNumber) {
          console.log(`Old app version so reload.`)
          localStorage.setItem(key, latestDeployedAt.seconds.toString())
          window.location.reload(true)
        } else {
          console.log(`Already latest app version.`)
          this.setState({
            loaded: true
          })
        }
      }).catch(_ => {
        this.setState({
          loaded: false,
          loadError: true,
        })
      })
    }
  }

  render() {
    if (this.state.loadError) {
      return (
        <div className="App">
          <header className="App-header">
            <div className="attension">
              <p>エラーが発生しました。</p>
              <p>F5を押してリロードを行ってください。</p>
            </div>
          </header>
        </div>
      )
    } else if (this.state.loaded) {
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
            <div className="main col-lg-10">
              <Switch>
                <Route path="/" exact component={Chat} />
                <Route path="/archives/:date/hour/:hour" component={ArchiveWithProps} />
                <Route path="/archives/:date" component={ArchiveWithProps} />
              </Switch>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div className="App">
          <header className="App-header">
            <ReactLoading type={"bars"} color={"white"} />
          </header>
        </div>
      )
    }
  }
}