import React from "react"
import "./Settings.css"

interface State {
  autoScroll: boolean
}

export default class extends React.Component<any, State> {
  constructor(props: any) {
    super(props)
    this.state = {
      autoScroll: localStorage.getItem('settings.autoScroll') === '1',
    }
  }

  _changedAutoScroll() {
    const autoScroll = !this.state.autoScroll
    this.setState({
      autoScroll: autoScroll,
    })
    localStorage.setItem('settings.autoScroll', autoScroll ? '1' : '0')
  }

  render() {
    return (
      <div className="settings">
        <h4>設定</h4>
        <div>
          <label>
            <input type="checkbox" checked={this.state.autoScroll} onChange={this._changedAutoScroll.bind(this)} /> 新着時に自動スクロール
          </label>
        </div>
      </div>
    )
  }
}