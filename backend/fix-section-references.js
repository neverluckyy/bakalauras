const { getDatabase } = require('./database/init');

async function fixSectionReferences() {
  const db = getDatabase();
  
  console.log('=== Fixing Section References ===\n');
  
  // First, let's see what sections we have and their IDs
  const sections = await new Promise((resolve, reject) => {
    db.all('SELECT id, name, display_name, module_id, order_index FROM sections ORDER BY module_id, order_index', (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
  
  console.log('Current sections:');
  sections.forEach(s => {
    console.log(`  ID ${s.id}: ${s.display_name} (Module ${s.module_id}, Order ${s.order_index})`);
  });
  
  // Create a mapping from old section IDs to new section IDs
  // Based on the debug output, we need to map:
  // Old section 1 -> New section 369 (Phishing and Social Engineering, Module 1)
  // Old section 2 -> New section 370 (Passwords and MFA, Module 1)
  // Old section 3 -> New section 371 (Ransomware, Module 1)
  // Old section 4 -> New section 372 (Safe Internet Browsing, Module 1)
  // Old section 5 -> New section 373 (Social Media Safety, Module 1)
  // Old section 6 -> New section 374 (Understanding Phishing, Module 2)
  // Old section 7 -> New section 375 (Identifying Suspicious Sender Information, Module 2)
  // Old section 8 -> New section 376 (Spotting Urgent or Threatening Language, Module 2)
  // Old section 9 -> New section 377 (Recognising Suspicious Attachments, Module 2)
  // Old section 10 -> New section 378 (Recognising URL Manipulation, Module 2)
  // Old section 11 -> New section 379 (Requests from High-Level Executives, Module 2)
  // Old section 12 -> New section 380 (Business Email Compromise: An Overview, Module 3)
  // Old section 13 -> New section 381 (Common Types of Business Email Compromise Attacks, Module 3)
  // Old section 14 -> New section 382 (Recognising Red Flags in Business Email Compromise, Module 3)
  // Old section 15 -> New section 383 (Preventing Business Email Compromise - Best Practices, Module 3)
  // Old section 16 -> New section 384 (Responding to Business Email Compromise - What To Do, Module 3)
  
  const sectionMapping = {
    1: 369,   // Phishing and Social Engineering
    2: 370,   // Passwords and MFA
    3: 371,   // Ransomware
    4: 372,   // Safe Internet Browsing
    5: 373,   // Social Media Safety
    6: 374,   // Understanding Phishing
    7: 375,   // Identifying Suspicious Sender Information
    8: 376,   // Spotting Urgent or Threatening Language
    9: 377,   // Recognising Suspicious Attachments
    10: 378,  // Recognising URL Manipulation
    11: 379,  // Requests from High-Level Executives
    12: 380,  // Business Email Compromise: An Overview
    13: 381,  // Common Types of Business Email Compromise Attacks
    14: 382,  // Recognising Red Flags in Business Email Compromise
    15: 383,  // Preventing Business Email Compromise - Best Practices
    16: 384   // Responding to Business Email Compromise - What To Do
  };
  
  console.log('\nSection ID mapping:');
  Object.entries(sectionMapping).forEach(([oldId, newId]) => {
    const section = sections.find(s => s.id === newId);
    console.log(`  Old ID ${oldId} -> New ID ${newId}: ${section ? section.display_name : 'Unknown'}`);
  });
  
  // Get all questions with old section IDs
  const questionsWithOldSections = await new Promise((resolve, reject) => {
    db.all('SELECT id, section_id, question_text FROM questions WHERE section_id <= 16', (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
  
  console.log(`\nFound ${questionsWithOldSections.length} questions with old section IDs`);
  
  // Update each question's section_id
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const question of questionsWithOldSections) {
    const newSectionId = sectionMapping[question.section_id];
    
    if (!newSectionId) {
      console.error(`No mapping found for old section ID ${question.section_id}`);
      errorCount++;
      continue;
    }
    
    try {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE questions SET section_id = ? WHERE id = ?',
          [newSectionId, question.id],
          function(err) {
            if (err) reject(err);
            else {
              updatedCount++;
              resolve();
            }
          }
        );
      });
      
      console.log(`Updated question ${question.id}: section_id ${question.section_id} -> ${newSectionId}`);
    } catch (error) {
      console.error(`Error updating question ${question.id}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== Update Summary ===');
  console.log(`Questions updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('✅ All section references fixed successfully!');
  } else {
    console.log(`⚠️  Fixed with ${errorCount} errors.`);
  }
  
  // Verify the fix
  console.log('\n=== Verification ===');
  const questionsAfterFix = await new Promise((resolve, reject) => {
    db.all('SELECT section_id, COUNT(*) as count FROM questions GROUP BY section_id ORDER BY section_id', (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
  
  console.log('Questions per section after fix:');
  questionsAfterFix.forEach(q => {
    const section = sections.find(s => s.id === q.section_id);
    console.log(`  Section ${q.section_id}: ${q.count} questions ${section ? `(${section.display_name})` : ''}`);
  });
  
  db.close();
}

fixSectionReferences().catch(console.error);
