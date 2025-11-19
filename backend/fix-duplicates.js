const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'learning_app.db');

console.log('Checking for duplicate sections...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  // First, let's see what sections exist
  db.all(`
    SELECT 
      s.id,
      s.module_id,
      s.name,
      s.display_name,
      s.description,
      s.order_index,
      m.name as module_name
    FROM sections s
    JOIN modules m ON s.module_id = m.id
    ORDER BY s.module_id, s.order_index
  `, (err, sections) => {
    if (err) {
      console.error('Error getting sections:', err);
      process.exit(1);
    }
    
    console.log(`\nFound ${sections.length} sections:`);
    sections.forEach(section => {
      console.log(`  ID: ${section.id}, Module: "${section.module_name}", Name: "${section.name}", Display: "${section.display_name}"`);
    });
    
    // Find duplicates
    db.all(`
      SELECT 
        s.name,
        s.module_id,
        s.display_name,
        COUNT(*) as count,
        GROUP_CONCAT(s.id) as ids
      FROM sections s
      GROUP BY s.name, s.module_id
      HAVING COUNT(*) > 1
      ORDER BY s.module_id, s.name
    `, (err, duplicates) => {
      if (err) {
        console.error('Error finding duplicates:', err);
        process.exit(1);
      }
      
      if (duplicates.length === 0) {
        console.log('\nNo duplicate sections found!');
        db.close();
        return;
      }
      
      console.log('\nDUPLICATE SECTIONS FOUND:');
      duplicates.forEach(dup => {
        console.log(`  Module ID: ${dup.module_id}, Name: "${dup.name}", Count: ${dup.count}, IDs: ${dup.ids}`);
      });
      
      // Remove duplicates, keeping the one with the lowest ID
      console.log('\nRemoving duplicates...');
      
      const deletePromises = duplicates.map(dup => {
        return new Promise((resolve, reject) => {
          const ids = dup.ids.split(',').map(id => parseInt(id.trim())).sort((a, b) => a - b);
          const idsToDelete = ids.slice(1); // Keep the first (lowest) ID, delete the rest
          
          console.log(`  Keeping section ID ${ids[0]}, deleting IDs: ${idsToDelete.join(', ')}`);
          
          if (idsToDelete.length === 0) {
            resolve();
            return;
          }
          
          const placeholders = idsToDelete.map(() => '?').join(',');
          const query = `DELETE FROM sections WHERE id IN (${placeholders})`;
          
          db.run(query, idsToDelete, function(err) {
            if (err) {
              console.error(`Error deleting sections:`, err);
              reject(err);
            } else {
              console.log(`  Deleted ${this.changes} duplicate sections`);
              resolve();
            }
          });
        });
      });
      
      Promise.all(deletePromises)
        .then(() => {
          console.log('\nDuplicate removal completed!');
          
          // Verify the fix
          db.all(`
            SELECT 
              s.id,
              s.module_id,
              s.name,
              s.display_name,
              s.description,
              s.order_index,
              m.name as module_name
            FROM sections s
            JOIN modules m ON s.module_id = m.id
            ORDER BY s.module_id, s.order_index
          `, (err, sections) => {
            if (err) {
              console.error('Error getting sections after fix:', err);
              process.exit(1);
            }
            
            console.log(`\nAfter fix - Found ${sections.length} sections:`);
            sections.forEach(section => {
              console.log(`  ID: ${section.id}, Module: "${section.module_name}", Name: "${section.name}", Display: "${section.display_name}"`);
            });
            
            // Check for duplicates again
            db.all(`
              SELECT 
                s.name,
                s.module_id,
                COUNT(*) as count
              FROM sections s
              GROUP BY s.name, s.module_id
              HAVING COUNT(*) > 1
            `, (err, remainingDuplicates) => {
              if (err) {
                console.error('Error checking for remaining duplicates:', err);
                process.exit(1);
              }
              
              if (remainingDuplicates.length === 0) {
                console.log('\n✅ All duplicates have been successfully removed!');
              } else {
                console.log('\n❌ Some duplicates still remain:', remainingDuplicates);
              }
              
              db.close();
            });
          });
        })
        .catch(err => {
          console.error('Error during duplicate removal:', err);
          db.close();
          process.exit(1);
        });
    });
  });
});
