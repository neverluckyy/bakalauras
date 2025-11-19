const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all modules with completion data
router.get('/', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT 
      m.id,
      m.name,
      m.display_name,
      m.description,
      m.order_index,
      COUNT(s.id) as section_count,
      (
        SELECT COUNT(DISTINCT s2.id)
        FROM sections s2
        LEFT JOIN questions q ON s2.id = q.section_id
        WHERE s2.module_id = m.id AND q.id IS NOT NULL AND (
          SELECT COUNT(DISTINCT q2.id)
          FROM questions q2
          WHERE q2.section_id = s2.id
        ) > 0 AND (
          SELECT COUNT(DISTINCT q3.id)
          FROM questions q3
          LEFT JOIN user_progress up ON q3.id = up.question_id AND up.user_id = ?
          WHERE q3.section_id = s2.id AND up.is_correct = 1
        ) * 1.0 / (
          SELECT COUNT(DISTINCT q4.id)
          FROM questions q4
          WHERE q4.section_id = s2.id
        ) >= 0.8
      ) as completed_sections
    FROM modules m
    LEFT JOIN sections s ON m.id = s.module_id
    GROUP BY m.id
    ORDER BY m.order_index
  `;

  db.all(query, [req.user.id], (err, modules) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate completion percentages
    const modulesWithProgress = modules.map(module => ({
      ...module,
      completion_percentage: module.section_count > 0 
        ? Math.round((module.completed_sections / module.section_count) * 100)
        : 0
    }));

    res.json(modulesWithProgress);
  });
});

// Get a single module by ID
router.get('/:moduleId', authenticateToken, (req, res) => {
  const { moduleId } = req.params;
  const db = getDatabase();
  
  const query = `
    SELECT 
      m.id,
      m.name,
      m.display_name as title,
      m.description,
      m.order_index,
      COUNT(s.id) as section_count,
      (
        SELECT COUNT(DISTINCT s2.id)
        FROM sections s2
        LEFT JOIN questions q ON s2.id = q.section_id
        WHERE s2.module_id = m.id AND q.id IS NOT NULL AND (
          SELECT COUNT(DISTINCT q2.id)
          FROM questions q2
          WHERE q2.section_id = s2.id
        ) > 0 AND (
          SELECT COUNT(DISTINCT q3.id)
          FROM questions q3
          LEFT JOIN user_progress up ON q3.id = up.question_id AND up.user_id = ?
          WHERE q3.section_id = s2.id AND up.is_correct = 1
        ) * 1.0 / (
          SELECT COUNT(DISTINCT q4.id)
          FROM questions q4
          WHERE q4.section_id = s2.id
        ) >= 0.8
      ) as completed_sections
    FROM modules m
    LEFT JOIN sections s ON m.id = s.module_id
    WHERE m.id = ?
    GROUP BY m.id
  `;

  db.get(query, [req.user.id, moduleId], (err, module) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Calculate completion percentage
    const moduleWithProgress = {
      ...module,
      completion_percentage: module.section_count > 0 
        ? Math.round((module.completed_sections / module.section_count) * 100)
        : 0
    };

    res.json(moduleWithProgress);
  });
});

// Get sections for a specific module
router.get('/:moduleId/sections', authenticateToken, (req, res) => {
  const { moduleId } = req.params;
  const db = getDatabase();
  
  const query = `
    SELECT DISTINCT
      s.id,
      s.name,
      s.display_name as title,
      s.description,
      s.order_index,
      COUNT(q.id) as question_count,
      (
        SELECT COUNT(*)
        FROM questions q2
        WHERE q2.section_id = s.id AND EXISTS (
          SELECT 1 FROM user_progress up 
          WHERE up.question_id = q2.id AND up.user_id = ? AND up.is_correct = 1
        )
      ) as correct_answers,
      (
        SELECT COUNT(*)
        FROM questions q3
        LEFT JOIN user_progress up2 ON q3.id = up2.question_id AND up2.user_id = ?
        WHERE q3.section_id = s.id
      ) as answered_questions
    FROM sections s
    LEFT JOIN questions q ON s.id = q.section_id
    WHERE s.module_id = ?
    GROUP BY s.id, s.name, s.display_name, s.description, s.order_index
    ORDER BY s.order_index
  `;

  db.all(query, [req.user.id, req.user.id, moduleId], (err, sections) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

          // Calculate completion and availability for each section
      const sectionsWithProgress = sections.map((section, index) => {
        // Section is completed if user scores 80% or more
        const completionThreshold = 0.8; // 80%
        const isCompleted = section.question_count > 0 && 
          (section.correct_answers / section.question_count) >= completionThreshold;
        
        // All sections are now available (section locking disabled)
        const isAvailable = true;
        
        return {
          ...section,
          completed: isCompleted,
          available: isAvailable,
          learned: section.answered_questions > 0, // Mark as learned if user has answered any questions
          completion_percentage: section.question_count > 0 
            ? Math.round((section.correct_answers / section.question_count) * 100)
            : 0,
          accuracy_percentage: section.answered_questions > 0 
            ? Math.round((section.correct_answers / section.answered_questions) * 100)
            : 0
        };
      });

    res.json(sectionsWithProgress);
  });
});

module.exports = router;
