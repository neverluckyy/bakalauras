console.log('Starting simple test...');

try {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  console.log('SQLite3 loaded successfully');
  
  const dbPath = path.join(__dirname, 'database', 'learning_app.db');
  console.log('Database path:', dbPath);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Database connection failed:', err.message);
      process.exit(1);
    }
    console.log('✓ Connected to SQLite database');
    
    // Test a simple query
    db.get('SELECT 1 as test', (err, row) => {
      if (err) {
        console.error('Query failed:', err.message);
        process.exit(1);
      }
      console.log('✓ Database query successful:', row);
      
      // Check users table
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
          console.error('Table check failed:', err.message);
          process.exit(1);
        }
        
        if (row) {
          console.log('✓ Users table exists');
          
          // Try to insert a test user
          const testEmail = `test-${Date.now()}@example.com`;
          db.run(
            'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
            [testEmail, 'test_hash', 'Test User'],
            function(err) {
              if (err) {
                console.error('✗ User insertion failed:', err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                  console.log('  (Expected if test user already exists)');
                }
              } else {
                console.log('✓ User insertion successful, ID:', this.lastID);
                
                // Clean up
                db.run('DELETE FROM users WHERE id = ?', [this.lastID], (err) => {
                  if (err) {
                    console.error('Cleanup failed:', err.message);
                  } else {
                    console.log('✓ Test user cleaned up');
                  }
                  db.close();
                  console.log('✓ Database test completed successfully');
                });
              }
            }
          );
        } else {
          console.error('✗ Users table does not exist');
          db.close();
          process.exit(1);
        }
      });
    });
  });
  
} catch (error) {
  console.error('Test failed:', error.message);
  process.exit(1);
}
