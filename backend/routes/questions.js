const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get next unanswered question for a section
router.get('/sections/:sectionId/next', authenticateToken, (req, res) => {
  const { sectionId } = req.params;
  const db = getDatabase();
  
  const query = `
    SELECT 
      q.id,
      q.question_text,
      q.options,
      q.question_type
    FROM questions q
    WHERE q.section_id = ?
    AND q.id NOT IN (
      SELECT question_id 
      FROM user_progress 
      WHERE user_id = ?
    )
    ORDER BY q.id
    LIMIT 1
  `;

  db.get(query, [sectionId, req.user.id], (err, question) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!question) {
      return res.status(404).json({ error: 'No more questions available for this section' });
    }

    // Parse options JSON
    try {
      question.options = JSON.parse(question.options);
    } catch (e) {
      console.error('Error parsing options:', e);
      return res.status(500).json({ error: 'Invalid question data' });
    }

    res.json({ question });
  });
});

// Get specific question (without correct answer)
router.get('/:questionId', authenticateToken, (req, res) => {
  const { questionId } = req.params;
  const db = getDatabase();
  
  const query = `
    SELECT 
      q.id,
      q.question_text,
      q.options,
      q.question_type,
      s.display_name as section_name,
      m.display_name as module_name
    FROM questions q
    JOIN sections s ON q.section_id = s.id
    JOIN modules m ON s.module_id = m.id
    WHERE q.id = ?
  `;

  db.get(query, [questionId], (err, question) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Parse options JSON
    try {
      question.options = JSON.parse(question.options);
    } catch (e) {
      console.error('Error parsing options:', e);
      return res.status(500).json({ error: 'Invalid question data' });
    }

    res.json({ question });
  });
});

// Submit answer to a question
router.post('/:questionId/answer', authenticateToken, async (req, res) => {
  const { questionId } = req.params;
  const { selectedIndex } = req.body;

  if (selectedIndex === undefined || selectedIndex < 0) {
    return res.status(400).json({ error: 'Valid selectedIndex is required' });
  }

  const db = getDatabase();
  
  // Get question details
  db.get(
    'SELECT id, section_id, options, correct_answer, explanation FROM questions WHERE id = ?',
    [questionId],
    async (err, question) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Parse options to get the selected answer
      let options;
      try {
        options = JSON.parse(question.options);
      } catch (e) {
        console.error('Error parsing options:', e);
        return res.status(500).json({ error: 'Invalid question data' });
      }

      if (selectedIndex >= options.length) {
        return res.status(400).json({ error: 'Invalid selectedIndex' });
      }

      const selectedAnswer = options[selectedIndex];
      const isCorrect = selectedAnswer === question.correct_answer;
      const xpAwarded = isCorrect ? 10 : 0;

      // Check if there's existing progress for this question
      db.get(
        'SELECT is_correct FROM user_progress WHERE user_id = ? AND question_id = ?',
        [req.user.id, questionId],
        function(err, existingProgress) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to check existing progress' });
          }

          // Only update if:
          // 1. No previous answer exists, OR
          // 2. The new answer is correct (preserve correct answers, allow improvement)
          if (!existingProgress || isCorrect) {
            db.run(
              'INSERT OR REPLACE INTO user_progress (user_id, question_id, is_correct, selected_answer, xp_awarded) VALUES (?, ?, ?, ?, ?)',
              [req.user.id, questionId, isCorrect, selectedAnswer, xpAwarded],
              function(err) {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Failed to save progress' });
                }

                // Update user's total XP and level
                db.run(
                  'UPDATE users SET total_xp = total_xp + ?, level = FLOOR((total_xp + ?) / 100) + 1 WHERE id = ?',
                  [xpAwarded, xpAwarded, req.user.id],
                  (err) => {
                    if (err) {
                      console.error('Database error:', err);
                      return res.status(500).json({ error: 'Failed to update user stats' });
                    }

                    // Get updated user stats
                    db.get(
                      'SELECT total_xp, level FROM users WHERE id = ?',
                      [req.user.id],
                      (err, userStats) => {
                        if (err) {
                          console.error('Database error:', err);
                          return res.status(500).json({ error: 'Failed to get user stats' });
                        }

                        // Get section progress
                        db.get(
                          `SELECT 
                            COUNT(*) as total_questions,
                            SUM(CASE WHEN up.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
                          FROM questions q
                          LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = ?
                          WHERE q.section_id = ?`,
                          [req.user.id, question.section_id],
                          (err, sectionProgress) => {
                            if (err) {
                              console.error('Database error:', err);
                              return res.status(500).json({ error: 'Failed to get section progress' });
                            }

                            const response = {
                              isCorrect,
                              correctAnswer: question.correct_answer,
                              explanation: question.explanation,
                              xpAwarded,
                              totalXp: userStats.total_xp,
                              newLevel: userStats.level,
                              sectionProgress: {
                                totalQuestions: sectionProgress.total_questions,
                                correctAnswers: sectionProgress.correct_answers,
                                percentage: sectionProgress.total_questions > 0 
                                  ? Math.round((sectionProgress.correct_answers / sectionProgress.total_questions) * 100)
                                  : 0
                              }
                            };

                            res.json(response);
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          } else {
            // Don't update if we already have a correct answer and the new one is wrong
            // Just return the existing result without updating
            res.json({
              isCorrect: existingProgress.is_correct,
              correctAnswer: question.correct_answer,
              explanation: question.explanation,
              xpAwarded: 0, // No XP awarded for not updating
              message: 'Answer not updated - you already have a correct answer for this question'
            });
          }
        }
      );
    }
  );
});

module.exports = router;
