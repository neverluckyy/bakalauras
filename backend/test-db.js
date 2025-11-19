const { getDatabase } = require('./database/init');

console.log('Testing database connection...');

const db = getDatabase();

// Test basic connection
db.get('SELECT 1 as test', (err, row) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('✓ Database connection successful');
  
  // Check if users table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) {
      console.error('Error checking users table:', err);
      process.exit(1);
    }
    
    if (row) {
      console.log('✓ Users table exists');
      
      // Check users table structure
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          console.error('Error getting table info:', err);
          process.exit(1);
        }
        
        console.log('Users table structure:');
        columns.forEach(col => {
          console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Test inserting a user
        console.log('\nTesting user creation...');
        const testEmail = 'test@example.com';
        const testPasswordHash = 'test_hash';
        const testDisplayName = 'Test User';
        
        db.run(
          'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
          [testEmail, testPasswordHash, testDisplayName],
          function(err) {
            if (err) {
              console.error('✗ User creation failed:', err.message);
              if (err.message.includes('UNIQUE constraint failed')) {
                console.log('  (This is expected if test user already exists)');
              }
            } else {
              console.log('✓ User creation successful, ID:', this.lastID);
              
              // Clean up test user
              db.run('DELETE FROM users WHERE id = ?', [this.lastID], (err) => {
                if (err) {
                  console.error('Error cleaning up test user:', err);
                } else {
                  console.log('✓ Test user cleaned up');
                }
                db.close();
                process.exit(0);
              });
            }
          }
        );
      });
    } else {
      console.error('✗ Users table does not exist');
      process.exit(1);
    }
  });
});
