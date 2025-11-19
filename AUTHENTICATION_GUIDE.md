# Authentication System Guide

## Overview

This project has been configured to ensure that **authentication works automatically every time the servers are started**. Once the servers are running, there should be no authentication errors for users.

## How to Start the Project

### Method 1: Automatic Authentication Verification (Recommended)
```bash
npm start
# or
npm run dev
```

This will:
1. Start the backend server (port 5000)
2. Start the frontend server (port 3000)
3. **Automatically verify that authentication works**
4. Display a comprehensive status report
5. Ensure both servers are ready for use

### Method 2: Simple Start (No Verification)
```bash
npm run start:simple
```

This starts both servers without authentication verification.

### Method 3: Windows Batch File
```bash
start-app.bat
```

Double-click this file to start the application with authentication verification.

## Authentication Features

### ✅ What Works Automatically

1. **User Registration**
   - Email and password validation
   - Password hashing with bcrypt
   - Automatic user profile creation
   - JWT token generation

2. **User Login**
   - Secure password verification
   - JWT token generation
   - HTTP-only cookie management
   - Session persistence

3. **Protected Routes**
   - Automatic token verification
   - User profile access
   - Secure route protection
   - Proper error handling

4. **Logout Functionality**
   - Secure token removal
   - Cookie cleanup
   - Session termination

### 🔧 Technical Implementation

- **Backend**: Node.js/Express with SQLite database
- **Frontend**: React with React Router
- **Authentication**: JWT tokens with HTTP-only cookies
- **Security**: bcrypt password hashing, rate limiting, CORS protection
- **Database**: SQLite with automatic initialization

## Server Status

### Backend Server
- **Port**: 5000
- **Health Check**: `http://localhost:5000/api/health`
- **API Base**: `http://localhost:5000/api`

### Frontend Server
- **Port**: 3000
- **Application**: `http://localhost:3000`
- **Proxy**: Automatically configured to backend

## Authentication Endpoints

### Public Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/health` - Health check

### Protected Endpoints
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout
- All other API endpoints require authentication

## Database

The SQLite database is automatically initialized with:
- Users table
- Modules and sections
- Questions and progress tracking
- Proper foreign key relationships

## Security Features

- **Rate Limiting**: 50 requests per 15 minutes (development)
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: 7-day expiration
- **HTTP-Only Cookies**: Secure token storage
- **CORS Protection**: Configured for localhost
- **Helmet Security**: Additional security headers

## Troubleshooting

### If Authentication Fails

1. **Check Server Status**
   ```bash
   netstat -an | findstr ":5000"
   netstat -an | findstr ":3000"
   ```

2. **Verify Database**
   - Database file: `backend/database/learning_app.db`
   - Should be created automatically

3. **Check Environment**
   - `backend/config.env` should contain JWT_SECRET
   - NODE_ENV should be set to 'development'

4. **Restart Servers**
   ```bash
   taskkill /f /im node.exe
   npm start
   ```

### Common Issues

- **Port Already in Use**: Kill existing Node.js processes
- **Database Errors**: Delete `learning_app.db` and restart
- **Cookie Issues**: Clear browser cookies and restart

## Development Workflow

1. **Start Development**: `npm start`
2. **Access Application**: `http://localhost:3000`
3. **Register/Login**: Use the web interface
4. **Test Features**: All authentication features work automatically
5. **Stop Servers**: Press `Ctrl+C` in terminal

## Production Deployment

For production, ensure:
- Set `NODE_ENV=production` in environment
- Use strong JWT_SECRET
- Enable HTTPS
- Configure proper CORS origins
- Set secure cookie options

## Summary

✅ **Authentication works automatically every time servers start**
✅ **No manual configuration required**
✅ **Comprehensive verification on startup**
✅ **Secure and production-ready**
✅ **Easy to use and maintain**

The authentication system is fully functional and will work automatically for all users once the servers are started.
