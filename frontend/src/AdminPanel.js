// frontend/src/AdminPanel.js
import React, { useState } from 'react';

function AdminPanel({ socket, users }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [ipToBlock, setIpToBlock] = useState('');

  const handleMakeAdmin = () => {
    if (selectedUser) {
      socket.emit('make-admin', { targetId: selectedUser });
    }
  };

  const handleMute = () => {
    if (selectedUser) {
      socket.emit('mute-user', { targetId: selectedUser });
    }
  };

  const handleRemove = () => {
    if (selectedUser) {
      socket.emit('remove-user', { targetId: selectedUser });
    }
  };

  const handleBlockIP = () => {
    if (ipToBlock) {
      socket.emit('block-ip', { ip: ipToBlock });
      setIpToBlock('');
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '10px', border: '1px solid red' }}>
      <h3>Admin Panel</h3>
      <div>
        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          <option value="">Select User</option>
          {users.filter(u => !u.isAdmin).map(user => (
            <option key={user.id} value={user.id}>{user.username}</option>
          ))}
        </select>
        <button onClick={handleMakeAdmin} style={{ marginLeft: '10px' }}>Make Admin</button>
        <button onClick={handleMute} style={{ marginLeft: '10px' }}>Mute</button>
        <button onClick={handleRemove} style={{ marginLeft: '10px' }}>Remove</button>
      </div>
      <div style={{ marginTop: '10px' }}>
        <input
          value={ipToBlock}
          onChange={(e) => setIpToBlock(e.target.value)}
          placeholder="IP to block"
          style={{ marginRight: '10px' }}
        />
        <button onClick={handleBlockIP}>Block IP</button>
      </div>
    </div>
  );
}

export default AdminPanel;
