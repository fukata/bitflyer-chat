import React from "react"
import "./Settings.css"
import { db } from './firebase'
import firebase from 'firebase/app'
const Device = require('react-device-detect')

interface Props {
  displayMode: string
}
interface State {
  autoScroll: boolean
  lowSpec: boolean
  needUpdate: boolean
}

export default class extends React.Component<Props, State> {
  private unsubscribe: any
  private latestDeployedAt: firebase.firestore.Timestamp

  static defaultProps = {
    displayMode: 'sidebar', // sidebar or navbar
  }
  constructor(props: Props) {
    super(props)
    this.latestDeployedAt = firebase.firestore.Timestamp.fromMillis(0)
    console.log(`Device.isMobile=${Device.isMobile}`)
    if (localStorage.getItem('settings.lowSpec') === null) {
      if (Device.isMobile) {
        localStorage.setItem('settings.lowSpec', '1')
      } else {
        localStorage.setItem('settings.lowSpec', '0')
      }
    }
    this.state = {
      autoScroll: localStorage.getItem('settings.autoScroll') === '1',
      lowSpec: localStorage.getItem('settings.lowSpec') === '1',
      needUpdate: false,
    }
  }

  componentDidMount() {
    this.unsubscribe = db.collection('deploy_logs').doc('latest').onSnapshot(doc => {
      const key = 'settings.latestDeployedAt' 
      const data: any = doc.data()
      this.latestDeployedAt = data.deployedAt
      const savedDeployedAt = localStorage.getItem(key)
      console.log(`deployed. latestDeployedAt=${this.latestDeployedAt}, savedDeployedAt=${savedDeployedAt}`)
      if (savedDeployedAt === null) {
        localStorage.setItem(key, this.latestDeployedAt.seconds.toString())
      } else {
        const savedDeployedAtNumber = Number(savedDeployedAt)
        if (this.latestDeployedAt.seconds > savedDeployedAtNumber) {
          this.setState({
            needUpdate: true,
          })
        }
      }
    })
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  _superReload() {
    const key = 'settings.latestDeployedAt' 
    localStorage.setItem(key, this.latestDeployedAt.seconds.toString())
    window.location.reload(true)
  }

  _changedAutoScroll() {
    const autoScroll = !this.state.autoScroll
    this.setState({
      autoScroll: autoScroll,
    })
    localStorage.setItem('settings.autoScroll', autoScroll ? '1' : '0')
  }

  _changedLowSpec() {
    const lowSpec = !this.state.lowSpec
    this.setState({
      lowSpec: lowSpec,
    })
    localStorage.setItem('settings.lowSpec', lowSpec ? '1' : '0')
  }

  /* eslint-disable jsx-a11y/anchor-is-valid, no-script-url */
  render() {
    if (this.props.displayMode === 'navbar') {
      return (
        <React.Fragment>
          <li className="nav-item">
            <a href="#" className="nav-link disabled">設定</a>
          </li>
          <li className="nav-item">
            <label style={{color: 'white'}}>
              <input type="checkbox" checked={this.state.autoScroll} onChange={this._changedAutoScroll.bind(this)} /> 新着時に自動スクロール
            </label>
          </li>
          <li className="nav-item">
            <label style={{color: 'white'}}>
              <input type="checkbox" checked={this.state.lowSpec} onChange={this._changedLowSpec.bind(this)} /> 低負荷モード(スマホ推奨) 
            </label>
          </li>
        </React.Fragment>
      )
    } else {
      const UpdateButton = this.state.needUpdate ? (
        <div className="update-container">
          <button className="btn btn-danger" onClick={this._superReload.bind(this)}>更新する！</button>
          <p className="attension">新しいアップデートがあります。更新して最新の状態にしてください。</p>
        </div>
        ) : null
      return (
        <div className="settings">
          <h4>設定</h4>
          <div>
            <label>
              <input type="checkbox" checked={this.state.autoScroll} onChange={this._changedAutoScroll.bind(this)} /> 新着時に自動スクロール
            </label>
          </div>
          <div>
            <label>
              <input type="checkbox" checked={this.state.lowSpec} onChange={this._changedLowSpec.bind(this)} /> 低負荷モード(スマホ推奨) 
            </label>
          </div>
          {UpdateButton}
        </div>
      )
    }
  }
  /* eslint-enable jsx-a11y/anchor-is-valid, no-script-url */
}