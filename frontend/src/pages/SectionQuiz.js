import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Star, Info } from 'lucide-react';
import axios from 'axios';
import './SectionQuiz.css';

const SectionQuiz = () => {
  const { sectionId } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [moduleId, setModuleId] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const [questionsResponse, sectionResponse] = await Promise.all([
          axios.get(`/api/sections/${sectionId}/questions`),
          axios.get(`/api/sections/${sectionId}`)
        ]);
        setQuestions(questionsResponse.data);
        setModuleId(sectionResponse.data.module_id);
      } catch (err) {
        setError('Failed to load quiz questions');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [sectionId]);

  const handleAnswerSelect = (answer) => {
    if (!answerSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = { ...answers, [currentQuestion]: selectedAnswer };
    setAnswers(newAnswers);

    // Check if answer is correct
    const currentQ = questions[currentQuestion];
    const isAnswerCorrect = selectedAnswer === currentQ.correct_answer;
    
    if (isAnswerCorrect) {
      setScore(score + 1);
    }

    setAnswerSubmitted(true);
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setAnswerSubmitted(false);
    } else {
      // Quiz completed
      const finalScore = score; // Score is already updated in handleSubmitAnswer
      const percentage = (finalScore / questions.length) * 100;
      const earnedXP = Math.round((percentage / 100) * 50); // Max 50 XP per quiz
      
      setXpEarned(earnedXP);
      setQuizCompleted(true);

      // Submit quiz results
      try {
        const response = await axios.post(`/api/sections/${sectionId}/quiz`, {
          answers: answers,
          score: finalScore,
          totalQuestions: questions.length
        });

        // Update user XP
        if (response.data.xpEarned) {
          // Fetch updated user stats to ensure we have the latest data
          try {
            const userStatsResponse = await axios.get('/api/user/stats');
            const updatedUser = { 
              ...user, 
              total_xp: response.data.newTotalXP || (user.total_xp || 0) + response.data.xpEarned,
              level: response.data.newLevel || user.level
            };
            updateUser(updatedUser);
          } catch (statsErr) {
            console.error('Error fetching updated user stats:', statsErr);
            // Fallback to just updating XP
            updateUser({ ...user, total_xp: (user.total_xp || 0) + response.data.xpEarned });
          }
        }
      } catch (err) {
        console.error('Error submitting quiz results:', err);
      }
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers({});
    setQuizCompleted(false);
    setScore(0);
    setXpEarned(0);
    setShowExplanation(false);
    setAnswerSubmitted(false);
  };

  if (loading) {
    return (
      <div className="section-quiz-container">
        <div className="loading">Loading quiz...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-quiz-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <div className="section-quiz-container">
        <div className="error">No questions available for this section</div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = (score / questions.length) * 100;
    const isPassed = percentage >= 70;

    return (
      <div className="section-quiz-container">
        <div className="quiz-results">
          <div className="results-header">
            <h1>Quiz Complete!</h1>
            <div className={`score-badge ${isPassed ? 'passed' : 'failed'}`}>
              {isPassed ? <CheckCircle size={24} /> : <XCircle size={24} />}
              {percentage}%
            </div>
          </div>

          <div className="results-stats">
            <div className="stat-card">
              <div className="stat-value">{score}</div>
              <div className="stat-label">Correct Answers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{questions.length}</div>
              <div className="stat-label">Total Questions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{xpEarned}</div>
              <div className="stat-label">XP Earned</div>
            </div>
          </div>

          {isPassed && (
            <div className="success-message">
              <Trophy size={32} />
              <h2>Congratulations!</h2>
              <p>You've successfully completed this section and earned {xpEarned} XP!</p>
            </div>
          )}

          {!isPassed && (
            <div className="failure-message">
              <XCircle size={32} />
              <h2>Keep Learning!</h2>
              <p>You need 70% to pass. Review the material and try again.</p>
            </div>
          )}

          <div className="results-actions">
            <button onClick={handleRetry} className="btn btn-secondary">
              Retry Quiz
            </button>
            <button 
              onClick={() => navigate(`/modules/${moduleId || 1}`, { state: { refresh: true } })}
              className="btn btn-primary"
            >
              Back to Module
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isAnswerCorrect = selectedAnswer === currentQ.correct_answer;

  return (
    <div className="section-quiz-container">
      <div className="quiz-header">
        <Link to={`/sections/${sectionId}/learn`} className="back-button">
          <ArrowLeft size={20} />
          Back to Learning
        </Link>
        <div className="quiz-progress">
          <div 
            className="progress-bar"
            role="progressbar" 
            aria-valuenow={Math.round(progress)} 
            aria-valuemin="0" 
            aria-valuemax="100"
            aria-label={`Quiz progress: Question ${currentQuestion + 1} of ${questions.length}`}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="question-container">
        <div className="question-card">
          <div className="question-header">
            <h2>Question {currentQuestion + 1}</h2>
            <div className="question-points">
              <Star size={16} />
              1 point
            </div>
          </div>

          <div className="question-text">
            {currentQ.question_text}
          </div>

          <div className="answer-options">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === currentQ.correct_answer;
              let optionClass = 'answer-option';
              
              if (answerSubmitted) {
                if (isCorrectAnswer) {
                  optionClass += ' correct';
                } else if (isSelected && !isAnswerCorrect) {
                  optionClass += ' incorrect';
                }
              } else if (isSelected) {
                optionClass += ' selected';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  className={optionClass}
                  disabled={answerSubmitted}
                >
                  <div className="option-letter">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="option-text">{option}</div>
                  {answerSubmitted && isCorrectAnswer && (
                    <CheckCircle size={16} className="correct-icon" />
                  )}
                  {answerSubmitted && isSelected && !isAnswerCorrect && (
                    <XCircle size={16} className="incorrect-icon" />
                  )}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="explanation-container">
              <div className="explanation-header">
                <Info size={20} />
                <h3>Explanation</h3>
              </div>
              <div className="explanation-content">
                <div className="correct-answer">
                  <strong>Correct Answer:</strong> {currentQ.correct_answer}
                </div>
                <div className="explanation-text">
                  <strong>Why this is correct:</strong>
                  <p>{currentQ.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="quiz-navigation">
          {!answerSubmitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              className="btn btn-primary"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn btn-primary"
            >
              {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionQuiz;
