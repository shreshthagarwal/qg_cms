-- Quiz Tables Schema

-- Quizzes table
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

-- Quiz assignments table
CREATE TABLE IF NOT EXISTS quiz_assignments (
    id VARCHAR(255) PRIMARY KEY,
    quiz_id VARCHAR(255) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    status VARCHAR(50) DEFAULT 'active',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id VARCHAR(255) PRIMARY KEY,
    quiz_id VARCHAR(255) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB,
    score INTEGER,
    window_switches INTEGER DEFAULT 0,
    time_spent INTEGER,
    cheating_flagged BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_id ON quiz_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_status ON quiz_assignments(status);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_status ON quiz_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_submitted_at ON quiz_submissions(submitted_at);
