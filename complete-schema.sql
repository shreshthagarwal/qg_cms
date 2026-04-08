-- =================================================================
-- QuantGlobal Education CMS - Updated Complete Database Schema
-- =================================================================
-- This file matches the actual database structure from your Supabase instance
-- Run this in Supabase SQL Editor to recreate the complete database.
-- =================================================================

-- Enable UUID extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- CORE USER MANAGEMENT TABLES
-- =================================================================

-- Users table - Core authentication and user management
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT to match actual database
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  firstname TEXT NOT NULL,  -- Changed from first_name to firstname
  lastname TEXT,  -- Changed from last_name to lastname
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Note: updated_at column is missing in actual database
);

-- Student Profiles table - Extended student information
CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  userid TEXT UNIQUE NOT NULL REFERENCES users(id),  -- Only userid exists, no user_id
  
  -- Course Information
  coursename TEXT NOT NULL,  -- Changed from course_name to coursename
  role TEXT DEFAULT 'Student',  -- Additional role field
  durationmonths INTEGER NOT NULL,  -- Changed from duration_months to durationmonths
  totalfees REAL NOT NULL,  -- Changed from total_fees to totalfees
  paidfees REAL DEFAULT 0,  -- Changed from paid_fees to paidfees
  startdate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- Changed from start_date to startdate
  enddate TIMESTAMP WITH TIME ZONE,  -- Changed from end_date to enddate
  
  -- Personal Details
  firstname TEXT NOT NULL,  -- Changed from first_name to firstname
  lastname TEXT NOT NULL,  -- Changed from last_name to lastname
  dob TIMESTAMP WITH TIME ZONE,
  phone TEXT,
  emergencycontact TEXT,  -- Changed from emergency_contact to emergencycontact
  addressline1 TEXT,  -- Changed from address_line1 to addressline1
  addressline2 TEXT,  -- Changed from address_line2 to addressline2
  city TEXT,
  state TEXT,
  pincode TEXT,
  pannumber TEXT,  -- Changed from pan_number to pannumber
  pancardurl TEXT,  -- Changed from pan_card_url to pancardurl
  aadhaarnumber TEXT,  -- Changed from aadhaar_number to aadhaarnumber
  aadhaarcardurl TEXT,  -- Changed from aadhaar_card_url to aadhaarcardurl
  photourl TEXT,  -- Changed from photo_url to photourl
  
  -- Educational Details
  tenthpercentage REAL,  -- Changed from tenth_percentage to tenthpercentage
  tenthmarksheeturl TEXT,  -- Changed from tenth_marksheet_url to tenthmarksheeturl
  twelfthpercentage REAL,  -- Changed from twelfth_percentage to twelfthpercentage
  twelfthmarksheeturl TEXT,  -- Changed from twelfth_marksheet_url to twelfthmarksheeturl
  currentcollege TEXT,  -- Changed from current_college to currentcollege
  collegeaddress TEXT,  -- Changed from college_address to collegeaddress
  collegecity TEXT,  -- Changed from college_city to collegecity
  collegestate TEXT,  -- Changed from college_state to collegestate
  cgpa REAL,
  collegemarksheeturl TEXT,  -- Changed from college_marksheet_url to collegemarksheeturl
  graduatingyear INTEGER,  -- Changed from graduating_year to graduatingyear
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Note: updated_at column is missing in actual database
  -- Note: email field is missing in actual database
);

-- =================================================================
-- LEAD MANAGEMENT TABLES
-- =================================================================

-- Leads table - Potential student leads
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  firstname TEXT NOT NULL,  -- Changed from first_name to firstname
  lastname TEXT NOT NULL,  -- Changed from last_name to lastname
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'CONVERTED', 'UNSUCCESSFUL')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Note: updated_at column is missing in actual database
);

-- =================================================================
-- ATTENDANCE MANAGEMENT TABLES
-- =================================================================

-- Attendance table - Student attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,  -- Changed from UUID to TEXT
  studentid TEXT NOT NULL REFERENCES users(id),  -- Only studentid exists, no student_id
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Note: updated_at column is missing in actual database
  -- Note: student_id column is missing in actual database
);

-- =================================================================
-- QUIZ SYSTEM TABLES
-- =================================================================

-- Quizzes table - Quiz definitions
CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 60,
  questions JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Assignments table - Assign quizzes to students
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id VARCHAR(255) PRIMARY KEY,
  quiz_id VARCHAR(255) NOT NULL REFERENCES quizzes(id),
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  status VARCHAR(50) DEFAULT 'active',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Submissions table - Student quiz attempts
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id VARCHAR(255) PRIMARY KEY,
  quiz_id VARCHAR(255) NOT NULL REFERENCES quizzes(id),
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  answers JSONB,
  score INTEGER,
  window_switches INTEGER DEFAULT 0,
  time_spent INTEGER,
  cheating_flagged BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- ASSIGNMENT SYSTEM TABLES
-- =================================================================

-- Assignments table - Assignment definitions
CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  instructions TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by VARCHAR(255),  -- Changed from UUID to VARCHAR(255)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,  -- Additional field for compatibility
  link TEXT  -- Additional field for compatibility
);

-- Assignment Assignments table - Assign assignments to students
CREATE TABLE IF NOT EXISTS assignment_assignments (
  id VARCHAR(255) PRIMARY KEY,
  assignment_id VARCHAR(255) NOT NULL REFERENCES assignments(id),
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'graded'))
);

-- Assignment Submissions table - Student assignment submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id VARCHAR(255) PRIMARY KEY,
  assignment_id VARCHAR(255) NOT NULL REFERENCES assignments(id),
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  file_url TEXT,
  github_link TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
  score INTEGER CHECK (score >= 0 AND score <= 100),  -- Changed from DECIMAL(5,2) to INTEGER
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by VARCHAR(255)
);

-- =================================================================
-- LEARNING MANAGEMENT SYSTEM (LMS) TABLES
-- =================================================================

-- LMS Content table - Educational content
CREATE TABLE IF NOT EXISTS lms_content (
  id TEXT PRIMARY KEY,  -- Changed from VARCHAR(255) to TEXT
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('pdf', 'text', 'link', 'video')),  -- Simplified check constraint
  content TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),  -- Changed from UUID to TEXT
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Note: url field is missing in actual database
  -- Note: assignmentscore field is missing in actual database
);

-- LMS Assignments table - Content assigned to students
CREATE TABLE IF NOT EXISTS lms_assignments (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES lms_content(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- LMS Timeline table - Track status changes
CREATE TABLE IF NOT EXISTS lms_timeline (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES lms_assignments(id),
  status TEXT NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  updated_by TEXT REFERENCES users(id)
);

-- =================================================================
-- FEEDBACK SYSTEM TABLES
-- =================================================================

-- Feedback table - Student feedback
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,  -- Changed from UUID to SERIAL
  student_name VARCHAR(255) NOT NULL,
  student_id VARCHAR(255) REFERENCES users(id),
  feedback TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,  -- Changed to WITHOUT TIME ZONE
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP  -- Changed to WITHOUT TIME ZONE
);

-- =================================================================
-- ANNOUNCEMENTS SYSTEM TABLES
-- =================================================================

-- Announcements table - System announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all',
  target_student_ids ARRAY,  -- Changed from TEXT[] to ARRAY
  created_by TEXT NOT NULL,  -- Changed from UUID to TEXT, added NOT NULL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Note: updated_at column is missing in actual database
);

-- Announcement Reads table - Track which students read announcements
CREATE TABLE IF NOT EXISTS announcement_reads (
  id SERIAL PRIMARY KEY,  -- Changed from UUID to SERIAL
  announcement_id TEXT NOT NULL REFERENCES announcements(id),
  student_id TEXT NOT NULL,  -- Changed from UUID to TEXT
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- TRADING SYSTEM TABLES
-- =================================================================

-- Trading Strategies table - Student trading strategies
CREATE TABLE IF NOT EXISTS trading_strategies (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code TEXT NOT NULL,  -- Added NOT NULL constraint
  symbol VARCHAR(255) DEFAULT 'NSE:NIFTY50',  -- Added default value
  timeframe VARCHAR(255) DEFAULT '1D',  -- Added default value
  initial_capital NUMERIC DEFAULT 100000.00,  -- Changed from DECIMAL to NUMERIC
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strategy Backtests table - Backtest results
CREATE TABLE IF NOT EXISTS strategy_backtests (
  id VARCHAR(255) PRIMARY KEY,
  strategy_id VARCHAR(255) NOT NULL REFERENCES trading_strategies(id),
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  -- Performance metrics
  total_return NUMERIC,
  annual_return NUMERIC,
  max_drawdown NUMERIC,
  sharpe_ratio NUMERIC,
  sortino_ratio NUMERIC,
  win_rate NUMERIC,
  profit_factor NUMERIC,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  initial_capital NUMERIC,
  final_capital NUMERIC,
  gross_profit NUMERIC,
  gross_loss NUMERIC,
  net_profit NUMERIC,
  
  -- Additional fields from actual database
  trades_data JSONB,
  equity_curve JSONB,
  monthly_returns JSONB,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Paper Trades table - Paper trading records
CREATE TABLE IF NOT EXISTS paper_trades (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  strategy_id VARCHAR(255) REFERENCES trading_strategies(id),
  symbol VARCHAR(255) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity INTEGER NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  pnl NUMERIC,
  pnl_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily P&L Reports table - Daily trading reports
CREATE TABLE IF NOT EXISTS daily_pnl_reports (
  id VARCHAR(255) PRIMARY KEY,  -- Changed from UUID to VARCHAR(255)
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),  -- Changed from UUID to VARCHAR(255)
  report_date DATE NOT NULL,
  
  -- Fields from actual database
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  gross_pnl NUMERIC DEFAULT 0,
  net_pnl NUMERIC DEFAULT 0,
  starting_capital NUMERIC,
  ending_capital NUMERIC,
  strategies_used ARRAY,  -- Changed from TEXT[] to ARRAY
  backtests_run INTEGER DEFAULT 0,
  
  -- Standard fields
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  
  -- Note: instrument, daily_pnl, strategy_name, strategy_description, results_doc_link, status fields are missing
);

-- Trading Reports table - Simplified trading reports
CREATE TABLE IF NOT EXISTS trading_reports (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL REFERENCES users(id),
  report_date DATE NOT NULL,
  instrument VARCHAR(255) NOT NULL,
  daily_pnl NUMERIC NOT NULL,
  strategy_name VARCHAR(255) NOT NULL,
  strategy_description TEXT,
  results_doc_link TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reviewed')),  -- Updated check constraint
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,  -- Changed from notes to admin_notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- INDEXES FOR PERFORMANCE
-- =================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Student profiles indexes
CREATE INDEX IF NOT EXISTS idx_student_profiles_userid ON student_profiles(userid);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_studentid ON attendance(studentid);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- Quiz indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_id ON quiz_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);

-- Assignment indexes
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignment_assignments_assignment_id ON assignment_assignments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_assignments_student_id ON assignment_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);

-- LMS indexes
CREATE INDEX IF NOT EXISTS idx_lms_content_created_by ON lms_content(created_by);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_content_id ON lms_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_student_id ON lms_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_timeline_assignment_id ON lms_timeline(assignment_id);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_student_id ON feedback(student_id);

-- Announcement indexes
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_student_id ON announcement_reads(student_id);

-- Trading indexes
CREATE INDEX IF NOT EXISTS idx_trading_strategies_student_id ON trading_strategies(student_id);
CREATE INDEX IF NOT EXISTS idx_strategy_backtests_strategy_id ON strategy_backtests(strategy_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_student_id ON paper_trades(student_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_strategy_id ON paper_trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_daily_pnl_reports_student_id ON daily_pnl_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_trading_reports_student_id ON trading_reports(student_id);

-- =================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pnl_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_reports ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (simplified versions)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- =================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables that have updated_at columns
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_content_updated_at BEFORE UPDATE ON lms_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_assignments_updated_at BEFORE UPDATE ON lms_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON trading_strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_reports_updated_at BEFORE UPDATE ON trading_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- COMPLETION MESSAGE
-- =================================================================

-- Database schema creation complete!
-- This schema now matches your actual Supabase database structure