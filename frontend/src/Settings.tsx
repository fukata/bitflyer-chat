import React from "react"
import "./Settings.css"

interface State {
  autoScroll: boolean
}

export default class extends React.Component<any, State> {
  constructor(props: any) {
    super(props)
    this.state = {
      autoScroll: false,
    }
  }

  _changedAutoScroll() {
    this.setState({
      autoScroll: !this.state.autoScroll,
    })
  }

  render() {
    return (
      <div className="settings">
        <h4>Settings</h4>
        <div>
          <label>
            <input type="checkbox" checked={this.state.autoScroll} onChange={this._changedAutoScroll.bind(this)} /> 新着時に自動スクロール
          </label>
        </div>
      </div>
    )
  }
}