-- Fix student profile database structure for delete operations
-- Run this in Supabase SQL Editor

-- Step 1: Remove college address columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'collegeaddress') THEN
        ALTER TABLE student_profiles DROP COLUMN IF EXISTS collegeaddress;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'collegecity') THEN
        ALTER TABLE student_profiles DROP COLUMN IF EXISTS collegecity;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'collegestate') THEN
        ALTER TABLE student_profiles DROP COLUMN IF EXISTS collegestate;
    END IF;
END $$;

-- Step 2: Remove user_id column if it exists (use only userid)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'user_id') THEN
        -- Copy data from user_id to userid if userid is null
        UPDATE student_profiles SET userid = user_id WHERE userid IS NULL AND user_id IS NOT NULL;
        -- Drop the user_id column
        ALTER TABLE student_profiles DROP COLUMN IF EXISTS user_id;
    END IF;
END $$;

-- Step 3: Ensure proper foreign key constraint on userid
DO $$
BEGIN
    -- Remove any existing constraints on userid
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'student_profiles' AND constraint_name LIKE '%userid%') THEN
        ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_userid_fkey;
    END IF;
    
    -- Add the correct foreign key constraint with CASCADE delete
    ALTER TABLE student_profiles 
    ADD CONSTRAINT student_profiles_userid_fkey 
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE;
    
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, continue
        NULL;
END $$;

-- Step 4: Clean up orphaned records
DELETE FROM student_profiles 
WHERE userid NOT IN (SELECT id FROM users);

-- Step 5: Verify the structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_profiles' 
ORDER BY ordinal_position;

SELECT 'Migration completed successfully' as status;
