const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { getDatabase, initDatabase } = require('../database/init');

const csvFilePath = path.join(__dirname, '../../social_engineering_quiz_bank_clean.csv');

async function importQuestions() {
  console.log('Starting CSV import...');
  
  // Initialize database first
  await initDatabase();
  console.log('Database initialized successfully');
  
  const db = getDatabase();
  let lineNumber = 0;
  let importedCount = 0;
  let errorCount = 0;
  const errors = [];

  console.log('CSV file path:', csvFilePath);

  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at: ${csvFilePath}`);
  }

  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        console.log(`CSV file read successfully. Processing ${results.length} rows...`);
        
        // Process results in batches
        const batchSize = 10;
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(results.length/batchSize)}...`);
          
          for (const row of batch) {
            lineNumber++;
            
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
                const error = `Line ${lineNumber}: Missing required fields`;
                errors.push(error);
                errorCount++;
                console.warn(error);
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
                const error = `Line ${lineNumber}: Invalid options JSON - ${parseError.message}`;
                errors.push(error);
                errorCount++;
                console.warn(error);
                continue;
              }

              // Validate correct answer exists in options (case-insensitive)
              const correctAnswerLower = correctAnswer.toLowerCase();
              const optionsLower = parsedOptions.map(opt => opt.toLowerCase());
              if (!optionsLower.includes(correctAnswerLower)) {
                const error = `Line ${lineNumber}: Correct answer "${correctAnswer}" not found in options`;
                errors.push(error);
                errorCount++;
                console.warn(error);
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
                const error = `Line ${lineNumber}: Module "${moduleName}" not found in database. Please ensure the module exists.`;
                errors.push(error);
                errorCount++;
                console.warn(error);
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
                const error = `Line ${lineNumber}: Section "${sectionName}" not found in module "${moduleName}". Please ensure the section exists.`;
                errors.push(error);
                errorCount++;
                console.warn(error);
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
                console.log(`Line ${lineNumber}: Question already exists, skipping`);
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
              const errorMsg = `Line ${lineNumber}: Unexpected error - ${error.message}`;
              errors.push(errorMsg);
              errorCount++;
              console.warn(errorMsg);
            }
          }
          
          // Small delay between batches to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n=== Import Summary ===');
        console.log(`Total lines processed: ${lineNumber}`);
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
        
        resolve({ importedCount, errorCount, errors });
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      });
  });
}

// Run import if this script is executed directly
if (require.main === module) {
  importQuestions()
    .then((result) => {
      console.log('Import process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importQuestions };
