const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database/learning_app.db');

console.log('Fixing database by completely recreating it...');
console.log('Database path:', dbPath);

// Delete the existing database file
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Deleted existing database file');
}

// Create new database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }
  console.log('✅ Created new database file');
  
  db.serialize(() => {
    // Create tables
    console.log('Creating tables...');
    
    // Users table
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        avatar_key TEXT DEFAULT 'robot_coral',
        total_xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating users table:', err);
      else console.log('✅ Users table created');
    });

    // Modules table
    db.run(`
      CREATE TABLE modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating modules table:', err);
      else console.log('✅ Modules table created');
    });

    // Sections table
    db.run(`
      CREATE TABLE sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        order_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES modules (id),
        UNIQUE(module_id, name),
        UNIQUE(module_id, order_index)
      )
    `, (err) => {
      if (err) console.error('Error creating sections table:', err);
      else console.log('✅ Sections table created');
    });

    // Questions table
    db.run(`
      CREATE TABLE questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        question_type TEXT DEFAULT 'multiple_choice',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (section_id) REFERENCES sections (id)
      )
    `, (err) => {
      if (err) console.error('Error creating questions table:', err);
      else console.log('✅ Questions table created');
    });

    // User progress table
    db.run(`
      CREATE TABLE user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        is_correct BOOLEAN NOT NULL,
        selected_answer TEXT,
        xp_awarded INTEGER DEFAULT 0,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (question_id) REFERENCES questions (id),
        UNIQUE(user_id, question_id)
      )
    `, (err) => {
      if (err) console.error('Error creating user_progress table:', err);
      else console.log('✅ User progress table created');
    });

    // Insert modules
    console.log('\nInserting modules...');
    db.run(`
      INSERT INTO modules (name, display_name, description, order_index) VALUES
      ('Module 1: Security Awareness Essentials', 'Security Awareness Essentials', 'Core security concepts and best practices', 1),
      ('Module 2: Phishing Red Flags', 'Phishing Red Flags', 'Identifying and avoiding phishing attempts', 2),
      ('Module 3: Business Email Compromise (BEC)', 'Business Email Compromise (BEC)', 'Understanding and preventing BEC attacks', 3)
    `, function(err) {
      if (err) {
        console.error('Error inserting modules:', err);
        process.exit(1);
      }
      console.log(`✅ Inserted ${this.changes} modules`);
      
      // Get module IDs
      db.all('SELECT id, name FROM modules ORDER BY order_index', (err, modules) => {
        if (err) {
          console.error('Error getting module IDs:', err);
          process.exit(1);
        }
        
        const module1Id = modules[0].id;
        const module2Id = modules[1].id;
        const module3Id = modules[2].id;
        
        console.log(`Module IDs: ${module1Id}, ${module2Id}, ${module3Id}`);
        
        // Insert sections for Module 1
        console.log('\nInserting sections for Module 1...');
        db.run(`
          INSERT INTO sections (module_id, name, display_name, description, order_index) VALUES
          (?, 'Section 1: Phishing and Social Engineering', 'Phishing and Social Engineering', 'Understanding social engineering tactics', 1),
          (?, 'Section 2: Passwords and MFA', 'Passwords and MFA', 'Secure authentication practices', 2),
          (?, 'Section 3: Ransomware', 'Ransomware', 'Ransomware prevention and response', 3),
          (?, 'Section 4: Safe Internet Browsing', 'Safe Internet Browsing', 'Safe browsing practices', 4),
          (?, 'Section 5: Social Media Safety', 'Social Media Safety', 'Protecting yourself on social media', 5)
        `, [module1Id, module1Id, module1Id, module1Id, module1Id], function(err) {
          if (err) {
            console.error('Error inserting Module 1 sections:', err);
            process.exit(1);
          }
          console.log(`✅ Inserted ${this.changes} sections for Module 1`);
          
          // Insert sections for Module 2
          console.log('\nInserting sections for Module 2...');
          db.run(`
            INSERT INTO sections (module_id, name, display_name, description, order_index) VALUES
            (?, 'Section 1: Understanding Phishing', 'Understanding Phishing', 'Types and methods of phishing', 1),
            (?, 'Section 2: Identifying Suspicious Sender Information', 'Identifying Suspicious Sender Information', 'Spotting fake sender details', 2),
            (?, 'Section 3: Spotting Urgent or Threatening Language', 'Spotting Urgent or Threatening Language', 'Recognizing pressure tactics', 3),
            (?, 'Section 4: Recognising Suspicious Attachments', 'Recognising Suspicious Attachments', 'Identifying dangerous file types', 4),
            (?, 'Section 5: Recognising URL Manipulation', 'Recognising URL Manipulation', 'Spotting fake URLs', 5),
            (?, 'Section 6: Requests from High-Level Executives (Whaling)', 'Requests from High-Level Executives (Whaling)', 'Executive impersonation tactics', 6)
          `, [module2Id, module2Id, module2Id, module2Id, module2Id, module2Id], function(err) {
            if (err) {
              console.error('Error inserting Module 2 sections:', err);
              process.exit(1);
            }
            console.log(`✅ Inserted ${this.changes} sections for Module 2`);
            
            // Insert sections for Module 3
            console.log('\nInserting sections for Module 3...');
            db.run(`
              INSERT INTO sections (module_id, name, display_name, description, order_index) VALUES
              (?, 'Section 1: Business Email Compromise: An Overview', 'Business Email Compromise: An Overview', 'Understanding BEC attacks', 1),
              (?, 'Section 2: Common Types of Business Email Compromise Attacks', 'Common Types of Business Email Compromise Attacks', 'Different BEC attack methods', 2),
              (?, 'Section 3: Recognising Red Flags in Business Email Compromise', 'Recognising Red Flags in Business Email Compromise', 'Identifying BEC warning signs', 3),
              (?, 'Section 4: Preventing Business Email Compromise - Best Practices', 'Preventing Business Email Compromise - Best Practices', 'BEC prevention strategies', 4),
              (?, 'Section 5: Responding to Business Email Compromise - What To Do', 'Responding to Business Email Compromise - What To Do', 'BEC incident response', 5)
            `, [module3Id, module3Id, module3Id, module3Id, module3Id], function(err) {
              if (err) {
                console.error('Error inserting Module 3 sections:', err);
                process.exit(1);
              }
              console.log(`✅ Inserted ${this.changes} sections for Module 3`);
              
              // Verify the fix
              console.log('\nVerifying database...');
              db.get('SELECT COUNT(*) as count FROM sections', (err, result) => {
                if (err) {
                  console.error('Error counting sections:', err);
                  process.exit(1);
                }
                console.log(`📊 Total sections: ${result.count}`);
                
                // Check for duplicates
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
                    console.log('✅ No duplicate sections found');
                    console.log('\n🎉 Database has been successfully recreated without duplicates!');
                    console.log('The learning sections should now display correctly without duplicates.');
                  } else {
                    console.log('❌ Still found duplicate sections:');
                    duplicates.forEach(dup => {
                      console.log(`  Module ${dup.module_id}: "${dup.name}" (${dup.count} times)`);
                    });
                  }
                  
                  db.close();
                  process.exit(0);
                });
              });
            });
          });
        });
      });
    });
  });
});
