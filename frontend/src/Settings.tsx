import React from "react"
import "./Settings.css"
import { db } from './firebase'
import { firestore } from "firebase"

interface State {
  autoScroll: boolean
  needUpdate: boolean
}

export default class extends React.Component<any, State> {
  private unsubscribe: any
  private latestDeployedAt: firestore.Timestamp
  private firstUpdateCheck: boolean

  constructor(props: any) {
    super(props)
    this.latestDeployedAt = firestore.Timestamp.fromMillis(0) 
    this.firstUpdateCheck = true
    this.state = {
      autoScroll: localStorage.getItem('settings.autoScroll') === '1',
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
          if (this.firstUpdateCheck) {
            //FIXME 初期表示時にロ＝ディング画面などを作ってそこで処理させたい。
            this._superReload()
          } else {
            this.setState({
              needUpdate: true,
            })
          }
        }
      }

      this.firstUpdateCheck = false
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

  render() {
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
        {UpdateButton}
      </div>
    )
  }
}