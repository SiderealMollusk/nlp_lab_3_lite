import { useState } from 'react'
import './App.css'
import WorkControls from './components/WorkControls'

function App() {
  return (
    <div className="container">
      <h1>NLP Lab 3 Lite</h1>
      <p>Work Orchestration Interface</p>

      <WorkControls />
    </div>
  )
}

export default App


