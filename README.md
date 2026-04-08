# 📊 QuantGlobal Education CMS - Project Report

## 🎯 Executive Summary

QuantGlobal Education CMS is a comprehensive educational management system designed to streamline student administration, learning management, and educational analytics. The platform provides separate interfaces for students and administrators, with robust features for attendance tracking, quiz management, assignment handling, and lead management.

---

## 🏗️ System Architecture

### Technology Stack
- **Frontend**: Next.js 14+ with TypeScript, Material-UI (MUI), MUI X-Charts
- **Backend**: Express.js with TypeScript, Multer for file uploads
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with custom provider and JWT tokens

### System Flow
```
┌─────────────────┐    API Calls    ┌──────────────────┐    CRUD     ┌─────────────────┐
│   Frontend     │ ◄──────────────► │   Backend API    │ ◄──────────► │  Supabase DB   │
│   (Next.js)    │                │   (Express.js)   │              │ (PostgreSQL)   │
└─────────────────┘                └──────────────────┘              └─────────────────┘
       │                                │                                │
       ▼                                ▼                                ▼
   User Interface                 Business Logic                   Data Storage
   - Dashboard                   - Authentication                 - Users
   - Forms                      - Authorization                  - Students
   - Reports                    - Validation                     - Attendance
   - Notifications               - File Processing                - Quizzes
```

---

## 🔧 Environment Configuration

### Backend Environment Variables

```bash
# Database Configuration (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# Admin Account Setup (REQUIRED)
ADMIN_EMAIL=admin@quantglobal.com
ADMIN_PASSWORD=your_secure_admin_password_here

# CORS Configuration (REQUIRED for production)
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend Environment Variables

```bash
# API Configuration (REQUIRED)
NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# Authentication Configuration (REQUIRED)
NEXTAUTH_URL=https://your-frontend-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_here_at_least_32_characters

## 🚀 API Documentation

### Lead Generation API

#### Create New Lead
**Endpoint**: `POST /api/leads`

**Request Format**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "message": "Interested in advanced trading courses and certification programs"
}
```

**Response**:
```json
{
  "id": "lead-1234567890-abc123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "message": "Interested in advanced trading courses and certification programs",
  "status": "NEW",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Example cURL Command
```bash
curl -X POST https://your-backend-domain.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "message": "Interested in advanced trading courses and certification programs"
  }'
```

#### Example Node.js Code
```javascript
const response = await fetch('https://your-backend-domain.com/api/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstName: "John",
    lastName: "Doe", 
    email: "john.doe@example.com",
    phone: "9876543210",
    message: "Interested in advanced trading courses and certification programs"
  })
});
```

---

## 📱 User Guide


### Student Portal

**Access**: Students log in via the landing page login button

**Dashboard Overview**:

**Key Features**:

#### 1. Profile Management
- View and edit personal information
- Track course enrollment status
- Monitor fee payment history
- Update contact details

#### 2. Attendance Tracking
- Visual calendar showing daily attendance
- Monthly attendance statistics
- Absence reporting with reasons
- Attendance history export

#### 3. Quiz System
- Active quizzes list with deadlines
- Real-time quiz taking interface
- Anti-cheating monitoring (camera/mic detection)
- Immediate score feedback
- Detailed submission review

#### 4. Assignment Management
- View assigned assignments with deadlines
- Submit assignments with file attachments
- Track submission status
- View graded assignments with feedback

#### 5. Learning Materials
- Access course materials and resources
- Download study materials
- View lecture recordings
- Interactive learning modules

#### 6. Progress Tracking
- Overall academic performance
- Grade history and trends
- Course completion status
- Performance analytics

### Admin Portal

**Access**: Administrators log in via `/admin` route

**Dashboard Overview**:
![Admin Dashboard](./images/admin-dashboard.png)

**Key Features**:

#### 1. Lead Management
- View all prospective student leads
- Track lead conversion status
- Schedule follow-up activities
- Export lead data for analysis

#### 2. Student Admission
- Process student applications
- Create student profiles
- Manage course enrollments
- Generate admission documents

#### 3. Attendance Management
- Mark daily attendance for all students
- Generate attendance reports
- Export attendance data (CSV)
- Track attendance patterns

#### 4. Quiz Management
- Create quizzes with multiple choice questions
- Import questions from Excel files
- Set quiz duration and deadlines
- Monitor quiz submissions
- View detailed quiz analytics

#### 5. Assignment System
- Create and manage assignments
- Set deadlines and requirements
- Grade student submissions
- Provide feedback and scores
- Track submission statistics

#### 6. Learning Management System (LMS)
- Upload and organize course content
- Create learning modules
- Manage educational resources
- Track content engagement

#### 7. Analytics & Reporting
- Student performance metrics
- Course completion rates
- Attendance statistics
- Lead conversion analytics
- Financial reporting

---

## 🗄️ Database Schema

Open the complete-schema.sql and run it in the Supabase SQL Editor to recreate the database schema.
---

## 🚀 Deployment Guide

### Production Deployment (Vercel Recommended)

#### Backend Deployment
```bash
cd backend
vercel --prod
```

**Environment Variables to Set in Vercel Dashboard**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_URL`

#### Frontend Deployment
```bash
cd frontend
vercel --prod
```

**Environment Variables to Set in Vercel Dashboard**:
- `NEXT_PUBLIC_API_URL` (backend Vercel URL)
- `NEXTAUTH_URL` (frontend Vercel URL)
- `NEXTAUTH_SECRET`

#### Traditional VPS
```bash
# Backend
npm install --production
npm start

# Frontend
npm install
npm run build
npm start
```
