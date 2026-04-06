# TechUA — Сайт про техніку

## 🚀 Швидкий старт

### 1. Встановити залежності
```bash
npm install
```

### 2. Налаштувати базу даних MySQL
Відкрий MySQL Workbench або phpMyAdmin і виконай файл `schema.sql`:
```bash
mysql -u root -p < schema.sql
```
Або просто скопіюй вміст `schema.sql` і виконай у MySQL Workbench.

### 3. Запустити сервер
```bash
npm start
```
Або для розробки (з автоперезапуском):
```bash
npm run dev
```

### 4. Налаштування Telegram-бота
Перед запуском додай змінні оточення:
```bash
set TELEGRAM_BOT_TOKEN=ваш_токен_бота
set TELEGRAM_ADMIN_IDS=123456789,987654321
set SITE_URL=http://localhost:3000
```
- `TELEGRAM_BOT_TOKEN` — токен вашого Telegram-бота
- `TELEGRAM_ADMIN_IDS` — список Telegram chat_id адміністраторів через кому
- `SITE_URL` — адреса сайту для посилань на статті

### 5. Відкрити сайт
- **Сайт:** http://localhost:3000
- **Адмін-панель:** http://localhost:3000/admin

---

## 🔒 Вхід в адмін-панель

> **Важливо:** Кнопки на сайті на адмін-панель немає.
> Потрібно вручну перейти за адресою: `http://localhost:3000/admin`

**Дані за замовчуванням:**
- Логін: `admin`
- Пароль: `admin123`

### Змінити пароль адміна:
Виконай у Node.js REPL:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('твій_новий_пароль', 10);
console.log(hash);
// Потім встав хеш у БД:
// UPDATE admins SET password = 'хеш' WHERE username = 'admin';
```

---

## 📁 Структура проєкту

```
techua/
├── server.js          — головний файл сервера
├── db.js              — підключення до MySQL
├── schema.sql         — структура бази даних
├── package.json
├── middleware/
│   └── auth.js        — перевірка авторизації
├── routes/
│   ├── admin.js       — адмін-панель
│   └── api.js         — публічне API
└── public/            — статичні файли
    ├── index.html
    ├── catalog.html
    ├── articles.html
    ├── about.html
    ├── contact.html
    ├── style.css
    └── script.js
```

---

## 🛠️ API ендпоінти

| Метод | URL | Опис |
|-------|-----|------|
| GET | /api/articles | Всі статті |
| GET | /api/articles/:id | Одна стаття |
| GET | /api/products | Весь каталог |
| GET | /api/products?category=phone | Фільтр по категорії |

---

## ⚙️ Налаштування

Якщо потрібно змінити дані БД — відредагуй файл `db.js`:
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '26091017',
  database: 'TechUA',
});
```
