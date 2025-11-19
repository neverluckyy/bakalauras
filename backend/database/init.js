const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'learning_app.db');

// Singleton database instance
let dbInstance = null;

function initDatabase() {
  return new Promise((resolve, reject) => {
    // Helper function to initialize tables
    function initializeTables() {
      const db = dbInstance;
      db.serialize(() => {
        // Users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            avatar_key TEXT DEFAULT 'robot_coral',
            total_xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            is_admin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Modules table
        db.run(`
          CREATE TABLE IF NOT EXISTS modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Sections table
        db.run(`
          CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (module_id) REFERENCES modules (id),
            UNIQUE(module_id, name),
            UNIQUE(module_id, order_index)
          )
        `);

        // Learning Content table
        db.run(`
          CREATE TABLE IF NOT EXISTS learning_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            screen_title TEXT NOT NULL,
            read_time_min INTEGER NOT NULL,
            content_markdown TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (section_id) REFERENCES sections (id),
            UNIQUE(section_id, screen_title),
            UNIQUE(section_id, order_index)
          )
        `);

        // Questions table
        db.run(`
          CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            options TEXT NOT NULL, -- JSON array of options
            correct_answer TEXT NOT NULL,
            explanation TEXT NOT NULL,
            question_type TEXT DEFAULT 'multiple_choice',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (section_id) REFERENCES sections (id)
          )
        `);

        // User progress table
        db.run(`
          CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            is_correct BOOLEAN NOT NULL,
            selected_answer TEXT,
            xp_awarded INTEGER DEFAULT 0,
            answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (question_id) REFERENCES questions (id),
            UNIQUE(user_id, question_id)
          )
        `);

        // User learning progress table
        db.run(`
          CREATE TABLE IF NOT EXISTS user_learning_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            learning_content_id INTEGER NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (learning_content_id) REFERENCES learning_content (id),
            UNIQUE(user_id, learning_content_id)
          )
        `);

        // Insert default modules and sections
        db.run(`
          INSERT OR IGNORE INTO modules (name, display_name, description, order_index) VALUES
          ('Module 1: Security Awareness Essentials', 'Security Awareness Essentials', 'Core security concepts and best practices', 1),
          ('Module 2: Phishing Red Flags', 'Phishing Red Flags', 'Identifying and avoiding phishing attempts', 2),
          ('Module 3: Business Email Compromise (BEC)', 'Business Email Compromise (BEC)', 'Understanding and preventing BEC attacks', 3)
        `, function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Insert sections for Module 1
          db.run(`
            INSERT OR IGNORE INTO sections (module_id, name, display_name, description, order_index) VALUES
            (1, 'Section 1: Phishing and Social Engineering', 'Phishing and Social Engineering', 'Understanding social engineering tactics', 1),
            (1, 'Section 2: Passwords and MFA', 'Passwords and MFA', 'Secure authentication practices', 2),
            (1, 'Section 3: Ransomware', 'Ransomware', 'Ransomware prevention and response', 3),
            (1, 'Section 4: Safe Internet Browsing', 'Safe Internet Browsing', 'Safe browsing practices', 4),
            (1, 'Section 5: Social Media Safety', 'Social Media Safety', 'Protecting yourself on social media', 5)
          `, function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            // Insert sections for Module 2
            db.run(`
              INSERT OR IGNORE INTO sections (module_id, name, display_name, description, order_index) VALUES
              (2, 'Section 1: Understanding Phishing', 'Understanding Phishing', 'Types and methods of phishing', 1),
              (2, 'Section 2: Identifying Suspicious Sender Information', 'Identifying Suspicious Sender Information', 'Spotting fake sender details', 2),
              (2, 'Section 3: Spotting Urgent or Threatening Language', 'Spotting Urgent or Threatening Language', 'Recognizing pressure tactics', 3),
              (2, 'Section 4: Recognising Suspicious Attachments', 'Recognising Suspicious Attachments', 'Identifying dangerous file types', 4),
              (2, 'Section 5: Recognising URL Manipulation', 'Recognising URL Manipulation', 'Spotting fake URLs', 5),
              (2, 'Section 6: Requests from High-Level Executives (Whaling)', 'Requests from High-Level Executives (Whaling)', 'Executive impersonation tactics', 6)
            `, function(err) {
              if (err) {
                reject(err);
                return;
              }
              
              // Insert sections for Module 3
              db.run(`
                INSERT OR IGNORE INTO sections (module_id, name, display_name, description, order_index) VALUES
                (3, 'Section 1: Business Email Compromise: An Overview', 'Business Email Compromise: An Overview', 'Understanding BEC attacks', 1),
                (3, 'Section 2: Common Types of Business Email Compromise Attacks', 'Common Types of Business Email Compromise Attacks', 'Different BEC attack methods', 2),
                (3, 'Section 3: Recognising Red Flags in Business Email Compromise', 'Recognising Red Flags in Business Email Compromise', 'Identifying BEC warning signs', 3),
                (3, 'Section 4: Preventing Business Email Compromise - Best Practices', 'Preventing Business Email Compromise - Best Practices', 'BEC prevention strategies', 4),
                (3, 'Section 5: Responding to Business Email Compromise - What To Do', 'Responding to Business Email Compromise - What To Do', 'BEC incident response', 5)
              `, function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                
                console.log('Database initialized successfully with modules and sections');
                resolve(db);
              });
            });
          });
        });
      });
    }
    
    // Create or reuse the database instance
    if (!dbInstance) {
      dbInstance = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('Database connection established');
        
        // Enable foreign keys first
        dbInstance.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            console.warn('Warning: Could not enable foreign keys:', err);
          }
          
          // Then enable WAL mode
          dbInstance.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) {
              console.warn('Warning: Could not enable WAL mode:', err);
            }
            
            // Now proceed with table creation
            initializeTables();
          });
        });
      });
    } else {
      // Database already exists, just ensure it's ready and resolve
      // Tables should already be created, so we can resolve immediately
      resolve(dbInstance);
    }
  });
}

function getDatabase() {
  if (!dbInstance) {
    // If database hasn't been initialized, create a connection
    // This should rarely happen, but handle it gracefully
    dbInstance = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Error creating database connection:', err);
        throw err;
      }
      dbInstance.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) console.warn('Warning: Could not enable foreign keys:', err);
      });
      dbInstance.run('PRAGMA journal_mode = WAL', (err) => {
        if (err) console.warn('Warning: Could not enable WAL mode:', err);
      });
    });
  }
  return dbInstance;
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      dbInstance.close((err) => {
        if (err) {
          reject(err);
        } else {
          dbInstance = null;
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = { initDatabase, getDatabase, closeDatabase };
