const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'learning_app.db');

console.log('Adding unique constraint to prevent future duplicates...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  // First check if the constraint already exists
  db.all(`
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='sections'
  `, (err, results) => {
    if (err) {
      console.error('Error checking table schema:', err);
      process.exit(1);
    }
    
    const tableSchema = results[0]?.sql || '';
    if (tableSchema.includes('UNIQUE(module_id, name)')) {
      console.log('✅ Unique constraint already exists!');
      db.close();
      return;
    }
    
    console.log('Adding unique constraint...');
    
    // Create a new table with the constraint
    db.run(`
      CREATE TABLE sections_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES modules (id),
        UNIQUE(module_id, name)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating new table:', err);
        process.exit(1);
      }
      
      console.log('✅ New table created with unique constraint');
      
      // Copy data from old table to new table
      db.run(`
        INSERT INTO sections_new 
        SELECT * FROM sections
      `, (err) => {
        if (err) {
          console.error('Error copying data:', err);
          process.exit(1);
        }
        
        console.log('✅ Data copied to new table');
        
        // Drop old table and rename new table
        db.run('DROP TABLE sections', (err) => {
          if (err) {
            console.error('Error dropping old table:', err);
            process.exit(1);
          }
          
          db.run('ALTER TABLE sections_new RENAME TO sections', (err) => {
            if (err) {
              console.error('Error renaming table:', err);
              process.exit(1);
            }
            
            console.log('✅ Unique constraint added successfully!');
            console.log('🔒 Future duplicate sections will be prevented automatically');
            db.close();
          });
        });
      });
    });
  });
});

