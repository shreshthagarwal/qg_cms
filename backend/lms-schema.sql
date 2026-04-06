-- LMS (Learning Management System) Schema

-- Create LMS content table
CREATE TABLE IF NOT EXISTS lms_content (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pdf', 'text', 'link')),
    content TEXT NOT NULL,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    assignmentscore DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create LMS assignments table (content assigned to students)
CREATE TABLE IF NOT EXISTS lms_assignments (
    id VARCHAR(255) PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL REFERENCES lms_content(id) ON DELETE CASCADE,
    student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(content_id, student_id)
);

-- Create LMS timeline table (track status changes)
CREATE TABLE IF NOT EXISTS lms_timeline (
    id VARCHAR(255) PRIMARY KEY,
    assignment_id VARCHAR(255) NOT NULL REFERENCES lms_assignments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lms_content_created_by ON lms_content(created_by);
CREATE INDEX IF NOT EXISTS idx_lms_content_type ON lms_content(type);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_content_id ON lms_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_student_id ON lms_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_status ON lms_assignments(status);
CREATE INDEX IF NOT EXISTS idx_lms_timeline_assignment_id ON lms_timeline(assignment_id);

-- Enable Row Level Security (RLS)
ALTER TABLE lms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lms_content (admin full access, students can only view assigned)
CREATE POLICY lms_content_admin_all ON lms_content
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY lms_content_student_view ON lms_content
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM lms_assignments 
        WHERE lms_assignments.content_id = lms_content.id 
        AND lms_assignments.student_id = auth.uid()
    ));

-- RLS Policies for lms_assignments (admin full access, students can only view their own)
CREATE POLICY lms_assignments_admin_all ON lms_assignments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY lms_assignments_student_view ON lms_assignments
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY lms_assignments_student_update ON lms_assignments
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- RLS Policies for lms_timeline (admin full access, students can only view their own)
CREATE POLICY lms_timeline_admin_all ON lms_timeline
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY lms_timeline_student_view ON lms_timeline
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM lms_assignments 
        WHERE lms_assignments.id = lms_timeline.assignment_id 
        AND lms_assignments.student_id = auth.uid()
    ));
