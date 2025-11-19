const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { authenticateToken, getUserProfile } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name, avatar_key } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDatabase();
    
    if (!db) {
      console.error('Database connection is null');
      return res.status(500).json({ error: 'Database connection error' });
    }
    
    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        console.error('Database query error in register:', err);
        return res.status(500).json({ error: 'Database error', message: err.message });
      }
      
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      db.run(
        'INSERT INTO users (email, password_hash, display_name, avatar_key) VALUES (?, ?, ?, ?)',
        [email, passwordHash, display_name || email.split('@')[0], avatar_key || 'robot_coral'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;
          
          // Generate JWT token
          const token = jwt.sign(
            { id: userId, email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );

          // Set HTTP-only cookie
          res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Set to false for development
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
          });

          res.status(201).json({
            message: 'User created successfully',
            user: {
              id: userId,
              email,
              display_name: display_name || email.split('@')[0],
              avatar_key: avatar_key || 'robot_coral',
              total_xp: 0,
              level: 1
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Registration error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error', message: error.message });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDatabase();
    
    if (!db) {
      console.error('Database connection is null');
      return res.status(500).json({ error: 'Database connection error' });
    }
    
    db.get(
      'SELECT id, email, password_hash, display_name, avatar_key, total_xp, level, is_admin FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          console.error('Database query error in login:', err);
          return res.status(500).json({ error: 'Database error', message: err.message });
        }
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Set HTTP-only cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: false, // Set to false for development
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            avatar_key: user.avatar_key,
            total_xp: user.total_xp,
            level: user.level,
            is_admin: user.is_admin || 0
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    console.error('Login error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error', message: error.message });
    }
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user profile
router.get('/me', authenticateToken, getUserProfile, (req, res) => {
  res.json({
    user: req.userProfile
  });
});

module.exports = router;
