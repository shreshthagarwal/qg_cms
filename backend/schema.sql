-- Production Supabase Database Schema for QuantGlobal CMS
-- Run this in Supabase SQL Editor to create tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'STUDENT')),
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'CONVERTED', 'LOST')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  total_fees REAL NOT NULL CHECK (total_fees >= 0),
  paid_fees REAL DEFAULT 0 CHECK (paid_fees >= 0),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Personal Details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob TIMESTAMP WITH TIME ZONE,
  phone TEXT,
  emergency_contact TEXT,
  email TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  pan_number TEXT,
  pan_card_url TEXT,
  aadhaar_number TEXT,
  aadhaar_card_url TEXT,
  photo_url TEXT,
  
  -- Educational Details
  tenth_percentage REAL CHECK (tenth_percentage >= 0 AND tenth_percentage <= 100),
  twelfth_percentage REAL CHECK (twelfth_percentage >= 0 AND twelfth_percentage <= 100),
  tenth_marksheet_url TEXT,
  twelfth_marksheet_url TEXT,
  current_college TEXT,
  college_address TEXT,
  college_city TEXT,
  college_state TEXT,
  cgpa REAL CHECK (cgpa >= 0 AND cgpa <= 10),
  college_marksheet_url TEXT,
  graduating_year INTEGER CHECK (graduating_year >= 2000 AND graduating_year <= 2100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LMS Content table
CREATE TABLE IF NOT EXISTS lms_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('VIDEO', 'PDF', 'ASSIGNMENT', 'LINK')),
  url TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_score REAL CHECK (assignment_score >= 0 AND assignment_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_lms_content_student_id ON lms_content(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_content_type ON lms_content(type);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Student profiles policies
CREATE POLICY "Student profiles view policy" ON student_profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role' = 'ADMIN' OR auth.uid()::text = user_id::text)
  );

CREATE POLICY "Student profiles insert policy" ON student_profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Student profiles update policy" ON student_profiles
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role' = 'ADMIN' OR auth.uid()::text = user_id::text)
  );

-- Attendance policies
CREATE POLICY "Attendance view policy" ON attendance
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role' = 'ADMIN' OR auth.uid()::text = student_id::text)
  );

CREATE POLICY "Attendance insert policy" ON attendance
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'ADMIN');

-- LMS Content policies
CREATE POLICY "LMS content view policy" ON lms_content
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role' = 'ADMIN' OR auth.uid()::text = student_id::text)
  );

CREATE POLICY "LMS content insert policy" ON lms_content
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "LMS content update policy" ON lms_content
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt() ->> 'role' = 'ADMIN' OR 
    (auth.uid()::text = student_id::text AND type = 'ASSIGNMENT'))
  );

-- Leads policies
CREATE POLICY "Leads view policy" ON leads
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Leads insert policy" ON leads
  FOR INSERT WITH CHECK (true); -- Public lead submission

CREATE POLICY "Leads update policy" ON leads
  FOR UPDATE USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'ADMIN');

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lms_content_updated_at BEFORE UPDATE ON lms_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for student documents (run this in Supabase Storage section)
-- Bucket name: student-documents
-- Public: YES
-- File size limit: 10MB
-- Allowed MIME types: image/*, application/pdf
