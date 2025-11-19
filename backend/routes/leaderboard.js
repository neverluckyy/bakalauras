const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get top 10 users by XP
router.get('/', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT 
      id,
      display_name,
      email,
      avatar_key,
      total_xp as xp,
      level
    FROM users
    ORDER BY total_xp DESC, level DESC
    LIMIT 10
  `;

  db.all(query, (err, leaderboard) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(leaderboard || []);
  });
});

module.exports = router;
