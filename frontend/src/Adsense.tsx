import React from "react"

//TODO adsenseの表示はモジュールを使いたい。
declare global {
  interface Window { adsbygoogle: any; }
}

export default class extends React.Component {
  componentDidMount() {
    const adsbygoogle = window.adsbygoogle || []
    adsbygoogle.push({})
  }
  render() {
    return (
      <ins 
        className="adsbygoogle"
        style={{display: 'inline-block', width: '250px', height: '250px'}}
        data-ad-client="ca-pub-9703571485671477"
        data-ad-slot="6225694511">
      </ins>
    )
  }
}