import React from 'react'
import './App.css'
import Chat from './Chat'
import Sidebar from './Sidebar'

const App: React.FC = () => {
  return (
    <div className="App container-fluid">
      <div className="row">
        <Sidebar />
        <Chat />
      </div>
    </div>
  );
}

export default App;
