const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Serve static files (dashboard, phone page)
app.use(express.static('public'));

// === GMAIL SETUP — UPDATE YOUR APP PASSWORD ===
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'emmanuelwamb107@gmail.com',           // ← YOUR EMAIL
    pass: 'abcd efgh ijkl mnop'                   // ← YOUR 16-DIGIT APP PASSWORD
  }
});
// ===========================================

// Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Phone auto-connect page
app.get('/phone', (req, res) => {
  const token = req.query.token || crypto.randomBytes(16).toString('hex');
  const auto = req.query.auto === '1' ? '1' : '0';
  res.sendFile(path.join(__dirname, 'public', 'phone.html'));
});

// AUTO-CONNECT: Email → Phone opens + shares screen
app.get('/link', async (req, res) => {
  const { email } = req.query;
  if (!email || !email.includes('@')) {
    return res.status(400).send('<p style="color:red;">Invalid email</p>');
  }

  const token = crypto.randomBytes(16).toString('hex');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const webUrl = `${baseUrl}/phone?token=${token}&auto=1`;
  
  // Deep link to auto-open Chrome on Android
  const deepLink = `intent://${req.get('host')}/phone?token=${token}&auto=1#Intent;scheme=https;package=com.android.chrome;end`;

  try {
    await transporter.sendMail({
      to: email,
      subject: 'MyLink: Auto-Connect Your Phone',
      html: `
        <div style="font-family:Arial,sans-serif;text-align:center;padding:20px;">
          <h2>🔗 Auto-Connect Your Phone</h2>
          <p>Tap below to <b>automatically open Chrome and share screen</b>:</p>
          <a href="${deepLink}" style="display:inline-block;padding:16px 32px;background:#007bff;color:white;text-decoration:none;border-radius:12px;font-size:18px;font-weight:bold;">
            AUTO-CONNECT NOW
          </a>
          <p style="margin-top:20px;font-size:14px;color:#666;">
            Or open manually: <a href="${webUrl}">${webUrl}</a>
          </p>
        </div>
      `
    });

    res.send(`
      <div style="text-align:center;padding:20px;">
        <h3 style="color:green;">✅ Auto-link sent to <b>${email}</b>!</h3>
        <p>Check Gmail → Tap <b>AUTO-CONNECT NOW</b></p>
        <p><small>Phone will connect in 3 seconds — no taps needed!</small></p>
      </div>
    `);
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).send(`
      <p style="color:red;">❌ Email failed. Check:</p>
      <ul style="text-align:left;">
        <li>App password correct (16 digits with spaces)</li>
        <li>2FA enabled on Gmail</li>
        <li>Less secure apps OFF</li>
      </ul>
    `);
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

// RENDER PORT FIX
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`MyLink Auto-Connect running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});
