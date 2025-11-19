# Gamified Social-Engineering Learning Web App

A comprehensive web application for learning about social engineering threats through gamified modules, quizzes, and interactive content. Built with Node.js/Express backend and React frontend.

## Features

### 🔐 Authentication
- Email/password registration and login
- JWT tokens stored in HttpOnly cookies
- Password hashing with bcryptjs
- Rate limiting and security headers

### 🎮 Gamification
- XP system (+10 XP per correct answer)
- Level progression (level up every 100 XP)
- Progress tracking across modules and sections
- Top 10 leaderboard
- 5 customizable robot avatars

### 📚 Learning Structure
- **Module 1: Security Awareness Essentials**
  - Phishing and Social Engineering
  - Passwords and MFA
  - Ransomware
  - Safe Internet Browsing
  - Social Media Safety

- **Module 2: Phishing Red Flags**
  - Understanding Phishing
  - Identifying Suspicious Sender Information
  - Spotting Urgent or Threatening Language
  - Recognising Suspicious Attachments
  - Recognising URL Manipulation
  - Requests from High-Level Executives (Whaling)

- **Module 3: Business Email Compromise (BEC)**
  - Business Email Compromise: An Overview
  - Common Types of Business Email Compromise Attacks
  - Recognising Red Flags in Business Email Compromise
  - Preventing Business Email Compromise – Best Practices
  - Responding to Business Email Compromise – What To Do

### 🎯 Quiz System
- Single-question flow with immediate feedback
- 160+ questions from CSV import
- Correct/incorrect explanations
- Progress tracking per section
- Server-side validation and XP awards

### 🎨 UI/UX
- Dark theme inspired by modern gaming platforms
- Responsive design for all devices
- Smooth animations and transitions
- Accessible design with ARIA labels
- Clean, modern typography

## Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database with SQLite3
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Helmet** for security headers
- **CORS** for cross-origin requests
- **express-rate-limit** for rate limiting

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons
- **CSS3** with custom animations

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd social-engineering-learning-app
```

### 2. Install dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 3. Environment Setup
Create a `.env` file in the backend directory:
```bash
cd backend
cp config.env .env
```

Edit the `.env` file with your configuration:
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

### 4. Import Quiz Data
```bash
# From the root directory
npm run import-data
```

This will import all questions from the `social_engineering_quiz_bank_clean.csv` file into the database.

### 5. Start the Application

#### Development Mode with Automatic Restart (Recommended)
```bash
# Start both backend and frontend with automatic restart
npm run dev
```

#### Or use the convenience scripts:
```bash
# Windows Batch file
start-dev.bat

# PowerShell script
.\start-dev.ps1
```

#### Or start separately:
```bash
# Terminal 1 - Backend (with nodemon auto-restart)
cd backend && npm run dev

# Terminal 2 - Frontend (with React hot reload)
cd frontend && npm run dev
```

### 6. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile

### Modules & Learning
- `GET /api/modules` - List all modules with completion data
- `GET /api/modules/:moduleId/sections` - Get sections for a module
- `GET /api/modules/sections/:sectionId` - Get section details

### Questions & Quizzes
- `GET /api/questions/sections/:sectionId/next` - Get next unanswered question
- `GET /api/questions/:questionId` - Get specific question
- `POST /api/questions/:questionId/answer` - Submit answer

### Gamification
- `GET /api/leaderboard` - Get top 10 users by XP

## Database Schema

### Users
- `id` (Primary Key)
- `email` (Unique)
- `password_hash`
- `display_name`
- `avatar_key`
- `total_xp`
- `level`
- `created_at`
- `updated_at`

### Modules
- `id` (Primary Key)
- `name` (Unique)
- `display_name`
- `description`
- `order_index`
- `created_at`

### Sections
- `id` (Primary Key)
- `module_id` (Foreign Key)
- `name`
- `display_name`
- `description`
- `order_index`
- `created_at`

### Questions
- `id` (Primary Key)
- `section_id` (Foreign Key)
- `question_text`
- `options` (JSON)
- `correct_answer`
- `explanation`
- `question_type`
- `created_at`

### User Progress
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `question_id` (Foreign Key)
- `is_correct`
- `selected_answer`
- `xp_awarded`
- `answered_at`

## File Structure

```
├── backend/
│   ├── config.env
│   ├── server.js
│   ├── package.json
│   ├── database/
│   │   └── init.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── modules.js
│   │   ├── questions.js
│   │   └── leaderboard.js
│   └── scripts/
│       └── import-questions.js
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── avatars/
│   │       ├── robot_forest_mint.svg
│   │       ├── robot_ocean_teal.svg
│   │       ├── robot_sky_blue.svg
│   │       ├── robot_sunset_orange.svg
│   │       └── robot_violet_dream.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.js
│   │   │   └── Sidebar.css
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Home.js
│   │   │   ├── Modules.js
│   │   │   └── ...
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── robot_avatars_svg_v3_fullbody/
├── social_engineering_quiz_bank_clean.csv
├── package.json
└── README.md
```

## Development

### Available Scripts

```bash
# Development with Automatic Restart
npm run dev          # Start both backend and frontend with auto-restart
npm run dev:backend  # Start backend only with nodemon
npm run dev:frontend # Start frontend only with hot reload

# Build
npm run build        # Build frontend for production

# Data Import
npm run import-data  # Import questions from CSV

# Installation
npm run install-all  # Install all dependencies
```

### Adding New Questions

1. Add questions to the CSV file following the format:
   ```csv
   module,section,question,options,correct_answer,explanation
   ```

2. Run the import script:
   ```bash
   npm run import-data
   ```

### Customizing Avatars

1. Add new SVG files to `frontend/public/avatars/`
2. Update the avatar options in the registration component
3. Update the avatar mapping in the backend if needed

## Security Features

- **Password Security**: bcryptjs hashing with 12 salt rounds
- **JWT Security**: HttpOnly cookies, secure in production
- **Rate Limiting**: 5 requests per 15 minutes on auth routes
- **Security Headers**: Helmet.js for comprehensive protection
- **CORS**: Configured for development and production
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.
