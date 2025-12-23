const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../database/init');
const { authenticateToken, getUserProfile } = require('../middleware/auth');
const { validatePassword, validateEmail, validateDisplayName } = require('../utils/passwordValidation');
const { generateToken, sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

const router = express.Router();

// More lenient rate limiting for /me endpoint (called frequently for auth checks)
// Increased limit since this is a read-only operation and called on every page load
const meLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Much more lenient for read-only auth checks
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name, avatar_key, terms_accepted, privacy_accepted } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.errors[0] || 'Invalid email address' });
    }

    // Validate display name
    const displayNameValidation = validateDisplayName(display_name);
    if (!displayNameValidation.isValid) {
      return res.status(400).json({ error: displayNameValidation.errors[0] || 'Invalid display name' });
    }

    // Validate password with strength requirements
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.errors[0] || 'Password does not meet security requirements' });
    }

    // Validate consent
    if (!terms_accepted || !privacy_accepted) {
      return res.status(400).json({ error: 'You must accept the Terms of Use and Privacy Policy to register' });
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
        console.error('Error details:', JSON.stringify(err, null, 2));
        return res.status(500).json({ error: 'Database error', message: err.message });
      }
      
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Set consent information
      const termsVersion = '1.0'; // Current version of Terms of Use
      const privacyVersion = '1.0'; // Current version of Privacy Policy
      const consentTimestamp = new Date().toISOString();

      // Generate email verification token
      const verificationToken = generateToken();
      const verificationExpires = new Date();
      verificationExpires.setDate(verificationExpires.getDate() + 5); // 5 days

      const finalDisplayName = display_name || email.split('@')[0];

      // Validate and set avatar_key - only default if truly missing
      const validAvatars = ['robot_coral', 'robot_gold', 'robot_lavender', 'robot_mint', 'robot_sky'];
      const finalAvatarKey = (avatar_key && validAvatars.includes(avatar_key)) 
        ? avatar_key 
        : 'robot_coral';

      // Create user (email_verified defaults to 0/false)
      db.run(
        'INSERT INTO users (email, password_hash, display_name, avatar_key, terms_version, privacy_version, consent_timestamp, email_verified, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [email, passwordHash, finalDisplayName, finalAvatarKey, termsVersion, privacyVersion, consentTimestamp, 0, verificationToken, verificationExpires.toISOString()],
        async function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;
          
          // Send verification email
          const emailResult = await sendVerificationEmail(email, verificationToken, finalDisplayName);
          
          if (!emailResult.success) {
            console.error('Failed to send verification email:', emailResult.error);
            // Still return success, but inform user they need to verify
          }

          // Generate full JWT token - user can log in immediately
          const token = jwt.sign(
            { id: userId, email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );

          // Set HTTP-only cookie
          const isProduction = process.env.NODE_ENV === 'production';
          // Check if frontend and backend are on same domain (Railway deployment)
          const isSameOrigin = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
          res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            // Use 'lax' for same-origin (Railway), 'none' for cross-origin (Netlify)
            sameSite: (isProduction && !isSameOrigin) ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
          });

          res.status(201).json({
            message: 'Account created successfully. A verification email has been sent to your email address. Please verify your email within 5 days.',
            token: token,
            user: {
              id: userId,
              email,
              display_name: finalDisplayName,
              avatar_key: finalAvatarKey,
              total_xp: 0,
              level: 1,
              email_verified: false,
              email_verification_expires: verificationExpires.toISOString()
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
    
    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Use promise-based database query
    let user;
    try {
      user = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id, email, password_hash, display_name, avatar_key, total_xp, level, is_admin, email_verified FROM users WHERE email = ?',
          [email],
          (err, user) => {
            if (err) {
              console.error('Database query error in login:', err);
              reject(err);
            } else {
              resolve(user);
            }
          }
        );
      });
    } catch (dbError) {
      console.error('Database error in login:', dbError);
      return res.status(500).json({ error: 'Database error', message: dbError.message });
    }
    
    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`Login attempt for user: ${user.email} (ID: ${user.id})`);
    
    // Check if password_hash exists
    if (!user.password_hash) {
      console.error(`User ${user.email} has no password_hash`);
      return res.status(500).json({ error: 'Account error', message: 'Password not set for this account' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log(`Login attempt failed: Invalid password for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Allow login even if email is not verified (user has 5 days to verify)
    console.log(`Login successful for user: ${user.email}`);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    // Check if frontend and backend are on same domain (Railway deployment)
    const isSameOrigin = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      // Use 'lax' for same-origin (Railway), 'none' for cross-origin (Netlify)
      sameSite: (isProduction && !isSameOrigin) ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };
    
    res.cookie('token', token, cookieOptions);

    // Get email verification expiration if not verified
    let emailVerificationExpires = null;
    if (!user.email_verified) {
      const verificationData = await new Promise((resolve) => {
        db.get(
          'SELECT email_verification_expires FROM users WHERE id = ?',
          [user.id],
          (err, data) => {
            if (err) {
              console.error('Error fetching email verification expiration:', err);
              resolve(null);
            } else {
              resolve(data);
            }
          }
        );
      });
      
      if (verificationData) {
        emailVerificationExpires = verificationData.email_verification_expires;
      }
    }
    
    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_key: user.avatar_key,
        total_xp: user.total_xp,
        level: user.level,
        is_admin: user.is_admin || 0,
        email_verified: user.email_verified || 0,
        email_verification_expires: emailVerificationExpires
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Login error stack:', error.stack);
    if (!res.headersSent) {
      // Check if it's a database error
      if (error.message && error.message.includes('SQLITE')) {
        return res.status(500).json({ error: 'Database error', message: error.message });
      }
      return res.status(500).json({ error: 'Server error', message: error.message });
    }
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user profile
router.get('/me', meLimiter, authenticateToken, getUserProfile, (req, res) => {
  res.json({
    user: req.userProfile
  });
});

// Verify email address
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const db = getDatabase();
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Find user with this verification token
    db.get(
      'SELECT id, email, email_verification_expires FROM users WHERE email_verification_token = ?',
      [token],
      (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Check if token has expired
        const now = new Date();
        const expires = new Date(user.email_verification_expires);
        
        if (now > expires) {
          return res.status(400).json({ error: 'Verification token has expired' });
        }

        // Update user to verified
        db.run(
          'UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
          [user.id],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to verify email' });
            }

            res.json({
              message: 'Email verified successfully',
              verified: true
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDatabase();
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Find user
    db.get(
      'SELECT id, email, display_name, email_verified FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          // Don't reveal if user exists or not for security
          return res.json({
            message: 'If an account exists with this email, a verification email has been sent.'
          });
        }

        if (user.email_verified) {
          return res.status(400).json({ error: 'Email is already verified' });
        }

          // Generate new verification token
          const verificationToken = generateToken();
          const verificationExpires = new Date();
          verificationExpires.setDate(verificationExpires.getDate() + 5); // 5 days

        // Update user with new token
        db.run(
          'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
          [verificationToken, verificationExpires.toISOString(), user.id],
          async function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update verification token' });
            }

            // Send verification email
            const emailResult = await sendVerificationEmail(user.email, verificationToken, user.display_name);
            
            if (!emailResult.success) {
              console.error('Failed to send verification email:', emailResult.error);
              return res.status(500).json({ error: 'Failed to send verification email' });
            }

            res.json({
              message: 'Verification email sent successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDatabase();
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Find user
    db.get(
      'SELECT id, email, display_name FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Don't reveal if user exists or not for security
        // Always return success message
        if (user) {
          // Generate password reset token
          const resetToken = generateToken();
          const resetExpires = new Date();
          resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour

          // Update user with reset token
          db.run(
            'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
            [resetToken, resetExpires.toISOString(), user.id],
            async function(err) {
              if (err) {
                console.error('Database error:', err);
                // Still return success for security
              } else {
                // Send password reset email
                await sendPasswordResetEmail(user.email, resetToken, user.display_name);
              }
            }
          );
        }

        // Always return success to prevent email enumeration
        res.json({
          message: 'If an account exists with this email, a password reset link has been sent.'
        });
      }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.errors[0] || 'Password does not meet security requirements' });
    }

    const db = getDatabase();
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Find user with this reset token
    db.get(
      'SELECT id, password_reset_expires FROM users WHERE password_reset_token = ?',
      [token],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Check if token has expired
        const now = new Date();
        const expires = new Date(user.password_reset_expires);
        
        if (now > expires) {
          return res.status(400).json({ error: 'Reset token has expired' });
        }

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear reset token
        db.run(
          'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
          [passwordHash, user.id],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to reset password' });
            }

            res.json({
              message: 'Password reset successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
