const { getDatabase } = require('./database/init');

function unlockAllSections(userId = 1) {
  const db = getDatabase();
  
  console.log(`Unlocking all sections for user ${userId}...\n`);
  
  // First, get all questions
  db.all('SELECT id FROM questions', (err, questions) => {
    if (err) {
      console.error('Error getting questions:', err);
      return;
    }
    
    console.log(`Found ${questions.length} questions to unlock`);
    
    if (questions.length === 0) {
      console.log('No questions found in database');
      return;
    }
    
    // For each question, insert or update user progress as correct
    let completed = 0;
    let errors = 0;
    
    questions.forEach((question, index) => {
      const insertQuery = `
        INSERT OR REPLACE INTO user_progress 
        (user_id, question_id, is_correct, selected_answer, xp_awarded, answered_at) 
        VALUES (?, ?, 1, 'correct', 10, CURRENT_TIMESTAMP)
      `;
      
      db.run(insertQuery, [userId, question.id], function(err) {
        if (err) {
          console.error(`Error updating question ${question.id}:`, err);
          errors++;
        } else {
          completed++;
        }
        
        // Check if all questions have been processed
        if (completed + errors === questions.length) {
          console.log(`\nUnlock process completed:`);
          console.log(`- Successfully unlocked: ${completed} questions`);
          console.log(`- Errors: ${errors} questions`);
          
          // Verify the unlock by checking user progress
          db.all('SELECT COUNT(*) as total FROM user_progress WHERE user_id = ? AND is_correct = 1', [userId], (err, result) => {
            if (err) {
              console.error('Error verifying unlock:', err);
            } else {
              console.log(`- Total correct answers for user ${userId}: ${result[0].total}`);
            }
            
            // Get section completion status
            const verifyQuery = `
              SELECT 
                s.id,
                s.display_name,
                COUNT(q.id) as total_questions,
                COUNT(up.question_id) as correct_answers
              FROM sections s
              LEFT JOIN questions q ON s.id = q.section_id
              LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = ? AND up.is_correct = 1
              GROUP BY s.id
              ORDER BY s.order_index
            `;
            
            db.all(verifyQuery, [userId], (err, sections) => {
              if (err) {
                console.error('Error verifying sections:', err);
              } else {
                console.log('\nSection completion status:');
                sections.forEach(section => {
                  const isCompleted = section.total_questions > 0 && section.correct_answers >= section.total_questions;
                  console.log(`- ${section.display_name}: ${section.correct_answers}/${section.total_questions} (${isCompleted ? 'COMPLETED' : 'INCOMPLETE'})`);
                });
              }
              
              console.log('\nAll sections should now be unlocked!');
              db.close();
            });
          });
        }
      });
    });
  });
}

// Run the unlock function
unlockAllSections();
