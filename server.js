const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const dbFile = path.join(__dirname, 'database.sqlite');
const db = new Database(dbFile);

// initialize
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  passwordHash TEXT,
  isActive INTEGER,
  isSuspended INTEGER,
  sponsorId TEXT,
  createdAt TEXT
);`);

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({limit: '1mb'}));

// simple health
app.get('/api/health', (req, res) => res.json({ok:true, time: new Date().toISOString()}));

// create user
app.post('/api/register', (req, res) => {
  try {
    const { name, username, email, password, sponsorCode } = req.body;
    if (!email || !password || !username || !name) return res.status(400).json({error:'missing_fields'});
    // check exists
    const exists = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (exists) return res.status(409).json({error:'user_exists'});
    const id = 'user_' + Date.now();
    const sponsor = sponsorCode ? db.prepare('SELECT id FROM users WHERE username = ?').get(sponsorCode) : null;
    db.prepare('INSERT INTO users (id,name,username,email,passwordHash,isActive,isSuspended,sponsorId,createdAt) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, name, username, email, password, 0, 0, sponsor ? sponsor.id : null, new Date().toISOString());
    const user = db.prepare('SELECT id,name,username,email,isActive,isSuspended,sponsorId,createdAt FROM users WHERE id = ?').get(id);
    res.json({ok:true, user});
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'server_error'});
  }
});

// list users (admin). Simple token check via query param ?admin=1 or header X-Admin-Token (for local dev)
app.get('/api/users', (req, res) => {
  const token = req.header('x-admin-token') || req.query.adminToken || '';
  // default dev token: 'devtoken' - change in production
  if (token !== process.env.ADMIN_TOKEN && token !== 'devtoken') {
    return res.status(401).json({error:'unauthorized'});
  }
  const users = db.prepare('SELECT id,name,username,email,isActive,isSuspended,sponsorId,createdAt FROM users ORDER BY createdAt DESC').all();
  res.json({ok:true, users});
});

// serve static frontend build if exists
const buildPath = path.join(__dirname, '..', 'public_html');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server running on', PORT));
