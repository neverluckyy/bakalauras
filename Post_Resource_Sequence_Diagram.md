# Post Resource Sequence Diagram - Quiz Answer Submission

## Overview
This sequence diagram illustrates the process of a user (Learner) submitting quiz answers in the gamified social engineering learning application. The flow shows both successful submission and error handling scenarios.

## Participants (Lifelines)
1. **:Learner** (User/Actor)
2. **:React Frontend** (Frontend application)
3. **:Express Backend** (Server-side logic and data handling)
4. **:SQLite Database** (Data persistence layer)

## Main Flow (Successful Quiz Answer Submission)

```
:Learner -> :React Frontend: 1. Clicks on Quiz Section
:React Frontend -> :Learner: 2. Displays quiz questions and answer options

:Learner -> :React Frontend: 3. Selects answer and clicks Submit
:React Frontend -> :Express Backend: 4. POST /api/questions/:questionId/answer
                                        { selectedIndex, user_id }

:Express Backend -> :SQLite Database: 5. SELECT question details and user progress
:SQLite Database -> :Express Backend: 6. Returns question data and existing progress

:Express Backend -> :Express Backend: 7. Validates answer and calculates XP
:Express Backend -> :SQLite Database: 8. INSERT/UPDATE user_progress table
:SQLite Database -> :Express Backend: 9. Confirms progress saved

:Express Backend -> :SQLite Database: 10. UPDATE users table (total_xp, level)
:SQLite Database -> :Express Backend: 11. Confirms user stats updated

:Express Backend -> :React Frontend: 12. Returns success response
                                        { isCorrect, xpAwarded, explanation }

:React Frontend -> :Learner: 13. Shows answer feedback and explanation
```

## Alternative Flow (Error Handling)

```
:Express Backend -> :React Frontend: Sends Error Response
                                        { error: "Question not found" }
:React Frontend -> :Learner: Shows error message
```

## Alternative Flow (Quiz Completion)

```
:Learner -> :React Frontend: Completes all quiz questions
:React Frontend -> :Express Backend: POST /api/sections/:sectionId/quiz
                                        { answers, score, totalQuestions }

:Express Backend -> :SQLite Database: Batch update user_progress for all answers
:SQLite Database -> :Express Backend: Confirms all progress saved

:Express Backend -> :SQLite Database: Calculate and update final XP/level
:SQLite Database -> :Express Backend: Confirms final stats updated

:Express Backend -> :React Frontend: Returns quiz completion response
                                        { xpEarned, newTotalXP, newLevel }

:React Frontend -> :Learner: Shows quiz results and XP earned
```

## Key Features Illustrated

### Authentication Flow
- JWT token validation via HTTP-only cookies
- User context maintained throughout the session

### Gamification Elements
- XP calculation (10 XP per correct answer)
- Level progression (level up every 100 XP)
- Progress tracking per question and section

### Data Persistence
- User progress stored in `user_progress` table
- User statistics in `users` table
- Question data in `questions` table

### Error Handling
- Question not found scenarios
- Database connection errors
- Invalid answer submissions

## Database Schema References

### Tables Involved:
- **users**: Stores user profile, XP, and level
- **questions**: Contains quiz questions, options, and correct answers
- **user_progress**: Tracks individual question attempts and results
- **sections**: Learning content organization
- **modules**: Top-level learning categories

## Security Considerations
- JWT token authentication required for all submissions
- Rate limiting on authentication endpoints
- Input validation and sanitization
- SQL injection prevention through parameterized queries

---

*This diagram represents the core "resource posting" functionality in the learning application, where users submit quiz answers as their primary contribution to the system.*
