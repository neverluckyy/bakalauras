const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { initDatabase, getDatabase } = require('../database/init');

async function importLearningContent() {
  console.log('Starting learning content import...');
  
  // Initialize database first
  await initDatabase();
  console.log('Database initialized successfully');
  
  const db = getDatabase();
  const csvFilePath = path.join(__dirname, '../../learning_content.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('CSV file not found:', csvFilePath);
    process.exit(1);
  }
  
  const results = [];
  
  return new Promise((resolve, reject) => {
    // Read CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`Read ${results.length} learning content entries from CSV`);
        
        try {
          // Clear existing learning content
          db.run('DELETE FROM learning_content', (err) => {
            if (err) {
              console.error('Error clearing existing learning content:', err);
              reject(err);
              return;
            }
            console.log('Cleared existing learning content');
            
            // Process each entry
            let processedCount = 0;
            let errorCount = 0;
            
            results.forEach((row, index) => {
              const { module, section, screen_title, read_time_min, content_markdown } = row;
              
              // Find the section ID based on module and section names
              const findSectionQuery = `
                SELECT s.id 
                FROM sections s 
                JOIN modules m ON s.module_id = m.id 
                WHERE m.display_name = ? AND s.display_name = ?
              `;
              
              db.get(findSectionQuery, [module, section], (err, sectionResult) => {
                if (err) {
                  console.error('Error finding section:', err);
                  errorCount++;
                  return;
                }
                
                if (!sectionResult) {
                  console.error(`Section not found: ${module} - ${section}`);
                  errorCount++;
                  return;
                }
                
                // Insert learning content
                const insertQuery = `
                  INSERT INTO learning_content (section_id, screen_title, read_time_min, content_markdown, order_index)
                  VALUES (?, ?, ?, ?, ?)
                `;
                
                db.run(insertQuery, [
                  sectionResult.id,
                  screen_title,
                  parseInt(read_time_min) || 2,
                  content_markdown,
                  index + 1
                ], function(err) {
                  if (err) {
                    console.error('Error inserting learning content:', err);
                    errorCount++;
                  } else {
                    processedCount++;
                    console.log(`✓ Imported: ${module} - ${section} - ${screen_title}`);
                  }
                  
                  // Check if all entries have been processed
                  if (processedCount + errorCount === results.length) {
                    console.log(`\nImport completed!`);
                    console.log(`✓ Successfully imported: ${processedCount} entries`);
                    console.log(`✗ Errors: ${errorCount} entries`);
                    resolve();
                  }
                });
              });
            });
          });
        } catch (error) {
          console.error('Error during import:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Run import if this script is executed directly
if (require.main === module) {
  importLearningContent()
    .then(() => {
      console.log('Learning content import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Learning content import failed:', error);
      process.exit(1);
    });
}

module.exports = { importLearningContent };

