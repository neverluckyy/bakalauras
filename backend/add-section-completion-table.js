const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'learning_app.db');

function addSectionCompletionTable() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('Connected to database');
      
      // Create section completion table
      db.run(`
        CREATE TABLE IF NOT EXISTS section_completions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          section_id INTEGER NOT NULL,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          percentage REAL NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (section_id) REFERENCES sections (id),
          UNIQUE(user_id, section_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating section_completions table:', err);
          reject(err);
        } else {
          console.log('Section completions table created successfully');
          
          // Migrate existing completions from user_progress
          db.run(`
            INSERT OR IGNORE INTO section_completions (user_id, section_id, completed_at, score, total_questions, percentage)
            SELECT 
              up.user_id,
              q.section_id,
              MAX(up.answered_at) as completed_at,
              COUNT(CASE WHEN up.is_correct = 1 THEN 1 END) as score,
              COUNT(*) as total_questions,
              (COUNT(CASE WHEN up.is_correct = 1 THEN 1 END) * 100.0 / COUNT(*)) as percentage
            FROM user_progress up
            JOIN questions q ON up.question_id = q.id
            GROUP BY up.user_id, q.section_id
            HAVING COUNT(CASE WHEN up.is_correct = 1 THEN 1 END) = COUNT(*)
          `, (err) => {
            if (err) {
              console.error('Error migrating existing completions:', err);
              reject(err);
            } else {
              console.log('Existing completions migrated successfully');
              resolve();
            }
          });
        }
      });
    });
  });
}

addSectionCompletionTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

