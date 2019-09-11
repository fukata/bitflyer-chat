import React from "react";
import firebase from 'firebase'
import Linkify from 'linkifyjs/react'
import moment from 'moment'
import 'moment-timezone'

interface Props {
  message: firebase.firestore.QueryDocumentSnapshot;
}

interface State {

}

export default class extends React.Component<Props, State> {
  render() {
    const message = this.props.message
    const data = message.data()
    const dateStr = moment(data.date.toDate()).tz('Asia/Tokyo').format("HH:mm") 
    return (
      <tr className="message">
        <td className="message-date">
          {dateStr}
        </td>
        <td className="message-nickname">
          {data.nickname}
        </td>
        <td className="message-message">
          <Linkify options={{target: '_blank'}}>{data.message}</Linkify>
        </td>
      </tr>
    )
  }
}