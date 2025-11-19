const { getDatabase } = require('./database/init');

const db = getDatabase();

console.log('Adding missing section to database...\n');

// Add the missing section to Module 3 (Business Email Compromise)
const insertQuery = `
  INSERT INTO sections (module_id, name, display_name, description, order_index)
  VALUES (3, 'Section 6: Requests from High-Level Executives (Whaling)', 'Requests from High-Level Executives (Whaling)', 'Executive impersonation tactics', 6)
`;

db.run(insertQuery, function(err) {
  if (err) {
    console.error('Error adding section:', err);
    return;
  }
  
  console.log(`✓ Added section with ID: ${this.lastID}`);
  
  // Verify the section was added
  db.get('SELECT * FROM sections WHERE id = ?', [this.lastID], (err, section) => {
    if (err) {
      console.error('Error verifying section:', err);
      return;
    }
    
    console.log('✓ Section added successfully:', section.display_name);
    
    // Now re-run the import to get the missing content
    console.log('\nRe-running import for the new section...');
    
    const { importLearningContent } = require('./scripts/import-learning-content');
    importLearningContent()
      .then(() => {
        console.log('✓ Import completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('✗ Import failed:', error);
        process.exit(1);
      });
  });
});
