// backend/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory storage (use Redis/DB in production)
let users = {}; // { socketId: { username, isAdmin, ip } }
let blockedIPs = new Set();
const ROOM = 'main-webinar';

io.on('connection', (socket) => {
  const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

  // Check if IP is blocked
  if (blockedIPs.has(clientIP)) {
    socket.disconnect(true);
    return;
  }

  socket.on('join-room', ({ username }) => {
    if (!username.trim()) {
      socket.emit('error', 'Username required');
      return;
    }

    // Store user
    users[socket.id] = {
      username,
      isAdmin: false,
      ip: clientIP,
      cameraOn: true
    };

    socket.join(ROOM);
    socket.to(ROOM).emit('user-joined', { id: socket.id, username });

    // Send current user list to new user
    const userList = Object.entries(users).map(([id, u]) => ({
      id,
      username: u.username,
      isAdmin: u.isAdmin
    }));
    socket.emit('user-list', userList);

    // Notify others about new admin status if any
    io.to(ROOM).emit('admin-update', { id: socket.id, isAdmin: false });
  });

  socket.on('camera-status', (status) => {
    if (users[socket.id]) {
      users[socket.id].cameraOn = status;
      if (!status) {
        // Remove user if camera off
        delete users[socket.id];
        socket.leave(ROOM);
        socket.to(ROOM).emit('user-left', socket.id);
        socket.emit('redirect-home');
      }
    }
  });

  // Chat
  socket.on('send-message', ({ message, targetId }) => {
    const sender = users[socket.id];
    if (!sender) return;

    if (targetId) {
      // DM
      if (users[targetId]) {
        io.to(targetId).emit('receive-message', {
          from: socket.id,
          username: sender.username,
          message,
          isDM: true
        });
        socket.emit('receive-message', {
          from: socket.id,
          username: sender.username,
          message,
          isDM: true,
          to: targetId
        });
      }
    } else {
      // Group chat
      io.to(ROOM).emit('receive-message', {
        from: socket.id,
        username: sender.username,
        message,
        isDM: false
      });
    }
  });

  // Admin actions
  socket.on('make-admin', ({ targetId }) => {
    if (!users[socket.id]?.isAdmin) return;
    if (users[targetId]) {
      users[targetId].isAdmin = true;
      io.to(ROOM).emit('admin-update', { id: targetId, isAdmin: true });
    }
  });

  socket.on('mute-user', ({ targetId }) => {
    if (!users[socket.id]?.isAdmin) return;
    if (users[targetId]) {
      io.to(targetId).emit('mute-request');
    }
  });

  socket.on('remove-user', ({ targetId }) => {
    if (!users[socket.id]?.isAdmin) return;
    if (users[targetId]) {
      delete users[targetId];
      io.to(targetId).emit('redirect-home');
      socket.to(ROOM).emit('user-left', targetId);
    }
  });

  socket.on('block-ip', ({ ip }) => {
    if (!users[socket.id]?.isAdmin) return;
    blockedIPs.add(ip);
    // Disconnect all sockets from this IP
    Object.entries(users).forEach(([id, user]) => {
      if (user.ip === ip) {
        delete users[id];
        io.to(id).emit('redirect-home');
        io.sockets.sockets.get(id)?.disconnect(true);
      }
    });
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      delete users[socket.id];
      socket.to(ROOM).emit('user-left', socket.id);
    }
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
