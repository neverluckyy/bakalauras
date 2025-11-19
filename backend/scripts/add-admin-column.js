const { getDatabase } = require('../database/init');

const db = getDatabase();

// Add is_admin column if it doesn't exist
db.run(`
  ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0
`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Error adding is_admin column:', err);
    process.exit(1);
  } else {
    console.log('✅ is_admin column added (or already exists)');
    
    // Optionally, make the first user an admin
    db.get('SELECT id, email FROM users ORDER BY id LIMIT 1', (err, user) => {
      if (err) {
        console.error('Error getting first user:', err);
        process.exit(1);
      }
      
      if (user) {
        db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [user.id], (err) => {
          if (err) {
            console.error('Error setting first user as admin:', err);
            process.exit(1);
          }
          console.log(`✅ User ${user.email} (ID: ${user.id}) has been set as admin`);
          process.exit(0);
        });
      } else {
        console.log('No users found in database');
        process.exit(0);
      }
    });
  }
});

