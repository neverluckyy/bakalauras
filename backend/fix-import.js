const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const csvFilePath = path.join(__dirname, '../social_engineering_quiz_bank_clean.csv');
const dbPath = path.join(__dirname, 'database/learning_app.db');

async function fixImport() {
  console.log('Starting import fix process...');
  
  // Step 1: Create database and tables
  console.log('Step 1: Creating database...');
  await createDatabase();
  
  // Step 2: Import questions
  console.log('Step 2: Importing questions...');
  await importQuestions();
  
  console.log('Import fix completed!');
}

function createDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.serialize(() => {
        // Create tables
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
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
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (module_id) REFERENCES modules (id)
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS questions (
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
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS user_progress (
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
        `);

        // Insert modules
        db.run(`
          INSERT OR IGNORE INTO modules (name, display_name, description, order_index) VALUES
          ('Module 1: Security Awareness Essentials', 'Security Awareness Essentials', 'Core security concepts and best practices', 1),
          ('Module 2: Phishing Red Flags', 'Phishing Red Flags', 'Identifying and avoiding phishing attempts', 2),
          ('Module 3: Business Email Compromise (BEC)', 'Business Email Compromise (BEC)', 'Understanding and preventing BEC attacks', 3)
        `, function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Insert sections for Module 1
          db.run(`
            INSERT OR IGNORE INTO sections (module_id, name, display_name, description, order_index) VALUES
            (1, 'Section 1: Phishing and Social Engineering', 'Phishing and Social Engineering', 'Understanding social engineering tactics', 1),
            (1, 'Section 2: Passwords and MFA', 'Passwords and MFA', 'Secure authentication practices', 2),
            (1, 'Section 3: Ransomware', 'Ransomware', 'Ransomware prevention and response', 3),
            (1, 'Section 4: Safe Internet Browsing', 'Safe Internet Browsing', 'Safe browsing practices', 4),
            (1, 'Section 5: Social Media Safety', 'Social Media Safety', 'Protecting yourself on social media', 5)
          `, function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            // Insert sections for Module 2
            db.run(`
              INSERT OR IGNORE INTO sections (module_id, name, display_name, description, order_index) VALUES
              (2, 'Section 1: Understanding Phishing', 'Understanding Phishing', 'Types and methods of phishing', 1),
              (2, 'Section 2: Identifying Suspicious Sender Information', 'Identifying Suspicious Sender Information', 'Spotting fake sender details', 2),
              (2, 'Section 3: Spotting Urgent or Threatening Language', 'Spotting Urgent or Threatening Language', 'Recognizing pressure tactics', 3),
              (2, 'Section 4: Recognising Suspicious Attachments', 'Recognising Suspicious Attachments', 'Identifying dangerous file types', 4),
              (2, 'Section 5: Recognising URL Manipulation', 'Recognising URL Manipulation', 'Spotting fake URLs', 5),
              (2, 'Section 6: Requests from High-Level Executives (Whaling)', 'Requests from High-Level Executives (Whaling)', 'Executive impersonation tactics', 6)
            `, function(err) {
              if (err) {
                reject(err);
                return;
              }
              
              // Insert sections for Module 3
              db.run(`
                INSERT OR IGNORE INTO sections (module_id, name, display_name, description, order_index) VALUES
                (3, 'Section 1: Business Email Compromise: An Overview', 'Business Email Compromise: An Overview', 'Understanding BEC attacks', 1),
                (3, 'Section 2: Common Types of Business Email Compromise Attacks', 'Common Types of Business Email Compromise Attacks', 'Different BEC attack methods', 2),
                (3, 'Section 3: Recognising Red Flags in Business Email Compromise', 'Recognising Red Flags in Business Email Compromise', 'Identifying BEC warning signs', 3),
                (3, 'Section 4: Preventing Business Email Compromise - Best Practices', 'Preventing Business Email Compromise - Best Practices', 'BEC prevention strategies', 4),
                (3, 'Section 5: Responding to Business Email Compromise - What To Do', 'Responding to Business Email Compromise - What To Do', 'BEC incident response', 5)
              `, function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                
                db.run('PRAGMA foreign_keys = ON', function(err) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  console.log('Database created successfully with modules and sections');
                  db.close();
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  });
}

function importQuestions() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(csvFilePath)) {
      reject(new Error(`CSV file not found at: ${csvFilePath}`));
      return;
    }

    const db = new sqlite3.Database(dbPath);
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log('Reading CSV file...');
    
    const results = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        console.log(`Processing ${results.length} questions...`);
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          
          try {
            // Clean and validate data
            const moduleName = row.module?.trim();
            const sectionName = row.section?.trim();
            const questionText = row.question?.trim();
            const options = row.options?.trim();
            const correctAnswer = row.correct_answer?.trim();
            const explanation = row.explanation?.trim();

            // Validate required fields
            if (!moduleName || !sectionName || !questionText || !options || !correctAnswer || !explanation) {
              const error = `Line ${i + 1}: Missing required fields`;
              errors.push(error);
              errorCount++;
              continue;
            }

            // Parse options JSON
            let parsedOptions;
            try {
              parsedOptions = JSON.parse(options);
              if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
                throw new Error('Options must be a non-empty array');
              }
            } catch (parseError) {
              const error = `Line ${i + 1}: Invalid options JSON - ${parseError.message}`;
              errors.push(error);
              errorCount++;
              continue;
            }

            // Validate correct answer exists in options (case-insensitive)
            const correctAnswerLower = correctAnswer.toLowerCase();
            const optionsLower = parsedOptions.map(opt => opt.toLowerCase());
            if (!optionsLower.includes(correctAnswerLower)) {
              const error = `Line ${i + 1}: Correct answer "${correctAnswer}" not found in options`;
              errors.push(error);
              errorCount++;
              continue;
            }
            
            // Use the exact case from options for the correct answer
            const correctAnswerIndex = optionsLower.indexOf(correctAnswerLower);
            const actualCorrectAnswer = parsedOptions[correctAnswerIndex];

            // Find existing module by name
            const module = await new Promise((resolve, reject) => {
              db.get('SELECT id FROM modules WHERE name = ?', [moduleName], (err, result) => {
                if (err) reject(err);
                else resolve(result);
              });
            });

            if (!module) {
              const error = `Line ${i + 1}: Module "${moduleName}" not found in database`;
              errors.push(error);
              errorCount++;
              continue;
            }

            const moduleId = module.id;
            
            // Find existing section by name and module_id
            const section = await new Promise((resolve, reject) => {
              db.get(
                'SELECT id FROM sections WHERE name = ? AND module_id = ?',
                [sectionName, moduleId],
                (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
                }
              );
            });

            if (!section) {
              const error = `Line ${i + 1}: Section "${sectionName}" not found in module "${moduleName}"`;
              errors.push(error);
              errorCount++;
              continue;
            }

            const sectionId = section.id;
            
            // Check if question already exists
            const existingQuestion = await new Promise((resolve, reject) => {
              db.get(
                'SELECT id FROM questions WHERE question_text = ? AND section_id = ?',
                [questionText, sectionId],
                (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
                }
              );
            });

            if (existingQuestion) {
              console.log(`Line ${i + 1}: Question already exists, skipping`);
              continue;
            }

            // Insert question
            await new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO questions (section_id, question_text, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?)',
                [sectionId, questionText, options, actualCorrectAnswer, explanation],
                function(err) {
                  if (err) reject(err);
                  else {
                    importedCount++;
                    resolve();
                  }
                }
              );
            });

          } catch (error) {
            const errorMsg = `Line ${i + 1}: Unexpected error - ${error.message}`;
            errors.push(errorMsg);
            errorCount++;
          }
        }
        
        console.log('\n=== Import Summary ===');
        console.log(`Total lines processed: ${results.length}`);
        console.log(`Questions imported: ${importedCount}`);
        console.log(`Errors encountered: ${errorCount}`);
        
        if (errors.length > 0) {
          console.log('\n=== First 10 Errors ===');
          errors.slice(0, 10).forEach(error => console.log(error));
          if (errors.length > 10) {
            console.log(`... and ${errors.length - 10} more errors`);
          }
        }
        
        if (errorCount === 0) {
          console.log('\n✅ Import completed successfully!');
        } else {
          console.log(`\n⚠️  Import completed with ${errorCount} errors.`);
        }
        
        db.close();
        resolve({ importedCount, errorCount, errors });
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      });
  });
}

// Run the fix
fixImport()
  .then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
