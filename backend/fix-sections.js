const { getDatabase, initDatabase } = require('./database/init');

async function fixSections() {
  await initDatabase();
  const db = getDatabase();
  
  // Section mappings from CSV to database
  const sectionUpdates = [
    // Module 1: Security Awareness Essentials
    { moduleName: 'Module 1: Security Awareness Essentials', oldName: 'Section 1: Phishing and Social Engineering', newName: 'Section 1: Phishing and Social Engineering' },
    { moduleName: 'Module 1: Security Awareness Essentials', oldName: 'Section 2: Passwords and MFA', newName: 'Section 2: Passwords and MFA' },
    { moduleName: 'Module 1: Security Awareness Essentials', oldName: 'Section 3: Ransomware', newName: 'Section 3: Ransomware' },
    { moduleName: 'Module 1: Security Awareness Essentials', oldName: 'Section 4: Safe Internet Browsing', newName: 'Section 4: Safe Internet Browsing' },
    { moduleName: 'Module 1: Security Awareness Essentials', oldName: 'Section 5: Social Media Safety', newName: 'Section 5: Social Media Safety' },
    
    // Module 2: Phishing Red Flags
    { moduleName: 'Module 2: Phishing Red Flags', oldName: 'Section 1: Understanding Phishing', newName: 'Section 1: Understanding Phishing' },
    { moduleName: 'Module 2: Phishing Red Flags', oldName: 'Section 2: Identifying Suspicious Sender Information', newName: 'Section 2: Identifying Suspicious Sender Information' },
    { moduleName: 'Module 2: Phishing Red Flags', oldName: 'Section 3: Spotting Urgent or Threatening Language', newName: 'Section 3: Spotting Urgent or Threatening Language' },
    { moduleName: 'Module 2: Phishing Red Flags', oldName: 'Section 4: Recognising Suspicious Attachments', newName: 'Section 4: Recognising Suspicious Attachments' },
    { moduleName: 'Module 2: Phishing Red Flags', oldName: 'Section 5: Recognising URL Manipulation', newName: 'Section 5: Recognising URL Manipulation' },
    { moduleName: 'Module 2: Phishing Red Flags', oldName: 'Section 6: Requests from High-Level Executives (Whaling)', newName: 'Section 6: Requests from High-Level Executives (Whaling)' },
    
    // Module 3: Business Email Compromise (BEC)
    { moduleName: 'Module 3: Business Email Compromise (BEC)', oldName: 'Section 1: Business Email Compromise: An Overview', newName: 'Section 1: Business Email Compromise: An Overview' },
    { moduleName: 'Module 3: Business Email Compromise (BEC)', oldName: 'Section 2: Common Types of Business Email Compromise Attacks', newName: 'Section 2: Common Types of Business Email Compromise Attacks' },
    { moduleName: 'Module 3: Business Email Compromise (BEC)', oldName: 'Section 3: Recognising Red Flags in Business Email Compromise', newName: 'Section 3: Recognising Red Flags in Business Email Compromise' },
    { moduleName: 'Module 3: Business Email Compromise (BEC)', oldName: 'Section 4: Preventing Business Email Compromise - Best Practices', newName: 'Section 4: Preventing Business Email Compromise - Best Practices' },
    { moduleName: 'Module 3: Business Email Compromise (BEC)', oldName: 'Section 5: Responding to Business Email Compromise - What To Do', newName: 'Section 5: Responding to Business Email Compromise - What To Do' }
  ];

  console.log('Current database sections:');
  
  // First, let's see what's currently in the database
  db.all(`
    SELECT m.name as module_name, s.name as section_name, s.id as section_id
    FROM sections s 
    JOIN modules m ON s.module_id = m.id 
    ORDER BY m.order_index, s.order_index
  `, (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    console.log('Current sections in database:');
    rows.forEach(row => {
      console.log(`Module: ${row.module_name} | Section: ${row.section_name} (ID: ${row.section_id})`);
    });
    
    console.log('\nUpdating sections to match CSV...');
    
    // Update each section name to match the CSV
    let updatedCount = 0;
    sectionUpdates.forEach((update, index) => {
      db.run(`
        UPDATE sections 
        SET name = ?, display_name = ?
        WHERE id = (
          SELECT s.id 
          FROM sections s 
          JOIN modules m ON s.module_id = m.id 
          WHERE m.name = ? AND s.order_index = ?
        )
      `, [update.newName, update.newName, update.moduleName, index + 1], function(err) {
        if (err) {
          console.error(`Error updating section ${update.oldName}:`, err);
        } else {
          if (this.changes > 0) {
            console.log(`Updated: ${update.oldName} -> ${update.newName}`);
            updatedCount++;
          }
        }
        
        // Check if this is the last update
        if (index === sectionUpdates.length - 1) {
          console.log(`\nUpdated ${updatedCount} sections.`);
          console.log('\nFinal database sections:');
          
          // Show final state
          db.all(`
            SELECT m.name as module_name, s.name as section_name
            FROM sections s 
            JOIN modules m ON s.module_id = m.id 
            ORDER BY m.order_index, s.order_index
          `, (err, finalRows) => {
            if (err) {
              console.error('Error:', err);
            } else {
              finalRows.forEach(row => {
                console.log(`Module: ${row.module_name} | Section: ${row.section_name}`);
              });
            }
            process.exit(0);
          });
        }
      });
    });
  });
}

fixSections();
