const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// === CHANGE THESE ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'YOUR_GMAIL@gmail.com',      // ← YOUR EMAIL
    pass: 'your-16-digit-app-password' // ← GET FROM GOOGLE
  }
});
// ===================

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/phone', (req, res) => {
  const token = req.query.token || crypto.randomBytes(16).toString('hex');
  res.send(`
    <h2>Connecting...</h2>
    <video id="local" autoplay muted style="width:100%"></video>
    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      navigator.mediaDevices.getDisplayMedia({video:true, audio:true})
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
        });
    </script>
  `);
});

app.get('/link', (req, res) => {
  const { email } = req.query;
  if (!email) return res.send('Enter email');
  const token = crypto.randomBytes(16).toString('hex');
  const url = `${req.protocol}://${req.get('host')}/phone?token=${token}`;
  transporter.sendMail({
    to: email,
    subject: 'MyLink: Open Your Phone',
    html: `<h3>Click to connect:</h3><a href="${url}">${url}</a>`
  }).then(() => res.send('Email sent! Check inbox.'));
});

io.on('connection', (socket) => {
  socket.on('offer', data => socket.broadcast.emit('offer', data));
  socket.on('answer', data => socket.broadcast.emit('answer', data));
  socket.on('ice', data => socket.broadcast.emit('ice', data));
});

server.listen(process.env.PORT || 3000);
