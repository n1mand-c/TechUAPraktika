const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const adminIds = (process.env.TELEGRAM_ADMIN_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);
const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

let bot = null;

async function createBotTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS telegram_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chat_id VARCHAR(50) NOT NULL UNIQUE,
      username VARCHAR(100),
      first_name VARCHAR(100),
      subscribed BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function botAvailable() {
  return bot !== null;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMarkdown(text) {
  return String(text || '').replace(/([_\*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

async function setupBot() {
  if (!token) {
    console.warn('⚠️ Telegram bot не налаштовано. Встановіть TELEGRAM_BOT_TOKEN.');
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start|\/help/, (msg) => {
    const text = `Привіт, ${msg.from.first_name || 'друг'}! \n\n` +
      'Я — офіційний бот TechUA.\n' +
      'Команди:\n' +
      '/subscribe — підписатися на нові статті\n' +
      '/unsubscribe — відписатися\n' +
      '/help — показати цю підказку';
    bot.sendMessage(msg.chat.id, text);
  });

  bot.onText(/\/subscribe/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      await db.execute(
        `INSERT INTO telegram_subscribers (chat_id, username, first_name)
         VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE subscribed = TRUE, username = VALUES(username), first_name = VALUES(first_name)`,
        [chatId, msg.from.username || null, msg.from.first_name || null]
      );
      await bot.sendMessage(chatId, '✅ Ви успішно підписані на нові статті TechUA.');
    } catch (err) {
      console.error('Telegram subscribe error:', err.message);
      await bot.sendMessage(chatId, '❌ Не вдалося підписатися, спробуйте пізніше.');
    }
  });

  bot.onText(/\/unsubscribe/, async (msg) => {
    const chatId = String(msg.chat.id);
    try {
      await db.execute(
        'UPDATE telegram_subscribers SET subscribed = FALSE WHERE chat_id = ?',
        [chatId]
      );
      await bot.sendMessage(chatId, '✅ Ви відписані від оновлень TechUA.');
    } catch (err) {
      console.error('Telegram unsubscribe error:', err.message);
      await bot.sendMessage(chatId, '❌ Не вдалося відписатися, спробуйте пізніше.');
    }
  });

  bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    bot.sendMessage(msg.chat.id, 'Використайте /subscribe або /unsubscribe. Для допомоги введіть /help.');
  });

  console.log('✅ Telegram бот запущено.');
  console.log('ℹ️ Адміністратори для повідомлень:', adminIds);
}

async function notifyAdmins(text) {
  if (!botAvailable()) return;
  for (const id of adminIds) {
    try {
      await bot.sendMessage(id, text, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('Помилка надсилання адміну:', id, err.message);
    }
  }
}

async function notifySubscribers(article) {
  if (!botAvailable()) return;
  try {
    const [rows] = await db.execute(
      'SELECT chat_id FROM telegram_subscribers WHERE subscribed = TRUE'
    );
    if (!rows.length) return;

    const message = `🆕 Нова стаття на TechUA:\n*${escapeMarkdown(article.title)}*\n${escapeMarkdown(article.excerpt || '')}\n\n` +
      `Категорія: ${escapeMarkdown(article.category)}\n` +
      `Читати: ${siteUrl}/article.html?id=${article.id}`;

    for (const row of rows) {
      try {
        await bot.sendMessage(row.chat_id, message, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('Помилка надсилання підписнику:', row.chat_id, err.message);
      }
    }
  } catch (err) {
    console.error('Помилка при надсиланні статті підписникам:', err.message);
  }
}

module.exports = {
  createBotTables,
  setupBot,
  notifyAdmins,
  notifySubscribers,
};
