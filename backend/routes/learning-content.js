const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get learning content for a specific section
router.get('/section/:sectionId', authenticateToken, (req, res) => {
  const { sectionId } = req.params;
  const db = getDatabase();
  
  const query = `
    SELECT 
      lc.id,
      lc.screen_title,
      lc.read_time_min,
      lc.content_markdown,
      lc.order_index,
      s.display_name as section_name,
      m.display_name as module_name
    FROM learning_content lc
    JOIN sections s ON lc.section_id = s.id
    JOIN modules m ON s.module_id = m.id
    WHERE lc.section_id = ?
    ORDER BY lc.order_index
  `;

  db.all(query, [sectionId], (err, content) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!content || content.length === 0) {
      return res.status(404).json({ error: 'Learning content not found for this section' });
    }

    res.json(content);
  });
});

// Mark learning content as completed
router.post('/:contentId/complete', authenticateToken, (req, res) => {
  const { contentId } = req.params;
  const userId = req.user.id;
  const db = getDatabase();
  
  const query = `
    INSERT OR REPLACE INTO user_learning_progress 
    (user_id, learning_content_id, completed, completed_at) 
    VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
  `;

  db.run(query, [userId, contentId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ 
      success: true, 
      message: 'Learning content marked as completed' 
    });
  });
});

// Get user's learning progress for a section
router.get('/section/:sectionId/progress', authenticateToken, (req, res) => {
  const { sectionId } = req.params;
  const userId = req.user.id;
  const db = getDatabase();
  
  const query = `
    SELECT 
      lc.id,
      lc.screen_title,
      ulp.completed,
      ulp.completed_at
    FROM learning_content lc
    LEFT JOIN user_learning_progress ulp ON lc.id = ulp.learning_content_id AND ulp.user_id = ?
    WHERE lc.section_id = ?
    ORDER BY lc.order_index
  `;

  db.all(query, [userId, sectionId], (err, progress) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const completedCount = progress.filter(p => p.completed).length;
    const totalCount = progress.length;
    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    res.json({
      progress,
      completedCount,
      totalCount,
      completionPercentage
    });
  });
});

module.exports = router;
