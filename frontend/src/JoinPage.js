// frontend/src/JoinPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function JoinPage({ setUsername }) {
  const [inputUsername, setInputUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputUsername.trim()) {
      localStorage.setItem('username', inputUsername);
      setUsername(inputUsername);
      navigate('/call');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <form onSubmit={handleSubmit}>
        <h2>Join Webinar</h2>
        <input
          type="text"
          placeholder="Enter your name"
          value={inputUsername}
          onChange={(e) => setInputUsername(e.target.value)}
          required
          style={{ padding: '10px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '10px' }}>Join</button>
      </form>
    </div>
  );
}

export default JoinPage;
