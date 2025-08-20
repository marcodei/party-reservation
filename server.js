require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const app = express();
const DB_FILE = path.join(__dirname, 'db.sqlite');

const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASSWORD;
const WHATSAPP_LINK = process.env.WHATSAPP_LINK;
const IBAN = process.env.IBAN;
const SESSION_SECRET = process.env.SESSION_SECRET || 'secret';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: '.' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
  }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Initialize DB
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    num_people INTEGER,
    names TEXT,
    gender_counts TEXT,
    payment_method TEXT,
    joined_whatsapp INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    password_hash TEXT
  )`, [], () => {
    db.get("SELECT COUNT(*) as c FROM admin", (err, row) => {
      if (row && row.c === 0) {
        bcrypt.hash(ADMIN_PASS, 10).then(hash => {
          db.run("INSERT INTO admin (password_hash) VALUES (?)", [hash]);
        });
      }
    });
  });
});

// API Endpoints

// Create reservation
app.post('/api/reservations', (req, res) => {
  try {
    const { num_people, names, gender_counts, payment_method, joined_whatsapp } = req.body;
    if (!num_people || !Array.isArray(names) || !gender_counts || !payment_method) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    db.run(`INSERT INTO reservations (num_people, names, gender_counts, payment_method, joined_whatsapp)
            VALUES (?, ?, ?, ?, ?)`,
      [num_people, JSON.stringify(names), JSON.stringify(gender_counts), payment_method, joined_whatsapp ? 1 : 0],
      function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ success: true, id: this.lastID });
      });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get WhatsApp link
app.get('/api/whatsapp', (req, res) => {
  res.json({ link: WHATSAPP_LINK });
});

// Get IBAN
app.get('/api/iban', (req, res) => {
  res.json({ iban: IBAN });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  db.get("SELECT password_hash FROM admin LIMIT 1", (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(500).json({ error: 'Admin not configured' });
    bcrypt.compare(password || '', row.password_hash).then(match => {
      if (!match) return res.status(401).json({ error: 'Wrong password' });
      req.session.admin = true;
      res.json({ success: true });
    });
  });
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/admin/reservations', requireAdmin, (req, res) => {
  db.all("SELECT * FROM reservations ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    rows.forEach(r => {
      try { r.names = JSON.parse(r.names); } catch(e) {}
      try { r.gender_counts = JSON.parse(r.gender_counts); } catch(e) {}
    });
    res.json(rows);
  });
});

// Fallback for admin route direct navigation (optional)
// app.get('/admin/*', (req,res)=> res.sendFile(path.join(__dirname,'admin','index.html')));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
