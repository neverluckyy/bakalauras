const { getDatabase, initDatabase } = require('./database/init');

async function debugDatabase() {
  // Initialize database first
  await initDatabase();
  console.log('Database initialized successfully');
  
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    console.log('\n=== Database Debug Report ===\n');
    
    // Check modules
    db.all('SELECT * FROM modules ORDER BY order_index', (err, modules) => {
      if (err) {
        console.error('Error getting modules:', err);
        reject(err);
        return;
      }
      
      console.log('MODULES:');
      modules.forEach(module => {
        console.log(`  ID: ${module.id}, Name: "${module.name}", Display: "${module.display_name}"`);
      });
      
      // Check sections with more detail
      db.all(`
        SELECT s.*, m.name as module_name, m.display_name as module_display_name
        FROM sections s 
        JOIN modules m ON s.module_id = m.id 
        ORDER BY m.order_index, s.order_index
      `, (err, sections) => {
        if (err) {
          console.error('Error getting sections:', err);
          reject(err);
          return;
        }
        
        console.log('\nSECTIONS:');
        sections.forEach(section => {
          console.log(`  ID: ${section.id}, Module: "${section.module_name}", Name: "${section.name}", Display: "${section.display_name}", Description: "${section.description}"`);
        });
        
        // Check for duplicate sections
        console.log('\nCHECKING FOR DUPLICATES:');
        db.all(`
          SELECT display_name, COUNT(*) as count
          FROM sections 
          GROUP BY display_name 
          HAVING COUNT(*) > 1
        `, (err, duplicates) => {
          if (err) {
            console.error('Error checking duplicates:', err);
            reject(err);
            return;
          }
          
          if (duplicates.length > 0) {
            console.log('DUPLICATE SECTIONS FOUND:');
            duplicates.forEach(dup => {
              console.log(`  "${dup.display_name}" appears ${dup.count} times`);
            });
          } else {
            console.log('No duplicate sections found');
          }
          
          // Check questions per section
          console.log('\nQUESTIONS PER SECTION:');
          db.all(`
            SELECT s.display_name, COUNT(q.id) as question_count
            FROM sections s
            LEFT JOIN questions q ON s.id = q.section_id
            GROUP BY s.id, s.display_name
            ORDER BY s.module_id, s.order_index
          `, (err, questionCounts) => {
            if (err) {
              console.error('Error getting question counts:', err);
              reject(err);
              return;
            }
            
            questionCounts.forEach(qc => {
              console.log(`  "${qc.display_name}": ${qc.question_count} questions`);
            });
            
            // Check user progress
            console.log('\nUSER PROGRESS:');
            db.all(`
              SELECT 
                s.display_name,
                COUNT(up.id) as answered_questions,
                SUM(CASE WHEN up.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
              FROM sections s
              LEFT JOIN questions q ON s.id = q.section_id
              LEFT JOIN user_progress up ON q.id = up.question_id
              GROUP BY s.id, s.display_name
              ORDER BY s.module_id, s.order_index
            `, (err, progress) => {
              if (err) {
                console.error('Error getting user progress:', err);
                reject(err);
                return;
              }
              
              progress.forEach(p => {
                console.log(`  "${p.display_name}": ${p.answered_questions} answered, ${p.correct_answers} correct`);
              });
              
              resolve();
            });
          });
        });
      });
    });
  });
}

// Run debug if this script is executed directly
if (require.main === module) {
  debugDatabase()
    .then(() => {
      console.log('\nDebug completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Debug failed:', err);
      process.exit(1);
    });
}

module.exports = { debugDatabase };
