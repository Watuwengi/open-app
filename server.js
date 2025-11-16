const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Dashboard
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// Phone page
app.get('/phone', (req, res) => {
  const token = req.query.token || crypto.randomBytes(16).toString('hex');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Connecting...</title></head>
    <body>
      <h2>Connecting to Laptop...</h2>
      <video id="local" autoplay muted style="width:100%"></video>
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        navigator.mediaDevices.getDisplayMedia({video: true, audio: true})
          .then(stream => {
            document.getElementById('local').srcObject = stream;
            const pc = new RTCPeerConnection();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));
            pc.createOffer().then(offer => {
              pc.setLocalDescription(offer);
              socket.emit('offer', offer);
            });
            socket.on('answer', a => pc.setRemoteDescription(a));
            pc.onicecandidate = e => e.candidate && socket.emit('ice', e.candidate);
          })
          .catch(err => console.log('Permission denied'));
      </script>
    </body>
    </html>
  `);
});

// Send magic link (placeholder — no Gmail crash)
app.get('/link', (req, res) => {
  const { email } = req.query;
  if (!email) return res.send('Enter email');
  const token = crypto.randomBytes(16).toString('hex');
  const url = `${req.protocol}://${req.get('host')}/phone?token=${token}`;
  res.send(`Link generated: <a href="${url}">${url}</a><br>Copy this to your phone.`);
});

// WebRTC
io.on('connection', (socket) => {
  socket.on('offer', data => socket.broadcast.emit('offer', data));
  socket.on('answer', data => socket.broadcast.emit('answer', data));
  socket.on('ice', data => socket.broadcast.emit('ice', data));
});

// RENDER PORT (DYNAMIC)
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`MyLink running on port ${port}`);
});
