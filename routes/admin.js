const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { notifySubscribers } = require('../bot');

// ===== GET /admin — сторінка логіну =====
router.get('/', (req, res) => {
  if (req.session && req.session.adminLoggedIn) {
    return res.redirect('/admin/dashboard');
  }
  res.send(loginPage());
});

// ===== POST /admin/login — авторизація =====
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.send(loginPage('Введіть логін та пароль'));
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM admins WHERE username = ?', [username]
    );

    if (rows.length === 0) {
      return res.send(loginPage('Невірний логін або пароль'));
    }

    const admin = rows[0];
    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.send(loginPage('Невірний логін або пароль'));
    }

    req.session.adminLoggedIn = true;
    req.session.adminUsername = admin.username;
    return res.redirect('/admin/dashboard');

  } catch (err) {
    console.error(err);
    return res.send(loginPage('Помилка сервера'));
  }
});

// ===== GET /admin/logout =====
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin');
});

// ===== GET /admin/dashboard =====
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [[{ totalArticles }]] = await db.execute('SELECT COUNT(*) as totalArticles FROM articles');
    const [[{ totalProducts }]] = await db.execute('SELECT COUNT(*) as totalProducts FROM products');
    const [articles] = await db.execute('SELECT * FROM articles ORDER BY created_at DESC LIMIT 10');
    const [products] = await db.execute('SELECT * FROM products ORDER BY created_at DESC LIMIT 10');

    res.send(dashboardPage(req.session.adminUsername, { totalArticles, totalProducts, articles, products }));
  } catch (err) {
    console.error(err);
    res.send('<p>Помилка бази даних: ' + err.message + '</p>');
  }
});

// ===== POST /admin/articles/add =====
router.post('/articles/add', requireAuth, async (req, res) => {
  const { title, category, excerpt, content, author, read_time, emoji, gradient } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO articles (title, category, excerpt, content, author, read_time, emoji, gradient) VALUES (?,?,?,?,?,?,?,?)',
      [title, category, excerpt || '', content || '', author || 'Редакція TechUA', read_time || 5, emoji || '📱', gradient || 'linear-gradient(135deg,#1a1a2e,#16213e)']
    );

    await notifySubscribers({
      id: result.insertId,
      title,
      category,
      excerpt: excerpt || '',
    });

    res.redirect('/admin/dashboard?success=article');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===== POST /admin/articles/delete/:id =====
router.post('/articles/delete/:id', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.redirect('/admin/dashboard?success=deleted');
  } catch (err) {
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===== GET /admin/articles/edit/:id =====
router.get('/articles/edit/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.redirect('/admin/dashboard?error=Статтю+не+знайдено');
    }
    return res.send(editArticlePage(rows[0], req.session.adminUsername));
  } catch (err) {
    console.error(err);
    return res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===== POST /admin/articles/edit/:id =====
router.post('/articles/edit/:id', requireAuth, async (req, res) => {
  const { title, category, excerpt, content, author, read_time, emoji, gradient } = req.body;
  try {
    await db.execute(
      'UPDATE articles SET title = ?, category = ?, excerpt = ?, content = ?, author = ?, read_time = ?, emoji = ?, gradient = ? WHERE id = ?',
      [title, category, excerpt || '', content || '', author || 'Редакція TechUA', read_time || 5, emoji || '📱', gradient || 'linear-gradient(135deg,#1a1a2e,#16213e)', req.params.id]
    );
    res.redirect('/admin/dashboard?success=article');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===== POST /admin/products/add =====
router.post('/products/add', requireAuth, async (req, res) => {
  const { name, category, description, price, rating, emoji, gradient } = req.body;
  try {
    await db.execute(
      'INSERT INTO products (name, category, description, price, rating, emoji, gradient) VALUES (?,?,?,?,?,?,?)',
      [name, category, description || '', price || '', rating || 8.0, emoji || '📱', gradient || 'linear-gradient(135deg,#1a1a2e,#16213e)']
    );
    res.redirect('/admin/dashboard?success=product');
  } catch (err) {
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===== POST /admin/products/delete/:id =====
router.post('/products/delete/:id', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.redirect('/admin/dashboard?success=deleted');
  } catch (err) {
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===== GET /admin/products/edit/:id =====
router.get('/products/edit/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.redirect('/admin/dashboard?error=Товар+не+знайдено');
    }
    return res.send(editProductPage(rows[0], req.session.adminUsername));
  } catch (err) {
    console.error(err);
    return res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===== POST /admin/products/edit/:id =====
router.post('/products/edit/:id', requireAuth, async (req, res) => {
  const { name, category, description, price, rating, emoji, gradient } = req.body;
  try {
    await db.execute(
      'UPDATE products SET name = ?, category = ?, description = ?, price = ?, rating = ?, emoji = ?, gradient = ? WHERE id = ?',
      [name, category, description || '', price || '', rating || 8.0, emoji || '📱', gradient || 'linear-gradient(135deg,#1a1a2e,#16213e)', req.params.id]
    );
    res.redirect('/admin/dashboard?success=product');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// ===================================================
// ===== HTML ГЕНЕРАТОРИ =====
// ===================================================

function loginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Вхід — TechUA Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#080b10;--surface:#0f1318;--border:#21262d;--accent:#e8ff3a;--text:#e6edf3;--muted:#7d8590;--red:#ff4466}
    body{background:var(--bg);color:var(--text);font-family:'Manrope',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(232,255,58,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(232,255,58,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
    .box{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:3rem;width:100%;max-width:420px;position:relative;z-index:1}
    .logo{font-family:'Bebas Neue',sans-serif;font-size:2.5rem;letter-spacing:3px;text-align:center;margin:0 auto 0.25rem;display:block;color:var(--accent);cursor:default;}
    .logo span{color:var(--accent)}
    .subtitle{text-align:center;color:var(--muted);font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:2.5rem}
    .form-group{margin-bottom:1.25rem}
    label{display:block;font-size:0.75rem;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:0.4rem}
    input{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.8rem 1rem;border-radius:10px;font-family:'Manrope',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s}
    input:focus{border-color:var(--accent)}
    .btn{width:100%;background:var(--accent);color:#000;font-family:'Manrope',sans-serif;font-weight:800;font-size:0.9rem;padding:0.9rem;border:none;border-radius:10px;cursor:pointer;margin-top:0.5rem;transition:opacity 0.2s}
    .btn:hover{opacity:0.85}
    .error{background:rgba(255,68,102,0.1);border:1px solid rgba(255,68,102,0.3);color:var(--red);padding:0.75rem 1rem;border-radius:10px;font-size:0.85rem;margin-bottom:1.25rem;text-align:center}
    .lock{text-align:center;font-size:3rem;margin-bottom:1rem}
  </style>
</head>
<body>
  <div class="box">
    <div class="lock">🔒</div>
    <div class="logo">TECH<span>UA</span></div>
    <div class="subtitle">Панель адміністратора</div>
    ${error ? `<div class="error">⚠️ ${error}</div>` : ''}
    <form method="POST" action="/admin/login">
      <div class="form-group">
        <label>Логін</label>
        <input type="text" name="username" placeholder="admin" required autofocus>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" name="password" placeholder="••••••••" required>
      </div>
      <button type="submit" class="btn">Увійти</button>
    </form>
  </div>
</body>
</html>`;
}

function dashboardPage(username, data) {
  const { totalArticles, totalProducts, articles, products } = data;

  const articlesRows = articles.map(a => `
    <tr data-title="${escHtml(a.title).toLowerCase()}" data-category="${escHtml(a.category).toLowerCase()}" data-author="${escHtml(a.author).toLowerCase()}">
      <td>${a.emoji} ${escHtml(a.title)}</td>
      <td><span class="badge">${escHtml(a.category)}</span></td>
      <td>${escHtml(a.author)}</td>
      <td>${new Date(a.created_at).toLocaleDateString('uk-UA')}</td>
      <td class="actions">
        <div class="action-group">
          <a href="/admin/articles/edit/${a.id}" class="btn-edit">Редагувати</a>
          <form method="POST" action="/admin/articles/delete/${a.id}" onsubmit="return confirm('Видалити статтю?')">
            <button type="submit" class="btn-del">Видалити</button>
          </form>
        </div>
      </td>
    </tr>`).join('');

  const productsRows = products.map(p => `
    <tr>
      <td>${p.emoji} ${escHtml(p.name)}</td>
      <td><span class="badge">${escHtml(p.category)}</span></td>
      <td class="accent">${escHtml(p.price || '—')}</td>
      <td><span class="rating">${p.rating}</span></td>
      <td class="actions">
        <div class="action-group">
          <a href="/admin/products/edit/${p.id}" class="btn-edit">Редагувати</a>
          <form method="POST" action="/admin/products/delete/${p.id}" onsubmit="return confirm('Видалити товар?')">
            <button type="submit" class="btn-del">Видалити</button>
          </form>
        </div>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Адмін-панель — TechUA</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#080b10;--surface:#0f1318;--surface2:#161b22;--border:#21262d;--accent:#e8ff3a;--accent2:#00d4ff;--text:#e6edf3;--muted:#7d8590;--red:#ff4466}
    body{background:var(--bg);color:var(--text);font-family:'Manrope',sans-serif;min-height:100vh}
    a{color:inherit;text-decoration:none}

    /* SIDEBAR */
    .layout{display:flex;min-height:100vh}
    .sidebar{width:240px;background:var(--surface);border-right:1px solid var(--border);padding:2rem 1.5rem;display:flex;flex-direction:column;gap:0.5rem;position:sticky;top:0;height:100vh;overflow-y:auto}
    .sidebar-logo{font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:2px;margin-bottom:2rem;display:inline-flex;align-items:center;gap:0.25rem;cursor:pointer;transition:opacity 0.2s}
    .sidebar-logo:hover{opacity:0.9}
    .sidebar-logo span{color:var(--accent)}
    .sidebar-label{font-size:0.65rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:1rem 0 0.5rem;padding:0 0.5rem}
    .nav-item{display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;border-radius:10px;font-size:0.85rem;font-weight:600;color:var(--muted);cursor:pointer;transition:all 0.2s}
    .nav-item:hover,.nav-item.active{background:rgba(232,255,58,0.08);color:var(--text)}
    .nav-item.active{color:var(--accent)}
    .sidebar-bottom{margin-top:auto;padding-top:1rem;border-top:1px solid var(--border)}
    .user-info{font-size:0.8rem;color:var(--muted);margin-bottom:0.75rem}
    .btn-logout{display:block;width:100%;background:transparent;border:1px solid var(--border);color:var(--muted);font-family:'Manrope',sans-serif;font-size:0.8rem;font-weight:700;padding:0.5rem;border-radius:8px;cursor:pointer;transition:all 0.2s;text-align:center}
    .btn-logout:hover{border-color:var(--red);color:var(--red)}

    /* MAIN */
    .main{flex:1;padding:2.5rem;overflow-x:auto}
    .page-header{margin-bottom:2rem}
    .page-header h1{font-family:'Bebas Neue',sans-serif;font-size:2.5rem;letter-spacing:1px}
    .page-header p{color:var(--muted);font-size:0.85rem;margin-top:0.25rem}

    /* STATS */
    .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2.5rem}
    .stat-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.5rem}
    .stat-box .num{font-family:'Bebas Neue',sans-serif;font-size:2.5rem;color:var(--accent);line-height:1}
    .stat-box .lbl{font-size:0.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:0.25rem}

    /* TABS */
    .tab-btns{display:flex;gap:0.5rem;margin-bottom:1.5rem}
    .tab-btn{background:var(--surface);border:1px solid var(--border);color:var(--muted);font-family:'Manrope',sans-serif;font-size:0.8rem;font-weight:700;padding:0.5rem 1.25rem;border-radius:99px;cursor:pointer;transition:all 0.2s}
    .tab-btn.active{background:var(--accent);border-color:var(--accent);color:#000}
    .tab-content{display:none}
    .tab-content.active{display:block}

    /* SECTIONS */
    .section{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:1.5rem}
    .section-head{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);font-weight:800;font-size:1rem;display:flex;align-items:center;justify-content:space-between}
    .section-head span{font-size:0.75rem;color:var(--muted);font-weight:400}

    /* FORM */
    .add-form{padding:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .add-form .full{grid-column:1/-1}
    .form-group{display:flex;flex-direction:column;gap:0.35rem}
    .form-group label{font-size:0.72rem;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
    .form-group input,.form-group select,.form-group textarea{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.65rem 0.9rem;border-radius:10px;font-family:'Manrope',sans-serif;font-size:0.85rem;outline:none;transition:border-color 0.2s;resize:vertical}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--accent)}
    .rating-stars{display:flex;gap:0.25rem}
    .rating-stars .star{font-size:1.5rem;color:#ddd;cursor:pointer;transition:color 0.2s}
    .rating-stars .star:hover,.rating-stars .star.active{color:#e8ff3a}
    .text-toolbar{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.85rem}
    .text-tool-btn{background:rgba(232,255,58,0.08);border:1px solid rgba(232,255,58,0.2);color:var(--text);font-family:'Manrope',sans-serif;font-size:0.85rem;font-weight:700;padding:0.55rem 0.85rem;border-radius:10px;cursor:pointer;transition:background 0.2s,border-color 0.2s}
    .text-tool-btn:hover{background:rgba(232,255,58,0.14);border-color:var(--accent)}
    .btn-submit{background:var(--accent);color:#000;font-family:'Manrope',sans-serif;font-weight:800;font-size:0.85rem;padding:0.7rem 2rem;border:none;border-radius:10px;cursor:pointer;transition:opacity 0.2s;grid-column:1/-1;justify-self:start}
    .btn-submit:hover{opacity:0.85}
    .form-note{font-size:0.8rem;color:var(--muted);margin-top:0.5rem;line-height:1.4}

    .filter-bar{display:flex;flex-wrap:wrap;gap:1rem;padding:1rem 1.5rem;border-bottom:1px solid rgba(33,38,45,0.5);background:rgba(255,255,255,0.03)}
    .filter-bar input,.filter-bar select{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.75rem 1rem;border-radius:10px;font-family:'Manrope',sans-serif;font-size:0.9rem;outline:none;min-width:220px}
    .filter-bar input:focus,.filter-bar select:focus{border-color:var(--accent)}

    /* TABLE */
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse}
    th{padding:0.75rem 1rem;text-align:left;font-size:0.7rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)}
    td{padding:0.85rem 1rem;font-size:0.85rem;border-bottom:1px solid rgba(33,38,45,0.5)}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:rgba(232,255,58,0.02)}
    .badge{background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);color:var(--accent2);font-size:0.7rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:6px}
    .rating{background:rgba(232,255,58,0.1);border:1px solid rgba(232,255,58,0.2);color:var(--accent);font-size:0.75rem;font-weight:800;padding:0.2rem 0.6rem;border-radius:6px}
    .accent{color:var(--accent);font-weight:700}
    .actions{white-space:nowrap}
    .action-group{display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}
    .action-group form{margin:0}
    .btn-edit{display:inline-flex;align-items:center;justify-content:center;gap:0.35rem;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.2);color:var(--accent2);font-family:'Manrope',sans-serif;font-size:0.75rem;font-weight:700;padding:0.35rem 0.8rem;border-radius:7px;cursor:pointer;transition:all 0.2s;text-decoration:none}
    .btn-edit:hover{background:rgba(0,212,255,0.18)}
    .btn-del{display:inline-flex;align-items:center;justify-content:center;background:transparent;border:1px solid rgba(255,68,102,0.3);color:var(--red);font-family:'Manrope',sans-serif;font-size:0.75rem;font-weight:700;padding:0.3rem 0.75rem;border-radius:7px;cursor:pointer;transition:all 0.2s}
    .btn-del:hover{background:rgba(255,68,102,0.1)}

    /* ALERT */
    .alert{padding:0.85rem 1.25rem;border-radius:10px;margin-bottom:1.5rem;font-size:0.85rem;font-weight:600}
    .alert-success{background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);color:var(--accent2)}
    .alert-error{background:rgba(255,68,102,0.1);border:1px solid rgba(255,68,102,0.2);color:var(--red)}

    @media(max-width:900px){
      .sidebar{display:none}
      .stats-row{grid-template-columns:1fr 1fr}
      .add-form{grid-template-columns:1fr}
      .add-form .full{grid-column:auto}
      .btn-submit{grid-column:auto}
    }
  </style>
</head>
<body>
<div class="layout">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <a href="/" class="sidebar-logo">TECH<span>UA</span></a>
    <div class="sidebar-label">Контент</div>
    <div class="nav-item active" onclick="showTab('articles')">📝 Статті</div>
    <div class="nav-item" onclick="showTab('products')">📦 Каталог</div>
    <div class="sidebar-bottom">
      <a href="/" class="sidebar-logo">TECH<span>UA</span></a>
      <div class="user-info">👤 ${escHtml(username)}</div>
      <a href="/admin/logout" class="btn-logout">Вийти</a>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main">
    <div class="page-header">
      <h1>Адмін-панель</h1>
      <p>Керуй контентом сайту TechUA</p>
    </div>

    <!-- STATS -->
    <div class="stats-row">
      <div class="stat-box"><div class="num">${totalArticles}</div><div class="lbl">Статей</div></div>
      <div class="stat-box"><div class="num">${totalProducts}</div><div class="lbl">Товарів</div></div>
      <div class="stat-box"><div class="num">✅</div><div class="lbl">БД підключена</div></div>
      <div class="stat-box"><div class="num">🔒</div><div class="lbl">Захищено</div></div>
    </div>

    <!-- ALERTS -->
    ${getAlert()}

    <!-- TABS -->
    <div class="tab-btns">
      <button class="tab-btn active" onclick="showTab('articles')">📝 Статті</button>
      <button class="tab-btn" onclick="showTab('products')">📦 Каталог</button>
    </div>

    <!-- TAB: ARTICLES -->
    <div class="tab-content active" id="tab-articles">
      <div class="section">
        <div class="section-head">➕ Додати статтю</div>
        <form method="POST" action="/admin/articles/add" class="add-form">
          <div class="form-group full">
            <label>Заголовок *</label>
            <input type="text" name="title" placeholder="Наприклад: iPhone 17 — огляд" required>
          </div>
          <div class="form-group">
            <label>Категорія</label>
            <select name="category">
              <option>Смартфони</option>
              <option>Ноутбуки</option>
              <option>Аудіо</option>
              <option>Камери</option>
              <option>Годинники</option>
              <option>Ігри</option>
              <option>Інше</option>
            </select>
          </div>
          <div class="form-group">
            <label>Автор</label>
            <input type="text" name="author" placeholder="Ім'я автора" value="Редакція TechUA">
          </div>
          <div class="form-group">
            <label>Час читання (хв)</label>
            <input type="number" name="read_time" value="5" min="1" max="60">
          </div>
          <div class="form-group">
            <label>Emoji</label>
            <input type="text" name="emoji" placeholder="📱" value="📱">
          </div>
          <div class="form-group full">
            <label>Короткий опис</label>
            <textarea name="excerpt" rows="2" placeholder="Короткий анонс статті..."></textarea>
          </div>
          <div class="form-group full">
            <label>Повний текст (без HTML)</label>
            <div class="text-toolbar">
              <button type="button" class="text-tool-btn" onclick="insertText('content','***','***')">Жирний</button>
              <button type="button" class="text-tool-btn" onclick="insertText('content','*','*')">Курсив</button>
              <button type="button" class="text-tool-btn" onclick="insertText('content','    ')">Відступ</button>
              <button type="button" class="text-tool-btn" onclick="insertText('content','| Заголовок 1 | Заголовок 2 |\n|---|---|\n| Текст 1 | Текст 2 |\n')">Таблиця</button>
            </div>
            <textarea id="content" name="content" rows="6" placeholder="Текст статті... Наприклад: Цей огляд розповідає про новий iPhone.\n\nПерший абзац...\nДругий абзац..."></textarea>
            <div class="form-note">Вводьте лише текст, HTML-теги не потрібні.</div>
          </div>
          <button type="submit" class="btn-submit">Опублікувати статтю</button>
        </form>
      </div>

      <div class="section">
        <div class="section-head">Всі статті <span>${totalArticles} всього</span></div>
        <div class="table-wrap">
          <table id="articlesTable">
            <thead><tr><th>Заголовок</th><th>Категорія</th><th>Автор</th><th>Дата</th><th>Дії</th></tr></thead>
            <tbody>${articlesRows || '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:2rem">Статей ще немає</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB: PRODUCTS -->
    <div class="tab-content" id="tab-products">
      <div class="section">
        <div class="section-head">➕ Додати товар до каталогу</div>
        <form method="POST" action="/admin/products/add" class="add-form">
          <div class="form-group full">
            <label>Назва товару *</label>
            <input type="text" name="name" placeholder="Наприклад: Samsung Galaxy S25" required>
          </div>
          <div class="form-group">
            <label>Категорія</label>
            <select name="category">
              <option value="phone">Смартфони</option>
              <option value="laptop">Ноутбуки</option>
              <option value="audio">Аудіо</option>
              <option value="camera">Камери</option>
              <option value="watch">Годинники</option>
              <option value="gaming">Ігри</option>
            </select>
          </div>
          <div class="form-group">
            <label>Ціна</label>
            <input type="text" name="price" placeholder="від 39 990 грн">
          </div>
          <div class="form-group">
            <label>Рейтинг (0–10)</label>
            <div style="display:flex;gap:0.5rem;align-items:center">
              <div class="rating-stars" id="rating-stars"></div>
              <input type="number" id="rating-input" step="0.1" min="0" max="10" value="8.0" style="width:80px">
            </div>
            <input type="hidden" name="rating" id="rating-value" value="8.0">
          </div>
          <div class="form-group">
            <label>Emoji</label>
            <input type="text" name="emoji" placeholder="📱" value="📱">
          </div>
          <div class="form-group full">
            <label>Опис</label>
            <div class="text-toolbar">
              <button type="button" class="text-tool-btn" onclick="insertText('description','***','***')">Жирний</button>
              <button type="button" class="text-tool-btn" onclick="insertText('description','*','*')">Курсив</button>
              <button type="button" class="text-tool-btn" onclick="insertText('description','    ')">Відступ</button>
              <button type="button" class="text-tool-btn" onclick="insertText('description','| Заголовок 1 | Заголовок 2 |\n|---|---|\n| Текст 1 | Текст 2 |\n')">Таблиця</button>
            </div>
            <textarea id="description" name="description" rows="3" placeholder="Короткий опис товару..."></textarea>
          </div>
          <button type="submit" class="btn-submit">Додати до каталогу</button>
        </form>
      </div>

      <div class="section">
        <div class="section-head">Каталог товарів <span>${totalProducts} всього</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Назва</th><th>Категорія</th><th>Ціна</th><th>Рейтинг</th><th>Дії</th></tr></thead>
            <tbody>${productsRows || '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:2rem">Товарів ще немає</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>

  </main>
</div>

<script>
function insertText(fieldId, prefix, suffix) {
  const textarea = document.getElementById(fieldId);
  if (!textarea) return;
  textarea.focus();
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.substring(start, end);
  if (!selected && suffix) return; // Не вставляти, якщо не виділено текст і є суфікс
  const before = value.substring(0, start);
  const after = value.substring(end);
  const insert = prefix + selected + suffix;
  textarea.value = before + insert + after;
  const cursor = before.length + insert.length;
  textarea.setSelectionRange(cursor, cursor);
}

function initRating() {
  const container = document.getElementById('rating-stars');
  const ratingValue = document.getElementById('rating-value');
  const ratingInput = document.getElementById('rating-input');
  if (!container || !ratingValue || !ratingInput) return;
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '⭐';
    star.dataset.rating = i * 2;
    star.onclick = () => {
      const val = parseFloat(star.dataset.rating);
      ratingInput.value = val.toFixed(1);
      ratingValue.value = val.toFixed(1);
      updateStars(container, val);
    };
    container.appendChild(star);
  }
  ratingInput.oninput = () => {
    const val = parseFloat(ratingInput.value) || 0;
    ratingValue.value = val.toFixed(1);
    updateStars(container, val);
  };
  updateStars(container, parseFloat(ratingValue.value));
}

function updateStars(container, rating) {
  const stars = Math.round(rating / 2);
  container.querySelectorAll('.star').forEach((star, index) => {
    star.classList.toggle('active', index < stars);
  });
}

initRating();

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => { if(b.textContent.toLowerCase().includes(name === 'articles' ? 'стат' : 'катал')) b.classList.add('active'); });
  document.querySelectorAll('.nav-item').forEach(n => { if(n.textContent.toLowerCase().includes(name === 'articles' ? 'стат' : 'катал')) n.classList.add('active'); });
}

// Автоматично показати вкладку з успішним повідомленням
const params = new URLSearchParams(window.location.search);
if (params.get('success') === 'product') showTab('products');
</script>
</body>
</html>`;
}

function editArticlePage(article, username) {
  const categories = ['Смартфони','Ноутбуки','Аудіо','Камери','Годинники','Ігри','Інше'];
  const categoryOptions = categories.map(cat => `
              <option value="${cat}"${cat === article.category ? ' selected' : ''}>${cat}</option>
            `).join('');

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Редагування статті — TechUA</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#080b10;--surface:#0f1318;--border:#21262d;--accent:#e8ff3a;--accent2:#00d4ff;--text:#e6edf3;--muted:#7d8590;--red:#ff4466}
    body{background:var(--bg);color:var(--text);font-family:'Manrope',sans-serif;min-height:100vh;padding:2rem}
    a{color:inherit;text-decoration:none}
    .container{max-width:920px;margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:24px;overflow:hidden}
    .header{padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:1rem}
    .header h1{font-family:'Bebas Neue',sans-serif;font-size:2rem}
    .header a{color:var(--accent2);font-weight:700}
    .form{padding:2rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .form-group{display:flex;flex-direction:column;gap:0.35rem}
    .form-group label{font-size:0.72rem;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
    .form-group input,.form-group select,.form-group textarea{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.75rem 1rem;border-radius:12px;font-family:'Manrope',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;resize:vertical}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--accent)}
    .full{grid-column:1/-1}
    .text-toolbar{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.85rem}
    .text-tool-btn{background:rgba(232,255,58,0.08);border:1px solid rgba(232,255,58,0.2);color:var(--text);font-family:'Manrope',sans-serif;font-size:0.85rem;font-weight:700;padding:0.55rem 0.85rem;border-radius:10px;cursor:pointer;transition:background 0.2s,border-color 0.2s}
    .text-tool-btn:hover{background:rgba(232,255,58,0.14);border-color:var(--accent)}
    .btn-submit{background:var(--accent);color:#000;font-family:'Manrope',sans-serif;font-weight:800;font-size:0.85rem;padding:0.85rem 2rem;border:none;border-radius:12px;cursor:pointer;transition:opacity 0.2s;grid-column:1/-1;justify-self:start}
    .btn-submit:hover{opacity:0.85}
    .form-note{font-size:0.8rem;color:var(--muted);margin-top:0.5rem;line-height:1.4}
    @media(max-width:900px){.form{grid-template-columns:1fr}.full{grid-column:auto}}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Редагувати статтю</h1>
        <p style="color:var(--muted);margin-top:0.5rem">Автор: ${escHtml(username)}</p>
      </div>
      <a href="/admin/dashboard">← Назад до панелі</a>
    </div>

    <form method="POST" action="/admin/articles/edit/${article.id}" class="form">
      <div class="form-group full">
        <label>Заголовок *</label>
        <input type="text" name="title" value="${escHtml(article.title)}" required>
      </div>
      <div class="form-group">
        <label>Категорія</label>
        <select name="category">${categoryOptions}</select>
      </div>
      <div class="form-group">
        <label>Автор</label>
        <input type="text" name="author" value="${escHtml(article.author)}">
      </div>
      <div class="form-group">
        <label>Час читання (хв)</label>
        <input type="number" name="read_time" value="${escHtml(article.read_time)}" min="1" max="60">
      </div>
      <div class="form-group">
        <label>Emoji</label>
        <input type="text" name="emoji" value="${escHtml(article.emoji)}">
      </div>
      <div class="form-group full">
        <label>Короткий опис</label>
        <textarea name="excerpt" rows="2">${escHtml(article.excerpt)}</textarea>
      </div>
      <div class="form-group full">
        <label>Повний текст (без HTML)</label>
        <div class="text-toolbar">
          <button type="button" class="text-tool-btn" onclick="insertText('content','***','***')">Жирний</button>
          <button type="button" class="text-tool-btn" onclick="insertText('content','*','*')">Курсив</button>
          <button type="button" class="text-tool-btn" onclick="insertText('content','    ')">Відступ</button>
          <button type="button" class="text-tool-btn" onclick="insertText('content','| Заголовок 1 | Заголовок 2 |\n|---|---|\n| Текст 1 | Текст 2 |\n')">Таблиця</button>
        </div>
        <textarea id="content" name="content" rows="8">${escHtml(article.content)}</textarea>
        <div class="form-note">Вводьте лише текст, HTML-теги не потрібні.</div>
      </div>
      <button type="submit" class="btn-submit">Зберегти зміни</button>
    </form>
  </div>

  <script>
  function insertText(fieldId, prefix, suffix) {
    const textarea = document.getElementById(fieldId);
    if (!textarea) return;
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.substring(start, end);
    if (!selected && suffix) return; // Не вставляти, якщо не виділено текст і є суфікс
    const before = value.substring(0, start);
    const after = value.substring(end);
    const insert = prefix + (selected || '') + suffix;
    textarea.value = before + insert + after;
    const cursor = before.length + insert.length;
    textarea.setSelectionRange(cursor, cursor);
  }
  </script>
</body>
</html>`;
}
function editProductPage(product, username) {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Редагування товару — TechUA</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#080b10;--surface:#0f1318;--border:#21262d;--accent:#e8ff3a;--accent2:#00d4ff;--text:#e6edf3;--muted:#7d8590;--red:#ff4466}
    body{background:var(--bg);color:var(--text);font-family:'Manrope',sans-serif;min-height:100vh;padding:2rem}
    a{color:inherit;text-decoration:none}
    .container{max-width:920px;margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:24px;overflow:hidden}
    .header{padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:1rem}
    .header h1{font-family:'Bebas Neue',sans-serif;font-size:2rem}
    .header a{color:var(--accent2);font-weight:700}
    .form{padding:2rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .form-group{display:flex;flex-direction:column;gap:0.35rem}
    .form-group label{font-size:0.72rem;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
    .form-group input,.form-group select,.form-group textarea{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.75rem 1rem;border-radius:12px;font-family:'Manrope',sans-serif;font-size:0.9rem;outline:none;transition:border-color 0.2s;resize:vertical}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--accent)}
    .full{grid-column:1/-1}
    .text-toolbar{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.85rem}
    .text-tool-btn{background:rgba(232,255,58,0.08);border:1px solid rgba(232,255,58,0.2);color:var(--text);font-family:'Manrope',sans-serif;font-size:0.85rem;font-weight:700;padding:0.55rem 0.85rem;border-radius:10px;cursor:pointer;transition:background 0.2s,border-color 0.2s}
    .text-tool-btn:hover{background:rgba(232,255,58,0.14);border-color:var(--accent)}
    .rating-stars{display:flex;gap:0.25rem}
    .rating-stars .star{font-size:1.5rem;color:#ddd;cursor:pointer;transition:color 0.2s}
    .rating-stars .star:hover,.rating-stars .star.active{color:#e8ff3a}
    .btn-submit{background:var(--accent);color:#000;font-family:'Manrope',sans-serif;font-weight:800;font-size:0.85rem;padding:0.85rem 2rem;border:none;border-radius:12px;cursor:pointer;transition:opacity 0.2s;grid-column:1/-1;justify-self:start}
    .btn-submit:hover{opacity:0.85}
    .form-note{font-size:0.8rem;color:var(--muted);margin-top:0.5rem;line-height:1.4}
    @media(max-width:900px){.form{grid-template-columns:1fr}.full{grid-column:auto}}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Редагувати товар</h1>
        <p style="color:var(--muted);margin-top:0.5rem">Автор: ${escHtml(username)}</p>
      </div>
      <a href="/admin/dashboard">← Назад до панелі</a>
    </div>

    <form method="POST" action="/admin/products/edit/${product.id}" class="form">
      <div class="form-group full">
        <label>Назва товару *</label>
        <input type="text" name="name" value="${escHtml(product.name)}" required>
      </div>
      <div class="form-group">
        <label>Категорія</label>
        <select name="category">
          <option value="phone"${product.category === 'phone' ? ' selected' : ''}>Смартфони</option>
          <option value="laptop"${product.category === 'laptop' ? ' selected' : ''}>Ноутбуки</option>
          <option value="audio"${product.category === 'audio' ? ' selected' : ''}>Аудіо</option>
          <option value="camera"${product.category === 'camera' ? ' selected' : ''}>Камери</option>
          <option value="watch"${product.category === 'watch' ? ' selected' : ''}>Годинники</option>
          <option value="gaming"${product.category === 'gaming' ? ' selected' : ''}>Ігри</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ціна</label>
        <input type="text" name="price" value="${escHtml(product.price || '')}" placeholder="від 39 990 грн">
      </div>
      <div class="form-group">
        <label>Рейтинг (0–10)</label>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <div class="rating-stars" id="rating-stars"></div>
          <input type="number" id="rating-input" step="0.1" min="0" max="10" value="${product.rating}">
        </div>
        <input type="hidden" name="rating" id="rating-value" value="${product.rating}">
      </div>
      <div class="form-group">
        <label>Emoji</label>
        <input type="text" name="emoji" value="${escHtml(product.emoji)}">
      </div>
      <div class="form-group full">
        <label>Опис</label>
        <div class="text-toolbar">
          <button type="button" class="text-tool-btn" onclick="insertText('description','***','***')">Жирний</button>
          <button type="button" class="text-tool-btn" onclick="insertText('description','*','*')">Курсив</button>
          <button type="button" class="text-tool-btn" onclick="insertText('description','    ')">Відступ</button>
          <button type="button" class="text-tool-btn" onclick="insertText('description','| Заголовок 1 | Заголовок 2 |\n|---|---|\n| Текст 1 | Текст 2 |\n')">Таблиця</button>
        </div>
        <textarea id="description" name="description" rows="3">${escHtml(product.description || '')}</textarea>
      </div>
      <button type="submit" class="btn-submit">Зберегти зміни</button>
    </form>
  </div>

  <script>
  function insertText(fieldId, prefix, suffix) {
    const textarea = document.getElementById(fieldId);
    if (!textarea) return;
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.substring(start, end);
    if (!selected && suffix) return;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const insert = prefix + selected + suffix;
    textarea.value = before + insert + after;
    const cursor = before.length + insert.length;
    textarea.setSelectionRange(cursor, cursor);
  }

  function initRating() {
    const container = document.getElementById('rating-stars');
    const ratingValue = document.getElementById('rating-value');
    const ratingInput = document.getElementById('rating-input');
    if (!container || !ratingValue || !ratingInput) return;
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '⭐';
      star.dataset.rating = i * 2;
      star.onclick = () => {
        const val = parseFloat(star.dataset.rating);
        ratingInput.value = val.toFixed(1);
        ratingValue.value = val.toFixed(1);
        updateStars(container, val);
      };
      container.appendChild(star);
    }
    ratingInput.oninput = () => {
      const val = parseFloat(ratingInput.value) || 0;
      ratingValue.value = val.toFixed(1);
      updateStars(container, val);
    };
    updateStars(container, parseFloat(ratingValue.value));
  }

  function updateStars(container, rating) {
    const stars = Math.round(rating / 2);
    container.querySelectorAll('.star').forEach((star, index) => {
      star.classList.toggle('active', index < stars);
    });
  }

  initRating();
  </script>
</body>
</html>`;
}
function getAlert() {
  return `
  <script>
    const p = new URLSearchParams(window.location.search);
    if(p.get('success')==='article') showAlertMsg('✅ Статтю успішно додано!','success');
    if(p.get('success')==='product') showAlertMsg('✅ Товар успішно додано!','success');
    if(p.get('success')==='deleted') showAlertMsg('🗑️ Запис видалено','success');
    if(p.get('error')) showAlertMsg('❌ Помилка: '+decodeURIComponent(p.get('error')),'error');
    function showAlertMsg(msg,type){
      const d=document.createElement('div');
      d.className='alert alert-'+type;
      d.textContent=msg;
      document.querySelector('.page-header').after(d);
      setTimeout(()=>d.remove(),4000);
    }
  </script>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

module.exports = router;
