const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/learning_app.db');

console.log('Starting simple duplicate fix...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Database opened successfully');
  
  // Check current state
  db.all(`
    SELECT 
      module_id,
      name,
      COUNT(*) as count
    FROM sections 
    GROUP BY module_id, name
    HAVING COUNT(*) > 1
    ORDER BY module_id, name
  `, (err, duplicates) => {
    if (err) {
      console.error('Error checking duplicates:', err);
      process.exit(1);
    }
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found');
      process.exit(0);
    }
    
    console.log(`Found ${duplicates.length} duplicate groups:`);
    duplicates.forEach(dup => {
      console.log(`  Module ${dup.module_id}: "${dup.name}" (${dup.count} times)`);
    });
    
    // Get sections to keep (lowest ID for each name/module combination)
    db.all(`
      SELECT 
        module_id,
        name,
        MIN(id) as keep_id
      FROM sections 
      GROUP BY module_id, name
      ORDER BY module_id, name
    `, (err, sectionsToKeep) => {
      if (err) {
        console.error('Error getting sections to keep:', err);
        process.exit(1);
      }
      
      console.log(`\nKeeping ${sectionsToKeep.length} sections:`);
      const keepIds = sectionsToKeep.map(s => s.keep_id);
      keepIds.forEach(id => {
        console.log(`  - Section ID ${id}`);
      });
      
      // Delete questions from duplicate sections
      const keepIdsPlaceholder = keepIds.map(() => '?').join(',');
      db.run(`
        DELETE FROM questions 
        WHERE section_id NOT IN (${keepIdsPlaceholder})
      `, keepIds, function(err) {
        if (err) {
          console.error('Error deleting questions:', err);
          process.exit(1);
        }
        console.log(`Deleted ${this.changes} questions from duplicate sections`);
        
        // Delete user progress for deleted questions
        db.run(`
          DELETE FROM user_progress 
          WHERE question_id NOT IN (
            SELECT id FROM questions
          )
        `, function(err) {
          if (err) {
            console.error('Error deleting user progress:', err);
            process.exit(1);
          }
          console.log(`Deleted ${this.changes} user progress records`);
          
          // Delete duplicate sections
          db.run(`
            DELETE FROM sections 
            WHERE id NOT IN (${keepIdsPlaceholder})
          `, keepIds, function(err) {
            if (err) {
              console.error('Error deleting duplicate sections:', err);
              process.exit(1);
            }
            console.log(`Deleted ${this.changes} duplicate sections`);
            
            // Verify fix
            db.all(`
              SELECT 
                module_id,
                name,
                COUNT(*) as count
              FROM sections 
              GROUP BY module_id, name
              HAVING COUNT(*) > 1
              ORDER BY module_id, name
            `, (err, remainingDuplicates) => {
              if (err) {
                console.error('Error verifying fix:', err);
                process.exit(1);
              }
              
              if (remainingDuplicates.length === 0) {
                console.log('✅ No duplicate sections remaining');
              } else {
                console.log('❌ Still have duplicate sections:');
                remainingDuplicates.forEach(dup => {
                  console.log(`  Module ${dup.module_id}: "${dup.name}" (${dup.count} times)`);
                });
              }
              
              // Show final count
              db.get('SELECT COUNT(*) as count FROM sections', (err, result) => {
                if (err) {
                  console.error('Error counting final sections:', err);
                  process.exit(1);
                }
                
                console.log(`\n📊 Final section count: ${result.count}`);
                console.log('✅ Duplicate fix completed successfully!');
                process.exit(0);
              });
            });
          });
        });
      });
    });
  });
});
