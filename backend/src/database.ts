import { createClient } from '@supabase/supabase-js';

let supabase: any = null;
let db: any = null;

// Initialize Supabase client only when needed
function initializeSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

// Database helper functions
export function getDb() {
  if (!db) {
    const client = initializeSupabase();
    
    db = {
      // Users
      async findUser(email: string) {
        const { data, error } = await client
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (error) throw error;
        return data;
      },

      async createUser(userData: any) {
        const { data, error } = await client
          .from('users')
          .insert({
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...userData
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async findAllUsers() {
        const { data, error } = await client
          .from('users')
          .select('*')
          .eq('role', 'STUDENT');
        
        if (error) throw error;
        return data || [];
      },

      async findAllStudentsWithProfiles() {
        // First get all students
        const { data: students, error: studentsError } = await client
          .from('users')
          .select('*')
          .eq('role', 'STUDENT');
        
        if (studentsError) throw studentsError;
        
        // Then get all student profiles
        const { data: profiles, error: profilesError } = await client
          .from('student_profiles')
          .select('*');
        
        if (profilesError) throw profilesError;
        
        // Combine the data
        return students.map(student => ({
          ...student,
          student_profiles: profiles.find(profile => 
            profile.userid === student.id
          ) || null
        }));
      },

      // Leads
      async createLead(leadData: any) {
        const { data, error } = await client
          .from('leads')
          .insert({
            id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...leadData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async findAllLeads() {
        const { data, error } = await client
          .from('leads')
          .select('*')
          .in('status', ['NEW', 'CONTACTED'])
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },

      async findArchivedLeads() {
        const { data, error } = await client
          .from('leads')
          .select('*')
          .in('status', ['CONVERTED', 'UNSUCCESSFUL'])
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },

      async updateLeadStatus(id: string, status: string) {
        const { data, error } = await client
          .from('leads')
          .update({ status })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async findLeadById(id: string) {
        const { data, error } = await client
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      },

      // Student Profiles
      async createStudentProfile(profileData: any) {
        const { data, error } = await client
          .from('student_profiles')
          .insert({
            id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...profileData
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async findStudentProfile(userId: string) {
        const { data, error } = await client
          .from('student_profiles')
          .select('*')
          .eq('userid', userId)
          .single();
        
        if (error) throw error;
        return data;
      },

      // Attendance
      async createAttendance(attendanceData: any) {
        const { data, error } = await client
          .from('attendance')
          .insert({
            id: `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...attendanceData
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async findStudentAttendance(studentId: string) {
        const { data, error } = await client
          .from('attendance')
          .select('*')
          .eq('studentid', studentId)
          .order('date', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },

      async findStudentLmsContent(studentId: string) {
        // Get all assignments for this student with their content details
        const { data: assignments, error: assignmentError } = await client
          .from('lms_assignments')
          .select('*')
          .eq('student_id', studentId);
        
        if (assignmentError) {
          console.error('Error fetching student LMS assignments:', assignmentError);
          return [];
        }
        
        if (!assignments || assignments.length === 0) {
          return [];
        }
        
        // Get unique content IDs
        const contentIds = [...new Set(assignments.map(a => a.content_id))];
        
        // Fetch content separately
        const { data: contentList, error: contentError } = await client
          .from('lms_content')
          .select('id, title, type, content, assignmentscore')
          .in('id', contentIds);
        
        if (contentError) {
          console.error('Error fetching content:', contentError);
        }
        
        // Create content lookup map
        const contentMap = new Map();
        contentList?.forEach(c => contentMap.set(c.id, c));
        
        // Merge assignment data with content data
        return assignments.map((assignment: any) => {
          const content = contentMap.get(assignment.content_id);
          return {
            id: assignment.id,
            contentId: assignment.content_id,
            title: content?.title || 'Untitled',
            type: content?.type || 'unknown',
            content: content?.content || '',
            assignmentscore: content?.assignmentscore || null,
            status: assignment.status,
            notes: assignment.notes,
            assignedAt: assignment.assigned_at,
            updatedAt: assignment.updated_at
          };
        });
      },

      // ==================== LMS METHODS ====================

      async createLmsContent(contentData: any) {
        const { data, error } = await client
          .from('lms_content')
          .insert({
            id: contentData.id,
            title: contentData.title,
            type: contentData.type,
            content: contentData.content,
            created_by: contentData.createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating LMS content:', error);
          throw error;
        }
        return data;
      },

      async getAllLmsContent() {
        const { data, error } = await client
          .from('lms_content')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching LMS content:', error);
          return [];
        }
        return data || [];
      },

      async deleteLmsContent(contentId: string) {
        const { error } = await client
          .from('lms_content')
          .delete()
          .eq('id', contentId);
        
        if (error) {
          console.error('Error deleting LMS content:', error);
          throw error;
        }
        return true;
      },

      async createLmsAssignment(assignmentData: any) {
        console.log('DB: Creating assignment with data:', assignmentData);
        const { data, error } = await client
          .from('lms_assignments')
          .insert({
            id: assignmentData.id,
            content_id: assignmentData.contentId,
            student_id: assignmentData.studentId,
            status: assignmentData.status,
            notes: assignmentData.notes || '',
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.error('DB Error creating LMS assignment:', error);
          throw error;
        }
        console.log('DB: Assignment created successfully:', data);
        return data;
      },

      async getAllLmsAssignments() {
        console.log('DB: Fetching all LMS assignments...');
        
        // Fetch assignments without joins (FK constraints removed)
        const { data: assignments, error: assignmentsError } = await client
          .from('lms_assignments')
          .select('*')
          .order('assigned_at', { ascending: false });
        
        if (assignmentsError) {
          console.error('DB Error fetching LMS assignments:', assignmentsError);
          return [];
        }
        
        if (!assignments || assignments.length === 0) {
          console.log('DB: No assignments found');
          return [];
        }
        
        // Get unique content IDs
        const contentIds = [...new Set(assignments.map(a => a.content_id))];
        
        // Fetch content separately
        const { data: contentList, error: contentError } = await client
          .from('lms_content')
          .select('id, title, type')
          .in('id', contentIds);
        
        if (contentError) {
          console.error('DB Error fetching content:', contentError);
        }
        
        // Create content lookup map
        const contentMap = new Map();
        contentList?.forEach(c => contentMap.set(c.id, c));
        
        // Get unique student IDs
        const studentIds = [...new Set(assignments.map(a => a.student_id))];
        
        // Fetch students separately
        const { data: students, error: studentsError } = await client
          .from('users')
          .select('id, firstname, lastname, email')
          .in('id', studentIds);
        
        if (studentsError) {
          console.error('DB Error fetching students:', studentsError);
        }
        
        // Create student lookup map
        const studentMap = new Map();
        students?.forEach(s => studentMap.set(s.id, s));
        
        console.log(`DB: Found ${assignments.length} assignments`);
        
        return assignments.map((assignment: any) => {
          const content = contentMap.get(assignment.content_id);
          const student = studentMap.get(assignment.student_id);
          
          return {
            id: assignment.id,
            contentId: assignment.content_id,
            contentTitle: content?.title || 'Untitled',
            contentType: content?.type || 'unknown',
            studentId: assignment.student_id,
            studentName: student ? `${student.firstname} ${student.lastname}` : 'Unknown',
            studentEmail: student?.email || 'Unknown',
            status: assignment.status,
            notes: assignment.notes,
            assignedAt: assignment.assigned_at,
            completedAt: assignment.completed_at,
            updatedAt: assignment.updated_at
          };
        });
      },

      async getStudentLmsAssignments(studentId: string) {
        console.log('DB: Fetching assignments for student:', studentId);
        
        // Fetch assignments without joins (FK constraints removed)
        const { data: assignments, error: assignmentsError } = await client
          .from('lms_assignments')
          .select('*')
          .eq('student_id', studentId)
          .order('assigned_at', { ascending: false });
        
        if (assignmentsError) {
          console.error('DB Error fetching student assignments:', assignmentsError);
          return [];
        }
        
        if (!assignments || assignments.length === 0) {
          console.log(`DB: No assignments found for student ${studentId}`);
          return [];
        }
        
        // Get unique content IDs
        const contentIds = [...new Set(assignments.map(a => a.content_id))];
        
        // Fetch content separately
        const { data: contentList, error: contentError } = await client
          .from('lms_content')
          .select('id, title, type, content')
          .in('id', contentIds);
        
        if (contentError) {
          console.error('DB Error fetching content:', contentError);
        }
        
        // Create content lookup map
        const contentMap = new Map();
        contentList?.forEach(c => contentMap.set(c.id, c));
        
        console.log(`DB: Found ${assignments.length} assignments for student ${studentId}`);
        
        return assignments.map((assignment: any) => {
          const content = contentMap.get(assignment.content_id);
          
          return {
            id: assignment.id,
            contentId: assignment.content_id,
            contentTitle: content?.title || 'Untitled',
            contentType: content?.type || 'unknown',
            content: content?.content || '',
            status: assignment.status,
            notes: assignment.notes,
            assignedAt: assignment.assigned_at,
            updatedAt: assignment.updated_at
          };
        });
      },

      async getLmsAssignmentById(assignmentId: string) {
        const { data, error } = await client
          .from('lms_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single();
        
        if (error) {
          console.error('Error fetching LMS assignment:', error);
          return null;
        }
        
        return data ? {
          id: data.id,
          contentId: data.content_id,
          studentId: data.student_id,
          status: data.status,
          notes: data.notes,
          assignedAt: data.assigned_at,
          updatedAt: data.updated_at
        } : null;
      },

      async updateLmsAssignmentStatus(assignmentId: string, status: string, notes?: string) {
        const updateData: any = {
          status,
          updated_at: new Date().toISOString()
        };
        if (notes) updateData.notes = notes;
        
        const { data, error } = await client
          .from('lms_assignments')
          .update(updateData)
          .eq('id', assignmentId)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating LMS assignment status:', error);
          throw error;
        }
        return data;
      },

      async createLmsTimeline(timelineData: any) {
        const { data, error } = await client
          .from('lms_timeline')
          .insert({
            id: timelineData.id,
            assignment_id: timelineData.assignmentId,
            status: timelineData.status,
            timestamp: timelineData.timestamp || new Date().toISOString(),
            notes: timelineData.notes || '',
            updated_by: timelineData.updatedBy
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating LMS timeline:', error);
          throw error;
        }
        return data;
      },

      async getStudentLmsTimeline(studentId: string) {
        // Get all assignments for this student with their timeline
        const { data: assignments, error: assignmentError } = await client
          .from('lms_assignments')
          .select(`
            id,
            content:content_id (title, type),
            status,
            assigned_at
          `)
          .eq('student_id', studentId);
        
        if (assignmentError) {
          console.error('Error fetching student assignments for timeline:', assignmentError);
          return [];
        }
        
        const timeline = [];
        
        for (const assignment of assignments || []) {
          // Get timeline entries for each assignment
          const { data: entries, error: timelineError } = await client
            .from('lms_timeline')
            .select(`
              *,
              updater:updated_by (firstname, lastname)
            `)
            .eq('assignment_id', assignment.id)
            .order('timestamp', { ascending: true });
          
          if (timelineError) {
            console.error('Error fetching timeline entries:', timelineError);
          }
          
          timeline.push({
            assignmentId: assignment.id,
            contentTitle: assignment.content?.title || 'Untitled',
            contentType: assignment.content?.type || 'unknown',
            currentStatus: assignment.status,
            assignedAt: assignment.assigned_at,
            events: entries?.map((entry: any) => ({
              status: entry.status,
              timestamp: entry.timestamp,
              notes: entry.notes,
              updatedBy: entry.updater ? `${entry.updater.firstname} ${entry.updater.lastname}` : 'System'
            })) || []
          });
        }
        
        return timeline;
      },

      // Evaluations
      async updateLmsContentScore(id: string, score: number) {
        const { data, error } = await client
          .from('lms_content')
          .update({ assignmentscore: score })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      // Quizzes
      async findAllQuizzes() {
        const { data, error } = await client
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },

      async getQuizById(quizId: string) {
        const { data, error } = await client
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
        
        if (error) {
          console.error('Error getting quiz by ID:', error);
          return null;
        }
        
        return data;
      },

      async createQuiz(quizData: any) {
        const { data, error } = await client
          .from('quizzes')
          .insert({
            id: `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: quizData.title,
            description: quizData.description,
            duration: quizData.duration,
            questions: JSON.stringify(quizData.questions),
            status: 'draft',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async assignQuizToStudents(quizId: string, studentIds: string[], deadline: string, duration: number) {
        const assignments = studentIds.map(studentId => ({
          id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          quiz_id: quizId,
          student_id: studentId,
          deadline,
          duration,
          status: 'active',
          assigned_at: new Date().toISOString()
        }));

        const { data, error } = await client
          .from('quiz_assignments')
          .insert(assignments)
          .select();
        
        if (error) throw error;
        return data;
      },

      async deleteQuizAssignment(assignmentId: string) {
        const { error } = await client
          .from('quiz_assignments')
          .delete()
          .eq('id', assignmentId);
        
        if (error) throw error;
        return true;
      },

      async deleteQuizSubmission(submissionId: string) {
        const { error } = await client
          .from('quiz_submissions')
          .delete()
          .eq('id', submissionId);
        
        if (error) throw error;
        return true;
      },

      async findSubmittedQuizzes() {
        const { data, error } = await client
          .from('quiz_submissions')
          .select(`
            *,
            quizzes:quiz_id (title),
            users:student_id (firstname, lastname, email)
          `)
          .in('status', ['submitted', 'graded'])
          .order('submitted_at', { ascending: false });
        
        if (error) {
          console.error('Error finding submitted quizzes:', error);
          throw error;
        }
        
        // Transform data to match expected frontend format
        return data?.map((submission: any) => ({
          id: submission.id,
          quizId: submission.quiz_id,
          quizTitle: submission.quizzes?.title || 'Untitled Quiz',
          studentId: submission.student_id,
          studentName: submission.users ? `${submission.users.firstname} ${submission.users.lastname}` : 'Unknown',
          studentEmail: submission.users?.email || 'Unknown',
          submittedAt: submission.submitted_at,
          score: submission.score,
          windowSwitches: submission.window_switches,
          timeTaken: submission.time_spent,
          status: submission.status
        })) || [];
      },

      async getQuizSubmissionById(submissionId: string) {
        const { data, error } = await client
          .from('quiz_submissions')
          .select(`
            *,
            quizzes:quiz_id (title),
            users:student_id (firstname, lastname, email)
          `)
          .eq('id', submissionId)
          .single();
        
        if (error) {
          console.error('Error getting quiz submission:', error);
          return null;
        }
        
        console.log('Retrieved submission data from DB:', data);
        console.log('Answers from DB:', data.answers, 'Type:', typeof data.answers, 'Is Array:', Array.isArray(data.answers));
        if (data.answers && typeof data.answers === 'object') {
          console.log('Answers keys:', Object.keys(data.answers));
          console.log('Answers values:', Object.values(data.answers));
        }
        
        return data ? {
          id: data.id,
          quizId: data.quiz_id,
          quizTitle: data.quizzes?.title || 'Untitled Quiz',
          studentId: data.student_id,
          studentName: data.users ? `${data.users.firstname} ${data.users.lastname}` : 'Unknown',
          studentEmail: data.users?.email || 'Unknown',
          submittedAt: data.submitted_at,
          score: data.score,
          answers: data.answers ? 
            (Array.isArray(data.answers) ? 
              data.answers : 
              (typeof data.answers === 'object' ? 
                Object.keys(data.answers).sort((a, b) => parseInt(a) - parseInt(b)).map(key => data.answers[key]) : 
                [])) : [], // Convert object to array if needed
          windowSwitches: data.window_switches,
          cheatingFlagged: data.cheating_flagged,
          timeTaken: data.time_spent,
          status: data.status
        } : null;
      },

      async releaseQuizScores(quizId: string) {
        const { data, error } = await client
          .from('quiz_submissions')
          .update({ status: 'graded' })
          .eq('quiz_id', quizId)
          .eq('status', 'submitted');
        
        if (error) throw error;
        return data;
      },

      async archiveQuiz(quizId: string) {
        const { data, error } = await client
          .from('quiz_submissions')
          .update({ status: 'archived' })
          .eq('quiz_id', quizId)
          .eq('status', 'graded');
        
        if (error) throw error;
        return data;
      },

      async findActiveQuizzesForStudent(studentId: string) {
        console.log('findActiveQuizzesForStudent called with:', studentId);
        
        // Get all active assignments for this student
        const { data: assignments, error: assignmentError } = await client
          .from('quiz_assignments')
          .select(`
            *,
            quizzes:quiz_id (title, description, duration)
          `)
          .eq('student_id', studentId)
          .eq('status', 'active')
          .gt('deadline', new Date().toISOString())
          .order('deadline', { ascending: true });
        
        if (assignmentError) {
          console.error('Error finding active quizzes:', assignmentError);
          return [];
        }
        
        // Get all quiz IDs that student has already attempted
        const { data: submissions, error: submissionError } = await client
          .from('quiz_submissions')
          .select('quiz_id')
          .eq('student_id', studentId);
        
        if (submissionError) {
          console.error('Error checking submissions:', submissionError);
        }
        
        const attemptedQuizIds = new Set(submissions?.map(s => s.quiz_id) || []);
        console.log('Attempted quiz IDs:', attemptedQuizIds);
        
        // Filter out quizzes that have been attempted
        const activeQuizzes = assignments
          ?.filter((assignment: any) => !attemptedQuizIds.has(assignment.quiz_id))
          .map((assignment: any) => ({
            id: assignment.quiz_id,
            title: assignment.quizzes?.title || 'Untitled Quiz',
            description: assignment.quizzes?.description || '',
            duration: assignment.duration || assignment.quizzes?.duration || 60,
            deadline: assignment.deadline,
            status: 'active'
          })) || [];
        
        console.log('Active quizzes (excluding attempted):', activeQuizzes.length);
        return activeQuizzes;
      },

      async findAttemptedQuizzesForStudent(studentId: string) {
        const { data, error } = await client
          .from('quiz_submissions')
          .select(`
            *,
            quizzes:quiz_id (title)
          `)
          .eq('student_id', studentId)
          .in('status', ['submitted', 'graded', 'archived'])
          .order('submitted_at', { ascending: false });
        
        if (error) {
          console.error('Error finding attempted quizzes:', error);
          return [];
        }
        
        // Transform data to match expected format
        // Only show score if quiz has been graded (scores released)
        return data?.map((submission: any) => ({
          id: submission.id,
          quizId: submission.quiz_id,
          quizTitle: submission.quizzes?.title || 'Untitled Quiz',
          score: submission.status === 'graded' || submission.status === 'archived' || submission.status === 'submitted' ? submission.score : null,
          status: submission.status,
          submittedAt: submission.submitted_at,
          windowSwitches: submission.window_switches,
          timeTaken: submission.time_spent,
          cheatingFlagged: submission.cheating_flagged
        })) || [];
      },

      async checkQuizAccess(studentId: string, quizId: string) {
        console.log('checkQuizAccess called with:', { studentId, quizId, currentTime: new Date().toISOString() });
        
        const { data, error } = await client
          .from('quiz_assignments')
          .select('*')
          .eq('student_id', studentId)
          .eq('quiz_id', quizId)
          .eq('status', 'active')
          .gt('deadline', new Date().toISOString())
          .limit(1); // Use limit(1) instead of single/maybeSingle to handle multiple assignments
        
        console.log('checkQuizAccess result:', { data, error, hasData: data && data.length > 0 });
        
        if (error) {
          console.error('Error checking quiz access:', error);
          return false;
        }
        
        return data && data.length > 0;
      },

      async hasStudentAttemptedQuiz(studentId: string, quizId: string) {
        const { data, error } = await client
          .from('quiz_submissions')
          .select('*')
          .eq('student_id', studentId)
          .eq('quiz_id', quizId)
          .maybeSingle(); // Use maybeSingle instead of single
        
        if (error) {
          console.error('Error checking quiz attempt:', error);
          return false;
        }
        return !!data;
      },

      async getQuizQuestions(quizId: string) {
        const { data, error } = await client
          .from('quizzes')
          .select('questions')
          .eq('id', quizId)
          .single();
        
        if (error) {
          console.error('Error getting quiz questions:', error);
          throw error;
        }
        
        // Parse questions from JSON string if needed
        let questions = data?.questions;
        if (typeof questions === 'string') {
          try {
            questions = JSON.parse(questions);
          } catch (e) {
            console.error('Error parsing questions JSON:', e);
            questions = [];
          }
        }
        
        return questions || [];
      },

      async submitQuizAttempt(submissionData: any) {
        console.log('submitQuizAttempt called with:', submissionData);
        console.log('Answers being stored:', submissionData.answers, 'Type:', typeof submissionData.answers, 'Is array:', Array.isArray(submissionData.answers));
        
        // Map camelCase to snake_case for database columns
        const mappedData = {
          quiz_id: submissionData.quizId,
          student_id: submissionData.studentId,
          answers: submissionData.answers, // Let Supabase handle JSON
          score: submissionData.score,
          window_switches: submissionData.windowSwitches,
          time_spent: submissionData.timeSpent,
          cheating_flagged: submissionData.cheatingFlagged,
          submitted_at: submissionData.submittedAt,
          status: 'graded'
        };
        
        console.log('Mapped data for database:', mappedData);
        
        const { data, error } = await client
          .from('quiz_submissions')
          .insert({
            id: `submission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...mappedData
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error submitting quiz attempt:', error);
          throw error;
        }
        
        console.log('Stored submission in database:', data);
        return data;
      },

      // Feedback methods
      async createFeedback(feedbackData: any) {
        const { data, error } = await client
          .from('feedback')
          .insert({
            student_id: feedbackData.studentId,
            student_name: feedbackData.studentName,
            feedback: feedbackData.feedback,
            status: 'new',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async getAllFeedbacks() {
        const { data, error } = await client
          .from('feedback')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },

      async updateFeedbackStatus(id: string, status: string) {
        const { data, error } = await client
          .from('feedback')
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async deleteFeedback(id: string) {
        const { error } = await client
          .from('feedback')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      },

      async deleteQuiz(quizId: string) {
        // Delete quiz (cascade will handle assignments and submissions due to foreign key constraints)
        const { error } = await client
          .from('quizzes')
          .delete()
          .eq('id', quizId);
        
        if (error) throw error;
        return true;
      },

      async getAllQuizAssignments() {
        const { data, error } = await client
          .from('quiz_assignments')
          .select(`
            *,
            users:student_id (firstname, lastname, email)
          `)
          .order('assigned_at', { ascending: false });
        
        if (error) {
          console.error('Error getting all quiz assignments:', error);
          return [];
        }
        
        // Transform data to match expected format
        return data?.map((assignment: any) => ({
          id: assignment.id,
          quizId: assignment.quiz_id,
          studentId: assignment.student_id,
          studentName: assignment.users ? `${assignment.users.firstname} ${assignment.users.lastname}` : 'Unknown',
          studentEmail: assignment.users?.email || 'Unknown',
          deadline: assignment.deadline,
          duration: assignment.duration,
          status: assignment.status,
          assignedAt: assignment.assigned_at
        })) || [];
      },

      async getQuizAssignments(quizId: string) {
        const { data, error } = await client
          .from('quiz_assignments')
          .select(`
            *,
            users:student_id (firstname, lastname, email)
          `)
          .eq('quiz_id', quizId)
          .order('assigned_at', { ascending: false });
        
        if (error) {
          console.error('Error getting quiz assignments:', error);
          return [];
        }
        
        // Transform data to match expected format
        return data?.map((assignment: any) => ({
          id: assignment.id,
          quizId: assignment.quiz_id,
          studentId: assignment.student_id,
          studentName: assignment.users ? `${assignment.users.firstname} ${assignment.users.lastname}` : 'Unknown',
          studentEmail: assignment.users?.email || 'Unknown',
          deadline: assignment.deadline,
          duration: assignment.duration,
          status: assignment.status,
          assignedAt: assignment.assigned_at
        })) || [];
      },

      // Assignments
      async createAssignment(assignmentData: any) {
        const { data, error } = await client
          .from('assignments')
          .insert({
            id: assignmentData.id,
            title: assignmentData.title,
            instructions: assignmentData.instructions,
            link: assignmentData.link || null,
            deadline: assignmentData.deadline,
            created_by: assignmentData.createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async getAllAssignments() {
        const { data, error } = await client
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching assignments:', error);
          return [];
        }
        
        // Map instructions to description for frontend compatibility
        return data?.map((assignment: any) => ({
          ...assignment,
          description: assignment.instructions || assignment.description,
          createdAt: assignment.created_at
        })) || [];
      },

      async deleteAssignment(assignmentId: string) {
        const { error } = await client
          .from('assignments')
          .delete()
          .eq('id', assignmentId);
        
        if (error) throw error;
        return true;
      },

      async updateAssignment(assignmentId: string, assignmentData: any) {
        const { data, error } = await client
          .from('assignments')
          .update({
            title: assignmentData.title,
            instructions: assignmentData.instructions,
            deadline: assignmentData.deadline,
            link: assignmentData.link,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async assignAssignmentToStudents(assignmentId: string, studentIds: string[]) {
        const assignments = studentIds.map(studentId => ({
          id: `assignment-assign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        }));

        const { data, error } = await client
          .from('assignment_assignments')
          .insert(assignments)
          .select();
        
        if (error) throw error;
        return data;
      },

      async removeStudentFromAssignment(assignmentId: string, studentId: string) {
        const { error } = await client
          .from('assignment_assignments')
          .delete()
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId);
        
        if (error) throw error;
        return true;
      },

      async getAssignmentAssignedStudents(assignmentId: string) {
        const { data, error } = await client
          .from('assignment_assignments')
          .select('*')
          .eq('assignment_id', assignmentId);
        
        if (error) {
          console.error('Error fetching assigned students:', error);
          return [];
        }
        return data || [];
      },

      async createSubmission(submissionData: any) {
        const { data, error } = await client
          .from('assignment_submissions')
          .insert({
            id: submissionData.id,
            assignment_id: submissionData.assignmentId,
            student_id: submissionData.studentId,
            file_url: submissionData.fileUrl,
            github_link: submissionData.githubLink,
            notes: submissionData.notes,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating submission:', error);
          throw error;
        }
        
        console.log('Stored submission data in database:', submissionData);
        console.log('Submission ID:', data.id);
        
        return data;
      },

      async getAssignmentSubmissions(assignmentId: string) {
        // Fetch submissions
        const { data: submissions, error } = await client
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching submissions:', error);
          return [];
        }
        
        if (!submissions || submissions.length === 0) {
          return [];
        }
        
        // Get unique student IDs
        const studentIds = [...new Set(submissions.map(s => s.student_id))];
        
        // Fetch students separately
        const { data: students, error: studentsError } = await client
          .from('users')
          .select('id, firstname, lastname, email')
          .in('id', studentIds);
        
        if (studentsError) {
          console.error('Error fetching students:', studentsError);
        }
        
        // Create student lookup map
        const studentMap = new Map();
        students?.forEach(s => studentMap.set(s.id, s));
        
        return submissions.map((submission: any) => {
          const student = studentMap.get(submission.student_id);
          return {
            id: submission.id,
            assignmentId: submission.assignment_id,
            studentId: submission.student_id,
            studentName: student ? `${student.firstname} ${student.lastname}` : 'Unknown',
            studentEmail: student?.email || 'Unknown',
            fileUrl: submission.file_url,
            githubLink: submission.github_link,
            notes: submission.notes,
            status: submission.status,
            score: submission.score,
            feedback: submission.feedback,
            submittedAt: submission.submitted_at,
            gradedAt: submission.graded_at
          };
        });
      },

      async getStudentAssignments(studentId: string) {
        // Get assignments assigned to this student
        const { data: assignedAssignments, error: assignError } = await client
          .from('assignment_assignments')
          .select('assignment_id, status')
          .eq('student_id', studentId);
        
        if (assignError) {
          console.error('Error fetching assigned assignments:', assignError);
          return [];
        }
        
        if (!assignedAssignments || assignedAssignments.length === 0) {
          return [];
        }
        
        // Get assignment IDs
        const assignmentIds = assignedAssignments.map(a => a.assignment_id);
        
        // Get assignment details
        const { data: assignments, error } = await client
          .from('assignments')
          .select('*')
          .in('id', assignmentIds)
          .order('deadline', { ascending: true });
        
        if (error) {
          console.error('Error fetching assignments:', error);
          return [];
        }
        
        // Create assignment status map from assignment_assignments
        const assignmentStatusMap = new Map();
        assignedAssignments.forEach(a => assignmentStatusMap.set(a.assignment_id, a.status));
        
        // Get student's submissions
        const { data: submissions, error: subError } = await client
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds);
        
        if (subError) {
          console.error('Error fetching submissions:', subError);
        }
        
        // Create submission lookup map
        const submissionMap = new Map();
        submissions?.forEach(s => submissionMap.set(s.assignment_id, s));
        
        return assignments?.map((assignment: any) => {
          const submission = submissionMap.get(assignment.id);
          const assignedStatus = assignmentStatusMap.get(assignment.id) || 'assigned';
          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.instructions || assignment.description,
            deadline: assignment.deadline,
            link: assignment.link,
            submitted: !!submission,
            submissionId: submission?.id,
            fileUrl: submission?.file_url,
            githubLink: submission?.github_link,
            score: submission?.score,
            feedback: submission?.feedback,
            status: submission?.status || assignedStatus,
            createdAt: assignment.created_at
          };
        }) || [];
      },

      async getStudentSubmission(assignmentId: string, studentId: string) {
        const { data, error } = await client
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)
          .single();
        
        if (error && error.code !== 'PGRST116') { // Not found error
          console.error('Error fetching submission:', error);
        }
        return data;
      },

      async getStudentSubmissions(studentId: string) {
        const { data, error } = await client
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', studentId)
          .order('submitted_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching submissions:', error);
          return [];
        }
        return data || [];
      },

      async gradeSubmission(submissionId: string, gradeData: any) {
        const { data, error } = await client
          .from('assignment_submissions')
          .update({
            score: gradeData.score,
            feedback: gradeData.feedback,
            status: 'graded',
            graded_at: new Date().toISOString(),
            graded_by: gradeData.gradedBy
          })
          .eq('id', submissionId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async getAllSubmissions() {
        // Fetch all submissions
        const { data: submissions, error } = await client
          .from('assignment_submissions')
          .select('*')
          .order('submitted_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching all submissions:', error);
          return [];
        }
        
        if (!submissions || submissions.length === 0) {
          return [];
        }
        
        // Get unique student IDs
        const studentIds = [...new Set(submissions.map(s => s.student_id))];
        
        // Fetch students separately
        const { data: students, error: studentsError } = await client
          .from('users')
          .select('id, firstname, lastname, email')
          .in('id', studentIds);
        
        if (studentsError) {
          console.error('Error fetching students:', studentsError);
        }
        
        // Create student lookup map
        const studentMap = new Map();
        students?.forEach(s => studentMap.set(s.id, s));
        
        return submissions.map((submission: any) => {
          const student = studentMap.get(submission.student_id);
          return {
            id: submission.id,
            assignmentId: submission.assignment_id,
            studentId: submission.student_id,
            studentName: student ? `${student.firstname} ${student.lastname}` : 'Unknown',
            studentEmail: student?.email || 'Unknown',
            fileUrl: submission.file_url,
            githubLink: submission.github_link,
            notes: submission.notes,
            status: submission.status,
            score: submission.score,
            feedback: submission.feedback,
            submittedAt: submission.submitted_at,
            gradedAt: submission.graded_at
          };
        });
      },

      // ==================== TRADING METHODS ====================
      
      // Strategies
      async getStudentStrategies(studentId: string) {
        const { data, error } = await client
          .from('trading_strategies')
          .select('*')
          .eq('student_id', studentId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching strategies:', error);
          return [];
        }
        return data || [];
      },

      async getStrategyById(strategyId: string, studentId: string) {
        const { data, error } = await client
          .from('trading_strategies')
          .select('*')
          .eq('id', strategyId)
          .eq('student_id', studentId)
          .single();
        
        if (error) return null;
        return data;
      },

      async createStrategy(strategyData: any) {
        const { data, error } = await client
          .from('trading_strategies')
          .insert({
            id: strategyData.id,
            student_id: strategyData.studentId,
            name: strategyData.name,
            description: strategyData.description,
            code: strategyData.code,
            symbol: strategyData.symbol,
            timeframe: strategyData.timeframe,
            initial_capital: strategyData.initialCapital,
            status: strategyData.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async updateStrategy(strategyId: string, studentId: string, updateData: any) {
        const { data, error } = await client
          .from('trading_strategies')
          .update(updateData)
          .eq('id', strategyId)
          .eq('student_id', studentId)
          .select()
          .single();
        
        if (error) return null;
        return data;
      },

      async deleteStrategy(strategyId: string, studentId: string) {
        const { error } = await client
          .from('trading_strategies')
          .delete()
          .eq('id', strategyId)
          .eq('student_id', studentId);
        
        if (error) throw error;
        return true;
      },

      // Backtests
      async createBacktest(backtestData: any) {
        const { data, error } = await client
          .from('strategy_backtests')
          .insert({
            id: backtestData.id,
            strategy_id: backtestData.strategyId,
            student_id: backtestData.studentId,
            start_date: backtestData.startDate,
            end_date: backtestData.endDate,
            status: backtestData.status,
            initial_capital: backtestData.initialCapital,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async getBacktestById(backtestId: string, studentId: string) {
        const { data, error } = await client
          .from('strategy_backtests')
          .select('*')
          .eq('id', backtestId)
          .eq('student_id', studentId)
          .single();
        
        if (error) return null;
        return data;
      },

      async getStrategyBacktests(strategyId: string, studentId: string) {
        const { data, error } = await client
          .from('strategy_backtests')
          .select('*')
          .eq('strategy_id', strategyId)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching backtests:', error);
          return [];
        }
        return data || [];
      },

      async updateBacktestStatus(backtestId: string, status: string, errorMessage?: string) {
        const updateData: any = { status };
        if (errorMessage) updateData.error_message = errorMessage;
        if (status === 'completed' || status === 'failed') {
          updateData.completed_at = new Date().toISOString();
        }

        const { error } = await client
          .from('strategy_backtests')
          .update(updateData)
          .eq('id', backtestId);
        
        if (error) throw error;
        return true;
      },

      async completeBacktest(backtestId: string, results: any) {
        const { error } = await client
          .from('strategy_backtests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            total_return: results.totalReturn,
            annual_return: results.annualReturn,
            max_drawdown: results.maxDrawdown,
            sharpe_ratio: results.sharpeRatio,
            sortino_ratio: results.sortinoRatio,
            win_rate: results.winRate,
            profit_factor: results.profitFactor,
            total_trades: results.totalTrades,
            winning_trades: results.winningTrades,
            losing_trades: results.losingTrades,
            final_capital: results.finalCapital,
            gross_profit: results.grossProfit,
            gross_loss: results.grossLoss,
            net_profit: results.netProfit
          })
          .eq('id', backtestId);
        
        if (error) throw error;
        return true;
      },

      // Paper Trading
      async createTrade(tradeData: any) {
        const { data, error } = await client
          .from('paper_trades')
          .insert({
            id: tradeData.id,
            student_id: tradeData.studentId,
            strategy_id: tradeData.strategyId,
            symbol: tradeData.symbol,
            side: tradeData.side,
            entry_price: tradeData.entryPrice,
            quantity: tradeData.quantity,
            notes: tradeData.notes,
            status: 'open',
            entry_time: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async getOpenPosition(studentId: string, symbol: string) {
        const { data, error } = await client
          .from('paper_trades')
          .select('*')
          .eq('student_id', studentId)
          .eq('symbol', symbol)
          .eq('status', 'open')
          .eq('side', 'BUY')
          .single();
        
        if (error) return null;
        return data;
      },

      async closeTrade(tradeId: string, exitPrice: number, pnl: number, pnlPercent: number) {
        const { data, error } = await client
          .from('paper_trades')
          .update({
            exit_price: exitPrice,
            pnl: pnl,
            pnl_percent: pnlPercent,
            status: 'closed',
            exit_time: new Date().toISOString()
          })
          .eq('id', tradeId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async getStudentTrades(studentId: string) {
        const { data, error } = await client
          .from('paper_trades')
          .select('*')
          .eq('student_id', studentId)
          .order('entry_time', { ascending: false });
        
        if (error) {
          console.error('Error fetching trades:', error);
          return [];
        }
        return data || [];
      },

      async getOpenPositions(studentId: string) {
        const { data, error } = await client
          .from('paper_trades')
          .select('*')
          .eq('student_id', studentId)
          .eq('status', 'open');
        
        if (error) {
          console.error('Error fetching positions:', error);
          return [];
        }
        return data || [];
      },

      // Admin Methods
      async getAllTrades() {
        const { data, error } = await client
          .from('paper_trades')
          .select(`
            *,
            student:student_id (firstname, lastname, email)
          `)
          .order('entry_time', { ascending: false });
        
        if (error) {
          console.error('Error fetching all trades:', error);
          return [];
        }
        return data || [];
      },

      async getAllBacktests() {
        const { data, error } = await client
          .from('strategy_backtests')
          .select(`
            *,
            student:student_id (firstname, lastname, email),
            strategy:strategy_id (name)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching all backtests:', error);
          return [];
        }
        return data || [];
      },

      async getAllDailyPnLReports(date?: string) {
        let query = client
          .from('daily_pnl_reports')
          .select(`
            *,
            student:student_id (firstname, lastname, email)
          `);
        
        if (date) {
          query = query.eq('report_date', date);
        }
        
        const { data, error } = await query
          .order('report_date', { ascending: false });
        
        if (error) {
          console.error('Error fetching daily PnL:', error);
          return [];
        }
        return data || [];
      },

      async reviewDailyPnL(reportId: string, adminId: string, notes?: string) {
        const { error } = await client
          .from('daily_pnl_reports')
          .update({
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            notes: notes || null
          })
          .eq('id', reportId);
        
        if (error) throw error;
        return true;
      },

      // ==================== SIMPLIFIED TRADING REPORTS METHODS ====================
      
      async createTradingReport(reportData: any) {
        const { data, error } = await client
          .from('trading_reports')
          .insert({
            id: reportData.id,
            student_id: reportData.studentId,
            report_date: reportData.reportDate,
            instrument: reportData.instrument,
            daily_pnl: reportData.dailyPnL,
            strategy_name: reportData.strategyName,
            strategy_description: reportData.strategyDescription,
            results_doc_link: reportData.resultsDocLink,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async getStudentTradingReports(studentId: string) {
        const { data, error } = await client
          .from('trading_reports')
          .select('*')
          .eq('student_id', studentId)
          .order('report_date', { ascending: false });
        
        if (error) {
          console.error('Error fetching trading reports:', error);
          return [];
        }
        return data || [];
      },

      async getTradingReportById(reportId: string, studentId: string) {
        const { data, error } = await client
          .from('trading_reports')
          .select('*')
          .eq('id', reportId)
          .eq('student_id', studentId)
          .single();
        
        if (error) return null;
        return data;
      },

      async updateTradingReport(reportId: string, studentId: string, updateData: any) {
        const { data, error } = await client
          .from('trading_reports')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId)
          .eq('student_id', studentId)
          .select()
          .single();
        
        if (error) return null;
        return data;
      },

      async deleteTradingReport(reportId: string, studentId: string) {
        const { error } = await client
          .from('trading_reports')
          .delete()
          .eq('id', reportId)
          .eq('student_id', studentId);
        
        if (error) throw error;
        return true;
      },

      // Admin methods for trading reports
      async getAllTradingReports() {
        // Fetch all reports
        const { data: reports, error: reportsError } = await client
          .from('trading_reports')
          .select('*')
          .order('report_date', { ascending: false });
        
        if (reportsError) {
          console.error('Error fetching trading reports:', reportsError);
          return [];
        }
        
        if (!reports || reports.length === 0) {
          return [];
        }
        
        // Get unique student IDs
        const studentIds = [...new Set(reports.map(r => r.student_id))];
        
        // Fetch student data separately
        const { data: students, error: studentsError } = await client
          .from('users')
          .select('id, firstname, lastname, email')
          .in('id', studentIds);
        
        if (studentsError) {
          console.error('Error fetching students:', studentsError);
        }
        
        // Create student lookup map
        const studentMap = new Map();
        students?.forEach(s => {
          studentMap.set(s.id, s);
        });
        
        // Merge reports with student data
        return reports.map(r => ({
          ...r,
          student: studentMap.get(r.student_id) || null
        }));
      },

      async reviewTradingReport(reportId: string, adminId: string, status: string, notes?: string) {
        const { error } = await client
          .from('trading_reports')
          .update({
            status,
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            admin_notes: notes || null
          })
          .eq('id', reportId);
        
        if (error) throw error;
        return true;
      },

      // User management methods
      async findStudentById(id: string) {
        // First get user data
        const { data: user, error: userError } = await client
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        
        if (userError) throw userError;
        if (!user) return null;
        
        // Then get student profile
        const { data: profile, error: profileError } = await client
          .from('student_profiles')
          .select('*')
          .eq('userid', id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is acceptable
          throw profileError;
        }
        
        // Return combined data
        return {
          ...user,
          student_profiles: profile || null
        };
      },

      async updateUser(id: string, updateData: any) {
        const { data, error } = await client
          .from('users')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async updateStudentProfile(userId: string, profileData: any) {
        const { data, error } = await client
          .from('student_profiles')
          .update(profileData)
          .eq('userid', userId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async deleteUser(id: string) {
        // Delete student profile by userid
        const { error: profileError } = await client
          .from('student_profiles')
          .delete()
          .eq('userid', id);
        
        if (profileError) {
          console.error('Error deleting student profile:', profileError);
          throw profileError;
        }
        
        // Then delete the user
        const { error } = await client
          .from('users')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      },

      // Attendance methods
      async findAttendanceByDateRange(startDate: Date, endDate: Date) {
        const { data, error } = await client
          .from('attendance')
          .select('*')
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString())
          .order('date', { ascending: true });
        
        if (error) throw error;
        return data;
      },

      async findAllAttendance() {
        const { data, error } = await client
          .from('attendance')
          .select('*')
          .order('date', { ascending: true });
        
        if (error) throw error;
        return data;
      },

      async findAttendanceByStudentAndDate(studentId: string, date: Date) {
        const { data, error } = await client
          .from('attendance')
          .select('*')
          .eq('studentid', studentId)
          .eq('date', date.toISOString().split('T')[0])
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          throw error;
        }
        return data;
      },

      async updateAttendance(attendanceId: string, updateData: any) {
        const { data, error } = await client
          .from('attendance')
          .update(updateData)
          .eq('id', attendanceId)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        return data;
      },

      // ==================== ANNOUNCEMENTS ====================
      async createAnnouncement(announcementData: any) {
        const payload = {
          id: announcementData.id || `announcement-${Date.now()}`,
          title: announcementData.title,
          message: announcementData.message,
          target_audience: announcementData.target_audience || 'all',
          target_student_ids: announcementData.target_student_ids || null,
          created_by: announcementData.created_by,
          created_at: announcementData.created_at || new Date().toISOString()
        };
        
        console.log('Creating announcement with payload:', payload);
        
        const { data, error } = await client
          .from('announcements')
          .insert(payload)
          .select()
          .single();
        
        if (error) {
          console.error('Supabase error creating announcement:', error);
          throw error;
        }
        
        console.log('Announcement created successfully:', data);
        return data;
      },

      async getAllAnnouncements() {
        // Fetch announcements without join to avoid FK issues
        const { data, error } = await client
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      },

      async getAnnouncementsForStudent(studentId: string) {
        console.log('Getting announcements for student:', studentId);
        
        // Get all announcements
        const { data, error } = await client
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase error fetching announcements:', error);
          throw error;
        }
        
        console.log('Total announcements in DB:', data?.length || 0);
        console.log('Announcements data:', data);
        
        // Filter in JavaScript since Supabase array containment is tricky
        const filtered = (data || []).filter((announcement: any) => {
          const isAll = announcement.target_audience === 'all';
          const isSpecific = announcement.target_audience === 'specific';
          const hasStudentIds = announcement.target_student_ids && 
              Array.isArray(announcement.target_student_ids) &&
              announcement.target_student_ids.includes(studentId);
          
          console.log('Filtering announcement:', announcement.id, {
            target_audience: announcement.target_audience,
            target_student_ids: announcement.target_student_ids,
            isAll,
            isSpecific,
            hasStudentIds,
            shouldShow: isAll || (isSpecific && hasStudentIds)
          });
          
          if (isAll) return true;
          if (isSpecific && hasStudentIds) return true;
          return false;
        });
        
        console.log('Filtered announcements for student:', filtered.length);
        return filtered;
      },

      async deleteAnnouncement(announcementId: string) {
        const { error } = await client
          .from('announcements')
          .delete()
          .eq('id', announcementId);
        
        if (error) throw error;
        return true;
      },

      async deleteAllAnnouncements() {
        const { error } = await client
          .from('announcements')
          .delete()
          .neq('id', 'fake-id'); // Delete all rows
        
        if (error) throw error;
        return true;
      },

      async deleteAllAnnouncementReads() {
        const { error } = await client
          .from('announcement_reads')
          .delete()
          .neq('id', 'fake-id'); // Delete all rows
        
        if (error) throw error;
        return true;
      },

      async markAnnouncementAsRead(announcementId: string, studentId: string) {
        const { data, error } = await client
          .from('announcement_reads')
          .insert({
            announcement_id: announcementId,
            student_id: studentId,
            read_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          // Ignore duplicate key errors (already read)
          if (error.code === '23505') return { alreadyRead: true };
          throw error;
        }
        return data;
      },

      async getAnnouncementReads(studentId: string) {
        const { data, error } = await client
          .from('announcement_reads')
          .select('announcement_id, read_at')
          .eq('student_id', studentId);
        
        if (error) throw error;
        return data || [];
      },

      async getUnreadAnnouncementsCount(studentId: string) {
        // Get all announcements student has access to
        const { data: announcements, error: annError } = await client
          .from('announcements')
          .select('id, target_audience, target_student_ids');
        
        if (annError) throw annError;
        
        // Get all announcements student has read
        const { data: reads, error: readError } = await client
          .from('announcement_reads')
          .select('announcement_id')
          .eq('student_id', studentId);
        
        if (readError) throw readError;
        
        const readIds = new Set((reads || []).map((r: any) => r.announcement_id));
        
        // Count unread announcements student has access to
        let count = 0;
        for (const announcement of (announcements || [])) {
          // Check if student has access
          const hasAccess = 
            announcement.target_audience === 'all' || 
            (announcement.target_audience === 'specific' && 
             announcement.target_student_ids && 
             announcement.target_student_ids.includes(studentId));
          
          if (hasAccess && !readIds.has(announcement.id)) {
            count++;
          }
        }
        
        return count;
      }
    };
  }
  return db;
}

// Export both the client and db functions
export { initializeSupabase, supabase };
export default getDb;
