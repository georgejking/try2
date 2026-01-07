// frontend/src/Chat.js
import React, { useState, useRef, useEffect } from 'react';

function Chat({ socket, users }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [dmTarget, setDmTarget] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() && socket) {
      socket.emit('send-message', { message: input, targetId: dmTarget });
      setInput('');
      setDmTarget(null);
    }
  };

  return (
    <div style={{ marginTop: '20px', width: '400px' }}>
      <h3>Chat</h3>
      <div style={{ height: '200px', border: '1px solid #ccc', overflowY: 'scroll', padding: '10px' }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.username}{msg.isDM ? ' (DM)' : ''}:</strong> {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div>
        {dmTarget && (
          <span>DM to {users.find(u => u.id === dmTarget)?.username} | </span>
        )}
        <select onChange={(e) => setDmTarget(e.target.value || null)} value={dmTarget || ''}>
          <option value="">Group Chat</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.username}</option>
          ))}
        </select>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{ width: '200px', marginLeft: '10px' }}
        />
        <button onClick={sendMessage} style={{ marginLeft: '10px' }}>Send</button>
      </div>
    </div>
  );
}

export default Chat;
