// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import JoinPage from './JoinPage';
import VideoCall from './VideoCall';
import './App.css';

function App() {
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<JoinPage setUsername={setUsername} />} />
        <Route path="/call" element={username ? <VideoCall username={username} /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
