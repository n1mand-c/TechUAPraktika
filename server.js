const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const botService = require('./bot');

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const app = express();
const PORT = 3000;

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'techua_secret_key_2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // встановіть true якщо HTTPS
    maxAge: 1000 * 60 * 60 * 2 // 2 години
  }
}));

// ===== ROUTES =====
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

app.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Заповніть всі поля' });
  }

  try {
    await db.execute(
      'INSERT INTO contact_requests (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message]
    );

    await botService.notifyAdmins(
      `<b>Нова заявка з сайту TechUA</b>\n` +
      `<b>Ім'я:</b> ${escapeHtml(name)}\n` +
      `<b>Email:</b> ${escapeHtml(email)}\n` +
      `<b>Тема:</b> ${escapeHtml(subject)}\n` +
      `<b>Повідомлення:</b> ${escapeHtml(message)}`
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err.message);
    return res.status(500).json({ error: 'Помилка сервера' });
  }
});

// ===== ПУБЛІЧНІ СТОРІНКИ =====
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/catalog', (req, res) => res.sendFile(path.join(__dirname, 'public', 'catalog.html')));
app.get('/articles', (req, res) => res.sendFile(path.join(__dirname, 'public', 'articles.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));

async function ensureAdminAccount() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await db.execute('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.execute(
      'INSERT INTO admins (username, password) VALUES (?, ?)',
      ['admin', hash]
    );
    console.log('✅ Додано стандартного адміністратора: admin / admin123');
  }
}

async function startServer() {
  try {
    await ensureAdminAccount();
    await botService.createBotTables();
    await botService.setupBot();

    app.listen(PORT, () => {
      console.log(`✅ TechUA запущено: http://localhost:${PORT}`);
      console.log(`🔒 Адмін-панель: http://localhost:${PORT}/admin`);
    });
  } catch (err) {
    console.error('❌ Помилка ініціалізації:', err.message);
    process.exit(1);
  }
}

startServer();
