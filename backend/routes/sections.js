const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get section details
router.get('/:sectionId', authenticateToken, (req, res) => {
  const { sectionId } = req.params;
  const db = getDatabase();
  
  const query = `
    SELECT 
      s.id,
      s.name,
      s.display_name,
      s.description,
      s.order_index,
      s.module_id,
      m.name as module_name,
      m.display_name as module_display_name
    FROM sections s
    JOIN modules m ON s.module_id = m.id
    WHERE s.id = ?
  `;

  db.get(query, [sectionId], (err, section) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(section);
  });
});

// Get questions for a section
router.get('/:sectionId/questions', authenticateToken, (req, res) => {
  const { sectionId } = req.params;
  const db = getDatabase();
  
  const query = `
    SELECT 
      id,
      question_text,
      options,
      correct_answer,
      explanation,
      question_type
    FROM questions
    WHERE section_id = ?
    ORDER BY id
  `;

  db.all(query, [sectionId], (err, questions) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Parse options JSON for each question
    const questionsWithParsedOptions = questions.map(q => {
      try {
        return {
          ...q,
          options: JSON.parse(q.options || '[]')
        };
      } catch (parseError) {
        console.error('Error parsing options for question:', q.id, parseError);
        return {
          ...q,
          options: []
        };
      }
    });

    res.json(questionsWithParsedOptions);
  });
});

// Mark section as learned
router.post('/:sectionId/learn', authenticateToken, (req, res) => {
  const { sectionId } = req.params;
  const userId = req.user.id;
  const db = getDatabase();
  
  // For now, just return success
  // In a real implementation, you might track learning progress
  res.json({ success: true, message: 'Section marked as learned' });
});

// Submit quiz results
router.post('/:sectionId/quiz', authenticateToken, async (req, res) => {
  const { sectionId } = req.params;
  const { answers, score, totalQuestions } = req.body;
  const userId = req.user.id;
  const db = getDatabase();
  
  try {
    // Get all questions for this section
    const questions = await new Promise((resolve, reject) => {
      db.all('SELECT id, correct_answer FROM questions WHERE section_id = ?', [sectionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Calculate XP earned (simple formula)
    const percentage = (score / totalQuestions) * 100;
    const xpEarned = Math.round((percentage / 100) * 50); // Max 50 XP per quiz
    
    // Store each answer in user_progress table
    for (const [questionIndex, selectedAnswer] of Object.entries(answers)) {
      const questionId = questions[parseInt(questionIndex)].id;
      const correctAnswer = questions[parseInt(questionIndex)].correct_answer;
      const isCorrect = selectedAnswer === correctAnswer;
      const questionXP = isCorrect ? 10 : 0; // 10 XP per correct answer

      await new Promise((resolve, reject) => {
        // First check if there's existing progress for this question
        db.get(
          'SELECT is_correct FROM user_progress WHERE user_id = ? AND question_id = ?',
          [userId, questionId],
          function(err, existingProgress) {
            if (err) {
              reject(err);
              return;
            }

            // Only update if:
            // 1. No previous answer exists, OR
            // 2. The new answer is correct (preserve correct answers, allow improvement)
            if (!existingProgress || isCorrect) {
              db.run(
                'INSERT OR REPLACE INTO user_progress (user_id, question_id, is_correct, selected_answer, xp_awarded) VALUES (?, ?, ?, ?, ?)',
                [userId, questionId, isCorrect, selectedAnswer, questionXP],
                function(err) {
                  if (err) reject(err);
                  else resolve();
                }
              );
            } else {
              // Don't update if we already have a correct answer and the new one is wrong
              resolve();
            }
          }
        );
      });
    }
    
    // Update user XP and level
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET total_xp = total_xp + ?, level = FLOOR((total_xp + ?) / 100) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [xpEarned, xpEarned, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Get updated user stats
    const userStats = await new Promise((resolve, reject) => {
      db.get('SELECT total_xp, level FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json({ 
      success: true, 
      xpEarned,
      newTotalXP: userStats.total_xp,
      newLevel: userStats.level,
      message: `Quiz completed! You earned ${xpEarned} XP.`
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
