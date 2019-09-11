import React from "react";
import firebase from 'firebase'
import Linkify from 'linkifyjs/react'
import moment from 'moment'
import 'moment-timezone'

interface Props {
  message: firebase.firestore.QueryDocumentSnapshot
  tz: string
}

interface State {

}

export default class extends React.Component<Props, State> {
  static defaultProps = {
    tz: moment.tz.guess()
  }
  render() {
    const message = this.props.message
    const data = message.data()
    const dateStr = moment(data.date.toDate()).tz(this.props.tz).format("MM/DD HH:mm") 
    return (
      <tr className="message">
        <td className="message-message">
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