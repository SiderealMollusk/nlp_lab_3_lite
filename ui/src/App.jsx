import { useState } from 'react'
import './App.css'
import WorkControls from './components/WorkControls'
import JobsList from './components/JobsList'

function App() {
  return (
    <div className="container">
      <h1>NLP Lab 3 Lite</h1>
      <p>Work Orchestration Interface</p>

      <WorkControls />
      <JobsList />
    </div>
  )
}

export default App
