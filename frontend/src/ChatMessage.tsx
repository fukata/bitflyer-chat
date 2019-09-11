import React from "react";
import firebase from 'firebase'
import Linkify from 'linkifyjs/react'

interface Props {
  message: firebase.firestore.QueryDocumentSnapshot;
}

interface State {

}

export default class extends React.Component<Props, State> {
  render() {
    const message = this.props.message
    const data = message.data()
    const date = data.date.toDate()
    const dateStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
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