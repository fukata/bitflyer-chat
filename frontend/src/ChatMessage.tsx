import React from "react";
import firebase from 'firebase'
import Linkify from 'linkifyjs/react'
import moment from 'moment'
import 'moment-timezone'

interface Props {
  message: firebase.firestore.QueryDocumentSnapshot
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
      classes: ['message-message']
    }
  }

  componentDidMount() {
    if (this.props.enabledTransition) {
      setImmediate(() => {
        this.setState({ classes: ['message-message', 'transition'] })
      })
    } else {
      this.setState({ classes: ['message-message', 'no-transition'] })
    }
  }
  render() {
    const message = this.props.message
    const data = message.data()
    const dateStr = moment(data.date.toDate()).tz(this.props.tz).format("MM/DD HH:mm") 
    return (
      <tr className="message">
        <td className={this.state.classes.join(' ')}>
          <div className="message-header">
            <span className="date">[{dateStr}] </span>
            <span className="nickname">{data.nickname}</span>
          </div>
          <div className="message-inner">
            <Linkify options={{target: '_blank'}}>{data.message}</Linkify>
          </div>
        </td>
      </tr>
    )
  }
}