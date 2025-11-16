const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Serve dashboard
app.use(express.static('public'));

// === GMAIL SETUP — CHANGE THESE ===
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'emmanuelwamb107@gmail.com',           // ← YOUR EMAIL
    pass: 'abcd efgh ijkl mnop'                   // ← YOUR 16-DIGIT APP PASSWORD
  }
});
// ===================================

// Dashboard
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// Phone connection page
app.get('/phone', (req, res) => {
  const token = req.query.token || crypto.randomBytes(16).toString('hex');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Connecting...</title></head>
    <body>
      <h2>Connecting to Laptop...</h2>
      <video id="local" autoplay muted style="width:100%;max-width:600px;border:2px solid #333;"></video>
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        navigator.mediaDevices.getDisplayMedia({video: true, audio: true})
          .then(stream => {
            document.getElementById('local').srcObject = stream;
            const pc = new RTCPeerConnection();
            stream.getTracks().forEach(t => pc.addTrack(t, stream));
            pc.createOffer()
              .then(offer => {
                pc.setLocalDescription(offer);
                socket.emit('offer', offer);
              });
            socket.on('answer', answer => pc.setRemoteDescription(answer));
            pc.onicecandidate = e => e.candidate && socket.emit('ice', e.candidate);
          })
          .catch(err => {
            alert('Please allow screen sharing!');
            console.error(err);
          });
      </script>
    </body>
    </html>
  `);
});

// Send magic link via email
app.get('/link', async (req, res) => {
  const { email } = req.query;
  if (!email || !email.includes('@')) {
    return res.status(400).send('Invalid email');
  }

  const token = crypto.randomBytes(16).toString('hex');
  const url = `${req.protocol}://${req.get('host')}/phone?token=${token}`;

  try {
    await transporter.sendMail({
      to: email,
      subject: 'MyLink: Connect Your Phone',
      html: `
        <h3>Click below to connect your phone:</h3>
        <p><a href="${url}" style="padding:15px;background:#007bff;color:white;text-decoration:none;border-radius:8px;">Connect Now</a></p>
        <p>Or open: <a href="${url}">${url}</a></p>
      `
    });
    res.send('Email sent! Check your inbox (and spam).');
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).send('Failed to send email. Check Gmail app password.');
  }
});

// WebRTC signaling
io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  socket.on('offer', (data) => socket.broadcast.emit('offer', data));
  socket.on('answer', (data) => socket.broadcast.emit('answer', data));
  socket.on('ice', (data) => socket.broadcast.emit('ice', data));

  socket.on('disconnect', () => console.log('Device disconnected:', socket.id));
});

// === RENDER PORT FIX (MUST USE THIS) ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`MyLink ZeroApp running on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});
