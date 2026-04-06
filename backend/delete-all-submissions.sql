-- Delete all assignment submissions (both graded and ungraded)
-- This will permanently remove all submission records from the assignment_submissions table

-- First, let's see how many submissions will be deleted
SELECT COUNT(*) as total_submissions_to_delete 
FROM assignment_submissions;

-- Show a sample of submissions that will be deleted (optional)
SELECT 
  id,
  assignment_id,
  student_id,
  status,
  score,
  submitted_at,
  graded_at
FROM assignment_submissions 
LIMIT 5;

-- WARNING: This action cannot be undone!
-- Uncomment the line below to permanently delete all submissions
-- DELETE FROM assignment_submissions;

-- After deletion, verify all submissions are removed
SELECT COUNT(*) as remaining_submissions 
FROM assignment_submissions;
