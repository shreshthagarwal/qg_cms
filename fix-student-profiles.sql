-- =================================================================
-- Database Migration Script: Fix Student Profiles Field Names
-- =================================================================
-- This script fixes existing student_profiles that have user_id instead of userid
-- Run this in Supabase SQL Editor before using delete student functionality
-- =================================================================

-- Step 1: Add temporary userid column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' 
        AND column_name = 'userid'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN userid TEXT;
    END IF;
END $$;

-- Step 2: Update userid field with data from user_id field
UPDATE student_profiles 
SET userid = user_id 
WHERE user_id IS NOT NULL AND userid IS NULL;

-- Step 3: Drop the old user_id column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE student_profiles DROP COLUMN user_id;
    END IF;
END $$;

-- Step 4: Make sure userid is NOT NULL and has UNIQUE constraint
ALTER TABLE student_profiles 
ALTER COLUMN userid SET NOT NULL;

-- Step 5: Add UNIQUE constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'student_profiles' 
        AND constraint_name = 'student_profiles_userid_key'
    ) THEN
        ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_userid_key UNIQUE (userid);
    END IF;
END $$;

-- Step 6: Verify the migration worked
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN userid IS NOT NULL THEN 1 END) as profiles_with_userid,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as profiles_with_user_id
FROM student_profiles;

-- =================================================================
-- Migration Complete!
-- =================================================================
-- After running this script:
-- 1. All student_profiles will use 'userid' field (not 'user_id')
-- 2. Foreign key constraints should work properly
-- 3. Delete student functionality should work correctly
-- =================================================================
