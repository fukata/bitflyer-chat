import React from "react";
import firebase from 'firebase/app'
import Linkify from 'linkifyjs/react'
import moment from 'moment'
import 'moment-timezone'
import { ChatMessageData } from "./types";

interface Props {
  message: firebase.firestore.QueryDocumentSnapshot | ChatMessageData
  tz: string
  enabledTransition: boolean 
}

interface State {
  classes: string[]
}

export default class extends React.Component<Props, State> {
  static defaultProps = {
    tz: moment.tz.guess(),
    enabledTransition: false
  }

  constructor(props: Props) {
    super(props)
    this.state = {
      classes: ['message']
    }
  }

  componentDidMount() {
    if (this.props.enabledTransition) {
      setImmediate(() => {
        this.setState({ classes: ['message', 'transition'] })
      })
    } else {
      this.setState({ classes: ['message', 'no-transition'] })
    }
  }
  render() {
    const message = this.props.message
    let data = null
    if (message instanceof firebase.firestore.QueryDocumentSnapshot) {
      data = message.data()
    } else {
      data = message
    }
    const dateStr = moment(data.date.toDate()).tz(this.props.tz).format("MM/DD HH:mm") 
    return (
      <div className={this.state.classes.join(' ')}>
        <div className="message-header">
          <span className="date">[{dateStr}]</span>
          &nbsp;
          <span className="nickname">{data.nickname}</span>
        </div>
        <div className="message-inner">
          <Linkify options={{target: '_blank'}}>{data.message}</Linkify>
        </div>
      </div>
    )
  }
}