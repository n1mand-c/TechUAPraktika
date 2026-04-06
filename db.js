const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '26091017',
  database: 'TechUA',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

// Перевірка підключення при старті
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Помилка підключення до MySQL:', err.message);
    return;
  }
  console.log('✅ MySQL підключено успішно');
  connection.release();
});

module.exports = promisePool;
