# 🚀 QuantGlobal Education CMS

A comprehensive educational management system built with Next.js, Express.js, and Supabase.

## 📋 Table of Contents

- [🏗 **Architecture Overview](#-architecture-overview)
- [🚀 **Quick Start Guide](#-quick-start-guide)
- [🔧 **Environment Setup](#-environment-setup)
- [🌐 **Deployment Guide](#-deployment-guide)
- [📊 **Features](#-features)
- [🗄️ **Database Schema](#-database-schema)
- [🔐 **Security](#-security)
- [🐛 **Troubleshooting](#-troubleshooting)

---

## 🏗 Architecture Overview

### 🎯 **Tech Stack**
- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with custom provider
- **File Handling**: Link-based (Google Drive, etc.)
- **Styling**: Material-UI (MUI)
- **Charts**: MUI X-Charts

### 🔄 **Data Flow**
```
Frontend (Next.js) ↔ Backend API (Express.js) ↔ Supabase Database
      ↓                          ↓                    ↓
   API Calls                 CRUD Operations        SQL Queries
   Environment Variables         Environment Variables    Tables
```

---

## 🚀 Quick Start Guide

### 📋 Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase project with database URL and service key

### ⚡ Local Development Setup

#### 1. **Backend Setup**
```bash
cd backend
cp .env.production .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

#### 2. **Frontend Setup**
```bash
cd frontend
cp env.production.example .env.local
# Edit .env.local with your backend URL
npm install
npm run dev
```

### 🔗 **Local URLs**
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- API: Frontend calls `http://localhost:5000/api/*`

---

## 🔧 Environment Setup

### 📋 **Backend Environment Variables**

#### **Production (.env)**
```bash
# Supabase Database (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# Admin Account (REQUIRED)
ADMIN_EMAIL=admin@quantglobal.com
ADMIN_PASSWORD=your_secure_admin_password_here

# CORS Configuration (REQUIRED for production)
FRONTEND_URL=https://your-frontend-domain.com

# Server Configuration (OPTIONAL)
PORT=5000
NODE_ENV=production
```

#### **Development (.env.local)**
```bash
# Use your local Supabase project for development
SUPABASE_URL=https://your-dev-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_dev_service_key_here
ADMIN_EMAIL=admin@quantglobal.com
ADMIN_PASSWORD=dev_password_here
FRONTEND_URL=http://localhost:3000
```

### 📋 **Frontend Environment Variables**

#### **Production (.env.local)**
```bash
# API Configuration (REQUIRED)
NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# Authentication Configuration (REQUIRED)
NEXTAUTH_URL=https://your-frontend-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_here_at_least_32_characters
```

#### **Development (.env.local)**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev_secret_here_at_least_32_characters
```

### 🌐 **Environment Variable Reference**

| Variable | Purpose | Used In | Required |
|-----------|----------|----------|----------|
| `SUPABASE_URL` | Database connection | `database.ts` | ✅ |
| `SUPABASE_SERVICE_KEY` | Database auth | `database.ts` | ✅ |
| `ADMIN_EMAIL` | Admin account | `adminInitializer.ts` | ✅ |
| `ADMIN_PASSWORD` | Admin password | `adminInitializer.ts` | ✅ |
| `FRONTEND_URL` | CORS config | `index.ts` | ✅ |
| `NEXT_PUBLIC_API_URL` | API calls | All frontend files | ✅ |
| `NEXTAUTH_URL` | Auth callbacks | `auth.ts` | ✅ |
| `NEXTAUTH_SECRET` | JWT signing | `auth.ts` | ✅ |

---

## 🌐 Deployment Guide

### 🚀 **Vercel Deployment (Recommended)**

#### **1. Backend Deployment**
```bash
cd backend
vercel --prod
# Set environment variables in Vercel dashboard:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY  
# - ADMIN_EMAIL
# - ADMIN_PASSWORD
# - FRONTEND_URL
```

#### **2. Frontend Deployment**
```bash
cd frontend
vercel --prod
# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_API_URL (backend Vercel URL)
# - NEXTAUTH_URL (frontend Vercel URL)
# - NEXTAUTH_SECRET
```

#### **3. Environment Variable Mapping for Vercel**
```bash
# Backend Vercel URL becomes:
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app

# Frontend Vercel URL becomes:
NEXTAUTH_URL=https://your-frontend-domain.vercel.app
NEXTAUTH_SECRET=your_secure_secret
```

### 🐳 **Other Deployment Options**

#### **Docker**
```bash
# Backend
docker build -t quantglobal-backend .
docker run -p 5000:5000 --env-file .env

# Frontend  
docker build -t quantglobal-frontend .
docker run -p 3000:3000 --env-file .env.local
```

#### **Traditional VPS**
```bash
# Backend
npm install --production
npm start

# Frontend
npm install
npm run build
npm start
```

---

## 📊 Features

### 👥 **Student Dashboard**
- Profile management with course information
- Attendance tracking with visual calendar
- Assignment submission with deadline enforcement
- Quiz taking with camera/mic monitoring
- Trading reports and analytics
- Real-time notifications
- Progress tracking and grades

### 👨 **Admin Dashboard**
- Lead management and conversion tracking
- Student admission and profile management
- Attendance management with CSV export
- Assignment creation and grading
- Quiz creation with Excel import
- LMS content management
- Trading report analysis
- Feedback collection and management

### 🔐 **Security Features**
- JWT-based authentication with NextAuth
- Role-based access control (ADMIN/STUDENT)
- CORS protection for cross-origin requests
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- File upload restrictions (file type, size limits)

### 📈 **Analytics & Reporting**
- Attendance statistics with export functionality
- Lead conversion tracking
- Student performance metrics
- Quiz analytics and grading reports
- Trading performance charts
- Feedback sentiment analysis

---

## 🗄️ Database Schema

### 📋 **Core Tables**
- **users**: User accounts and authentication
- **student_profiles**: Student information and course details
- **attendance**: Attendance records with status tracking
- **quizzes**: Quiz definitions and questions
- **quiz_submissions**: Quiz attempts and scores
- **assignments**: Assignment definitions and submissions
- **lms_content**: Educational content and materials
- **leads**: Potential student information
- **feedback**: User feedback and ratings

### 🗂️ **Schema Files**
- `schema.sql`: Main production schema with UUIDs
- `quiz-schema.sql`: Quiz-specific tables
- `lms-schema.sql`: LMS content management
- `feedback-schema.sql`: Feedback collection system

---

## 🔐 Security

### 🛡️ **Authentication Flow**
1. **Login**: Email/password with JWT tokens
2. **Session Management**: Secure HTTP-only cookies
3. **Role-Based Access**: ADMIN vs STUDENT permissions
4. **Password Security**: bcrypt hashing with salt

### 🔒 **API Security**
- **CORS**: Configured for production domains
- **Rate Limiting**: Implemented on sensitive endpoints
- **Input Validation**: All user inputs validated
- **SQL Injection**: Parameterized queries only
- **Environment Variables**: No hardcoded credentials

---

## 🐛 Troubleshooting

### 🔧 **Common Issues**

#### **Database Connection**
```bash
# Check Supabase URL and service key
Error: "Invalid API key" → Verify SUPABASE_SERVICE_KEY
Error: "Database not found" → Run schema.sql in Supabase
```

#### **Authentication Issues**
```bash
# Clear browser cookies for NextAuth issues
Error: "Invalid session" → Check NEXTAUTH_SECRET matches
```

#### **CORS Issues**
```bash
# Check FRONTEND_URL matches your domain
Error: "CORS policy" → Verify environment variables
```

#### **File Upload Issues**
```bash
# File uploads are link-based only
Error: "File too large" → Use external file hosting
```

### 📞 **Debug Mode**
```bash
# Backend
DEBUG=quantglobal npm run dev

# Frontend
DEBUG=next npm run dev
```

---

## 🤝 Contributing

### 📋 **Development Setup**
1. Fork the repository
2. Clone your fork locally
3. Run `npm install` in both `backend/` and `frontend/`
4. Set up environment variables (see Environment Setup)
5. Start development servers:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend  
   cd frontend && npm run dev
   ```

### 📝 **Code Style Guidelines**
- Use TypeScript for all new code
- Follow ESLint configuration
- Write meaningful commit messages
- Use conventional commits: `feat:`, `fix:`, `docs:`
- Test your changes before submitting

### 🐛 **Issue Reporting**
- Use GitHub Issues with appropriate labels
- Provide steps to reproduce bugs
- Include environment details in bug reports
- Follow the template provided in `.github/ISSUE_TEMPLATE`

---

## 📄 **License**

MIT License - feel free to use this project for personal or commercial purposes.

---

## 👥 **Support**

For support and questions:
- 📧 **Technical Issues**: Check troubleshooting section first
- 📧 **Feature Requests**: Open GitHub issue with `enhancement` label
- 📧 **Security Concerns**: Report privately via email

---

## 🎉 **Ready to Deploy!**

1. **Set up environment variables** (see Environment Setup)
2. **Choose deployment method** (Vercel recommended)
3. **Follow deployment guide** for your chosen platform
4. **Test functionality** in production environment

**Happy coding!** 🚀
