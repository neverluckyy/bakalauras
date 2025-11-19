const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== MODULES ====================

// Get all modules (admin view)
router.get('/modules', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      m.id,
      m.name,
      m.display_name,
      m.description,
      m.order_index,
      COUNT(DISTINCT s.id) as section_count,
      COUNT(DISTINCT q.id) as question_count
    FROM modules m
    LEFT JOIN sections s ON m.id = s.module_id
    LEFT JOIN questions q ON s.id = q.section_id
    GROUP BY m.id
    ORDER BY m.order_index
  `, (err, modules) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(modules);
  });
});

// Get single module
router.get('/modules/:id', (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT * FROM modules WHERE id = ?', [req.params.id], (err, module) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(module);
  });
});

// Create module
router.post('/modules', (req, res) => {
  const { name, display_name, description, order_index } = req.body;
  
  if (!name || !display_name || order_index === undefined) {
    return res.status(400).json({ error: 'Name, display_name, and order_index are required' });
  }
  
  const db = getDatabase();
  db.run(
    'INSERT INTO modules (name, display_name, description, order_index) VALUES (?, ?, ?, ?)',
    [name, display_name, description || null, order_index],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Module with this name already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Module created successfully' });
    }
  );
});

// Update module
router.put('/modules/:id', (req, res) => {
  const { name, display_name, description, order_index } = req.body;
  
  if (!name || !display_name || order_index === undefined) {
    return res.status(400).json({ error: 'Name, display_name, and order_index are required' });
  }
  
  const db = getDatabase();
  db.run(
    'UPDATE modules SET name = ?, display_name = ?, description = ?, order_index = ? WHERE id = ?',
    [name, display_name, description || null, order_index, req.params.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Module with this name already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }
      res.json({ message: 'Module updated successfully' });
    }
  );
});

// Delete module
router.delete('/modules/:id', (req, res) => {
  const db = getDatabase();
  
  // Check if module has sections
  db.get('SELECT COUNT(*) as count FROM sections WHERE module_id = ?', [req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete module with existing sections' });
    }
    
    db.run('DELETE FROM modules WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }
      res.json({ message: 'Module deleted successfully' });
    });
  });
});

// ==================== SECTIONS ====================

// Get all sections for a module
router.get('/modules/:moduleId/sections', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      s.*,
      COUNT(DISTINCT q.id) as question_count,
      COUNT(DISTINCT lc.id) as content_count
    FROM sections s
    LEFT JOIN questions q ON s.id = q.section_id
    LEFT JOIN learning_content lc ON s.id = lc.section_id
    WHERE s.module_id = ?
    GROUP BY s.id
    ORDER BY s.order_index
  `, [req.params.moduleId], (err, sections) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(sections);
  });
});

// Get single section
router.get('/sections/:id', (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT * FROM sections WHERE id = ?', [req.params.id], (err, section) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json(section);
  });
});

// Create section
router.post('/sections', (req, res) => {
  const { module_id, name, display_name, description, order_index } = req.body;
  
  if (!module_id || !name || !display_name || order_index === undefined) {
    return res.status(400).json({ error: 'module_id, name, display_name, and order_index are required' });
  }
  
  const db = getDatabase();
  db.run(
    'INSERT INTO sections (module_id, name, display_name, description, order_index) VALUES (?, ?, ?, ?, ?)',
    [module_id, name, display_name, description || null, order_index],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Section with this name or order_index already exists in this module' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Section created successfully' });
    }
  );
});

// Update section
router.put('/sections/:id', (req, res) => {
  const { name, display_name, description, order_index } = req.body;
  
  if (!name || !display_name || order_index === undefined) {
    return res.status(400).json({ error: 'Name, display_name, and order_index are required' });
  }
  
  const db = getDatabase();
  db.run(
    'UPDATE sections SET name = ?, display_name = ?, description = ?, order_index = ? WHERE id = ?',
    [name, display_name, description || null, order_index, req.params.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Section with this name or order_index already exists in this module' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Section not found' });
      }
      res.json({ message: 'Section updated successfully' });
    }
  );
});

// Delete section
router.delete('/sections/:id', (req, res) => {
  const db = getDatabase();
  
  // Check if section has questions or content
  db.get(`
    SELECT 
      (SELECT COUNT(*) FROM questions WHERE section_id = ?) as question_count,
      (SELECT COUNT(*) FROM learning_content WHERE section_id = ?) as content_count
  `, [req.params.id, req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.question_count > 0 || result.content_count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete section with existing questions or learning content',
        question_count: result.question_count,
        content_count: result.content_count
      });
    }
    
    db.run('DELETE FROM sections WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Section not found' });
      }
      res.json({ message: 'Section deleted successfully' });
    });
  });
});

// ==================== QUESTIONS ====================

// Get all questions for a section
router.get('/sections/:sectionId/questions', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      id,
      section_id,
      question_text,
      options,
      correct_answer,
      explanation,
      question_type
    FROM questions
    WHERE section_id = ?
    ORDER BY id
  `, [req.params.sectionId], (err, questions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse options JSON
    const questionsWithParsedOptions = questions.map(q => {
      try {
        return {
          ...q,
          options: JSON.parse(q.options || '[]')
        };
      } catch (e) {
        return {
          ...q,
          options: []
        };
      }
    });
    
    res.json(questionsWithParsedOptions);
  });
});

// Get single question
router.get('/questions/:id', (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT * FROM questions WHERE id = ?', [req.params.id], (err, question) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Parse options
    try {
      question.options = JSON.parse(question.options || '[]');
    } catch (e) {
      question.options = [];
    }
    
    res.json(question);
  });
});

// Create question
router.post('/questions', (req, res) => {
  const { section_id, question_text, options, correct_answer, explanation, question_type } = req.body;
  
  if (!section_id || !question_text || !options || !correct_answer || !explanation) {
    return res.status(400).json({ error: 'section_id, question_text, options, correct_answer, and explanation are required' });
  }
  
  // Validate options is an array
  let optionsArray;
  if (Array.isArray(options)) {
    optionsArray = options;
  } else {
    return res.status(400).json({ error: 'options must be an array' });
  }
  
  // Validate correct_answer is in options
  if (!optionsArray.includes(correct_answer)) {
    return res.status(400).json({ error: 'correct_answer must be one of the options' });
  }
  
  const db = getDatabase();
  db.run(
    'INSERT INTO questions (section_id, question_text, options, correct_answer, explanation, question_type) VALUES (?, ?, ?, ?, ?, ?)',
    [section_id, question_text, JSON.stringify(optionsArray), correct_answer, explanation, question_type || 'multiple_choice'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Question created successfully' });
    }
  );
});

// Update question
router.put('/questions/:id', (req, res) => {
  const { question_text, options, correct_answer, explanation, question_type } = req.body;
  
  if (!question_text || !options || !correct_answer || !explanation) {
    return res.status(400).json({ error: 'question_text, options, correct_answer, and explanation are required' });
  }
  
  // Validate options is an array
  let optionsArray;
  if (Array.isArray(options)) {
    optionsArray = options;
  } else {
    return res.status(400).json({ error: 'options must be an array' });
  }
  
  // Validate correct_answer is in options
  if (!optionsArray.includes(correct_answer)) {
    return res.status(400).json({ error: 'correct_answer must be one of the options' });
  }
  
  const db = getDatabase();
  db.run(
    'UPDATE questions SET question_text = ?, options = ?, correct_answer = ?, explanation = ?, question_type = ? WHERE id = ?',
    [question_text, JSON.stringify(optionsArray), correct_answer, explanation, question_type || 'multiple_choice', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }
      res.json({ message: 'Question updated successfully' });
    }
  );
});

// Delete question
router.delete('/questions/:id', (req, res) => {
  const db = getDatabase();
  
  db.run('DELETE FROM questions WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  });
});

// ==================== LEARNING CONTENT ====================

// Get all learning content for a section
router.get('/sections/:sectionId/learning-content', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT *
    FROM learning_content
    WHERE section_id = ?
    ORDER BY order_index
  `, [req.params.sectionId], (err, content) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(content);
  });
});

// Get single learning content
router.get('/learning-content/:id', (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT * FROM learning_content WHERE id = ?', [req.params.id], (err, content) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!content) {
      return res.status(404).json({ error: 'Learning content not found' });
    }
    res.json(content);
  });
});

// Create learning content
router.post('/learning-content', (req, res) => {
  const { section_id, screen_title, read_time_min, content_markdown, order_index } = req.body;
  
  if (!section_id || !screen_title || read_time_min === undefined || !content_markdown || order_index === undefined) {
    return res.status(400).json({ error: 'section_id, screen_title, read_time_min, content_markdown, and order_index are required' });
  }
  
  const db = getDatabase();
  db.run(
    'INSERT INTO learning_content (section_id, screen_title, read_time_min, content_markdown, order_index) VALUES (?, ?, ?, ?, ?)',
    [section_id, screen_title, read_time_min, content_markdown, order_index],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Learning content with this screen_title or order_index already exists in this section' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Learning content created successfully' });
    }
  );
});

// Update learning content
router.put('/learning-content/:id', (req, res) => {
  const { screen_title, read_time_min, content_markdown, order_index } = req.body;
  
  if (!screen_title || read_time_min === undefined || !content_markdown || order_index === undefined) {
    return res.status(400).json({ error: 'screen_title, read_time_min, content_markdown, and order_index are required' });
  }
  
  const db = getDatabase();
  db.run(
    'UPDATE learning_content SET screen_title = ?, read_time_min = ?, content_markdown = ?, order_index = ? WHERE id = ?',
    [screen_title, read_time_min, content_markdown, order_index, req.params.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Learning content with this screen_title or order_index already exists in this section' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Learning content not found' });
      }
      res.json({ message: 'Learning content updated successfully' });
    }
  );
});

// Delete learning content
router.delete('/learning-content/:id', (req, res) => {
  const db = getDatabase();
  
  db.run('DELETE FROM learning_content WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Learning content not found' });
    }
    res.json({ message: 'Learning content deleted successfully' });
  });
});

// ==================== USERS ====================

// Get all users
router.get('/users', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      id,
      email,
      display_name,
      avatar_key,
      total_xp,
      level,
      is_admin,
      created_at,
      updated_at
    FROM users
    ORDER BY created_at DESC
  `, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

// Update user (promote to admin, etc.)
router.put('/users/:id', (req, res) => {
  const { is_admin } = req.body;
  
  if (is_admin === undefined) {
    return res.status(400).json({ error: 'is_admin is required' });
  }
  
  const db = getDatabase();
  db.run(
    'UPDATE users SET is_admin = ? WHERE id = ?',
    [is_admin ? 1 : 0, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User updated successfully' });
    }
  );
});

// Get user statistics
router.get('/stats', (req, res) => {
  const db = getDatabase();
  
  db.get(`
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM modules) as total_modules,
      (SELECT COUNT(*) FROM sections) as total_sections,
      (SELECT COUNT(*) FROM questions) as total_questions,
      (SELECT COUNT(*) FROM learning_content) as total_content,
      (SELECT COUNT(*) FROM users WHERE is_admin = 1) as admin_count
  `, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

module.exports = router;

