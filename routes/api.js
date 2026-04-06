const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/articles — всі статті
router.get('/articles', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, category, excerpt, author, read_time, emoji, gradient, created_at FROM articles WHERE published = 1 ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/:id — одна стаття
router.get('/articles/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM articles WHERE id = ? AND published = 1', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не знайдено' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products — каталог
router.get('/products', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM products WHERE published = 1';
    const params = [];
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
