const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user statistics
router.get('/stats', authenticateToken, (req, res) => {
  const db = getDatabase();
  const userId = req.user.id;
  
  // Get basic stats
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT up.question_id) as questions_answered,
      SUM(CASE WHEN up.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
      SUM(up.xp_awarded) as total_xp_earned
    FROM user_progress up
    WHERE up.user_id = ?
  `;

  // Get completed modules count
  const modulesCompletedQuery = `
    SELECT COUNT(DISTINCT m.id) as modules_completed
    FROM modules m
    WHERE NOT EXISTS (
      SELECT 1
      FROM sections s
      WHERE s.module_id = m.id
      AND (
        SELECT COUNT(DISTINCT q.id)
        FROM questions q
        WHERE q.section_id = s.id
      ) > 0
      AND (
        SELECT COUNT(DISTINCT q2.id)
        FROM questions q2
        LEFT JOIN user_progress up ON q2.id = up.question_id AND up.user_id = ?
        WHERE q2.section_id = s.id AND up.is_correct = 1
      ) * 1.0 / (
        SELECT COUNT(DISTINCT q3.id)
        FROM questions q3
        WHERE q3.section_id = s.id
      ) < 0.8
    )
  `;

  // Get completed sections count
  const sectionsCompletedQuery = `
    SELECT COUNT(DISTINCT s.id) as sections_completed
    FROM sections s
    WHERE (
      SELECT COUNT(DISTINCT q.id)
      FROM questions q
      WHERE q.section_id = s.id
    ) > 0
    AND (
      SELECT COUNT(DISTINCT q2.id)
      FROM questions q2
      LEFT JOIN user_progress up ON q2.id = up.question_id AND up.user_id = ?
      WHERE q2.section_id = s.id AND up.is_correct = 1
    ) * 1.0 / (
      SELECT COUNT(DISTINCT q3.id)
      FROM questions q3
      WHERE q3.section_id = s.id
    ) >= 0.8
  `;

  // Get quizzes passed count (sections where user got 80% or more questions correct)
  const quizzesPassedQuery = `
    SELECT COUNT(DISTINCT s.id) as quizzes_passed
    FROM sections s
    WHERE (
      SELECT COUNT(DISTINCT q.id)
      FROM questions q
      WHERE q.section_id = s.id
    ) > 0
    AND (
      SELECT COUNT(DISTINCT q2.id)
      FROM questions q2
      LEFT JOIN user_progress up ON q2.id = up.question_id AND up.user_id = ?
      WHERE q2.section_id = s.id AND up.is_correct = 1
    ) >= (
      SELECT COUNT(DISTINCT q.id) * 0.8
      FROM questions q
      WHERE q.section_id = s.id
    )
  `;

  // Get days active (count of unique days user answered questions)
  const daysActiveQuery = `
    SELECT COUNT(DISTINCT DATE(up.answered_at)) as days_active
    FROM user_progress up
    WHERE up.user_id = ?
  `;

  db.get(statsQuery, [userId], (err, stats) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get completed modules count
    db.get(modulesCompletedQuery, [userId], (err, modulesResult) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get completed sections count
      db.all(sectionsCompletedQuery, [userId], (err, sectionsResult) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Get quizzes passed count
        db.all(quizzesPassedQuery, [userId], (err, quizzesResult) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Get days active count
          db.get(daysActiveQuery, [userId], (err, daysResult) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            const modulesCompleted = modulesResult?.modules_completed || 0;
            const sectionsCompleted = sectionsResult?.length || 0;
            const quizzesPassed = quizzesResult?.length || 0;
            const daysActive = daysResult?.days_active || 0;

            res.json({
              modulesCompleted,
              sectionsCompleted,
              quizzesPassed,
              daysActive,
              totalQuestionsAnswered: stats?.questions_answered || 0,
              totalCorrectAnswers: stats?.correct_answers || 0,
              totalXPEarned: stats?.total_xp_earned || 0
            });
          });
        });
      });
    });
  });
});

// Get user achievements
router.get('/achievements', authenticateToken, (req, res) => {
  const db = getDatabase();
  const userId = req.user.id;
  
  // Get user's XP and level
  const userQuery = `SELECT total_xp, level FROM users WHERE id = ?`;
  
  db.get(userQuery, [userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Define achievements based on user progress
    const achievements = [
      {
        id: 1,
        title: 'First Steps',
        description: 'Complete your first quiz',
        earned: (user?.total_xp || 0) > 0,
        earnedAt: user?.total_xp > 0 ? new Date().toISOString() : null
      },
      {
        id: 2,
        title: 'Knowledge Seeker',
        description: 'Reach Level 5',
        earned: (user?.level || 0) >= 5,
        earnedAt: user?.level >= 5 ? new Date().toISOString() : null
      },
      {
        id: 3,
        title: 'Security Enthusiast',
        description: 'Reach Level 10',
        earned: (user?.level || 0) >= 10,
        earnedAt: user?.level >= 10 ? new Date().toISOString() : null
      },
      {
        id: 4,
        title: 'XP Collector',
        description: 'Earn 500 XP',
        earned: (user?.total_xp || 0) >= 500,
        earnedAt: user?.total_xp >= 500 ? new Date().toISOString() : null
      },
      {
        id: 5,
        title: 'Quiz Master',
        description: 'Answer 50 questions correctly',
        earned: false, // This would need to be calculated from user_progress
        earnedAt: null
      }
    ];

    res.json(achievements);
  });
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
  const db = getDatabase();
  const userId = req.user.id;
  const { display_name, email, avatar_key } = req.body;

  // Validate input
  if (!display_name || !email) {
    return res.status(400).json({ error: 'Display name and email are required' });
  }

  // Check if email is already taken by another user
  const emailCheckQuery = `SELECT id FROM users WHERE email = ? AND id != ?`;
  
  db.get(emailCheckQuery, [email, userId], (err, existingUser) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken' });
    }

    // Update user profile
    const updateQuery = `
      UPDATE users 
      SET display_name = ?, email = ?, avatar_key = ?
      WHERE id = ?
    `;

    db.run(updateQuery, [display_name, email, avatar_key || 'robot_coral', userId], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      // Get updated user data
      const getUserQuery = `SELECT id, email, display_name, avatar_key, total_xp, level FROM users WHERE id = ?`;
      
      db.get(getUserQuery, [userId], (err, updatedUser) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to retrieve updated user data' });
        }

        res.json({ 
          message: 'Profile updated successfully',
          user: updatedUser
        });
      });
    });
  });
});

module.exports = router;
