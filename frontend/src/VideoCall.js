// frontend/src/VideoCall.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Chat from './Chat';
import AdminPanel from './AdminPanel';

const SOCKET_SERVER = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

function VideoCall({ username }) {
  const [socket, setSocket] = useState(null);
  const [streams, setStreams] = useState({}); // { socketId: MediaStream }
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const localVideoRef = useRef();
  const peerConnections = useRef({});

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER);
    setSocket(newSocket);

    // Get local stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        newSocket.emit('join-room', { username });

        // Handle camera off detection
        const videoTrack = stream.getVideoTracks()[0];
        const checkCamera = () => {
          if (!videoTrack.enabled) {
            newSocket.emit('camera-status', false);
          } else {
            newSocket.emit('camera-status', true);
          }
        };
        setInterval(checkCamera, 1000);

        // Handle remote streams
        newSocket.on('user-joined', async ({ id }) => {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          peerConnections.current[id] = pc;

          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              newSocket.emit('ice-candidate', { to: id, candidate: event.candidate });
            }
          };

          pc.ontrack = (event) => {
            setStreams(prev => ({ ...prev, [id]: event.streams[0] }));
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          newSocket.emit('offer', { to: id, offer });
        });

        newSocket.on('offer', async ({ from, offer }) => {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          peerConnections.current[from] = pc;

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              newSocket.emit('ice-candidate', { to: from, candidate: event.candidate });
            }
          };

          pc.ontrack = (event) => {
            setStreams(prev => ({ ...prev, [from]: event.streams[0] }));
          };

          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit('answer', { to: from, answer });
        });

        newSocket.on('answer', async ({ from, answer }) => {
          const pc = peerConnections.current[from];
          if (pc) await pc.setRemoteDescription(answer);
        });

        newSocket.on('ice-candidate', ({ from, candidate }) => {
          const pc = peerConnections.current[from];
          if (pc) pc.addIceCandidate(candidate);
        });

        newSocket.on('user-list', (list) => {
          setUsers(list);
          const me = list.find(u => u.username === username);
          if (me) setIsAdmin(me.isAdmin);
        });

        newSocket.on('admin-update', ({ id, isAdmin }) => {
          setUsers(prev => prev.map(u => u.id === id ? { ...u, isAdmin } : u));
          if (id === newSocket.id) setIsAdmin(isAdmin);
        });

        newSocket.on('user-left', (id) => {
          setStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[id];
            return newStreams;
          });
          setUsers(prev => prev.filter(u => u.id !== id));
          if (peerConnections.current[id]) {
            peerConnections.current[id].close();
            delete peerConnections.current[id];
          }
        });

        newSocket.on('mute-request', () => {
          const localStream = localVideoRef.current?.srcObject;
          if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = false);
          }
        });

        newSocket.on('redirect-home', () => {
          window.location.href = '/';
        });

        newSocket.on('error', (msg) => alert(msg));
      })
      .catch(err => {
        alert('Camera required to join!');
        window.location.href = '/';
      });

    return () => {
      newSocket.close();
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [username]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Webinar Room</h2>
      <div style={{ display: 'flex' }}>
        {/* Local Video */}
        <div style={{ margin: '10px' }}>
          <video ref={localVideoRef} autoPlay muted style={{ width: '200px', height: '150px' }} />
          <p>You</p>
        </div>

        {/* Remote Videos */}
        {Object.entries(streams).map(([id, stream]) => {
          const user = users.find(u => u.id === id);
          return (
            <div key={id} style={{ margin: '10px' }}>
              <video
                srcObject={stream}
                autoPlay
                style={{ width: '200px', height: '150px' }}
              />
              <p>{user?.username || 'User'} {user?.isAdmin && '👑'}</p>
            </div>
          );
        })}
      </div>

      <Chat socket={socket} users={users} />

      {isAdmin && <AdminPanel socket={socket} users={users} />}
    </div>
  );
}

export default VideoCall;
