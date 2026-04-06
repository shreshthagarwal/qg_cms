-- Add missing assignmentscore column to lms_content table
ALTER TABLE lms_content 
ADD COLUMN IF NOT EXISTS assignmentscore DECIMAL(5,2);

-- Add comment for documentation
COMMENT ON COLUMN lms_content.assignmentscore IS 'Score for assignment content (0-100)';
