import { Router } from 'express';
import { getDb } from '../database';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ==================== ADMIN ROUTES ====================

// Get all submissions (admin view)
router.get('/submissions', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const submissions = await db.getAllSubmissions();
    res.json(submissions);
  } catch (error: any) {
    console.error('Error fetching all submissions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create assignment
router.post('/', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, description, deadline, link, studentIds } = req.body;
    const adminId = req.user?.id;

    if (!title || !description || !deadline) {
      return res.status(400).json({ error: 'Title, description, and deadline are required' });
    }

    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({ error: 'At least one student must be selected' });
    }

    const db = getDb();
    const assignmentData = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      instructions: description, // Map description to instructions for database
      link: link || null,
      deadline: new Date(deadline).toISOString(),
      createdBy: adminId
    };

    const result = await db.createAssignment(assignmentData);
    
    // Assign to selected students
    await db.assignAssignmentToStudents(result.id, studentIds);
    
    // Return with description field for frontend
    res.json({ 
      message: 'Assignment created and assigned to students successfully', 
      assignment: {
        ...result,
        description: result.instructions
      } 
    });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get all assignments (admin view)
router.get('/', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const assignments = await db.getAllAssignments();
    res.json(assignments);
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get submissions for an assignment
router.get('/:id/submissions', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const submissions = await db.getAssignmentSubmissions(id);
    res.json(submissions);
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get assigned students for an assignment
router.get('/:id/assigned-students', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const assignedStudents = await db.getAssignmentAssignedStudents(id);
    res.json(assignedStudents);
  } catch (error: any) {
    console.error('Error fetching assigned students:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Grade a submission
router.patch('/submissions/:id/grade', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const adminId = req.user?.id;

    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({ error: 'Score must be between 0 and 100' });
    }

    const db = getDb();
    const result = await db.gradeSubmission(id, { score, feedback, gradedBy: adminId });
    res.json({ message: 'Submission graded successfully', submission: result });
  } catch (error: any) {
    console.error('Error grading submission:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update assignment
router.patch('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, link } = req.body;

    if (!title || !description || !deadline) {
      return res.status(400).json({ error: 'Title, description, and deadline are required' });
    }

    const db = getDb();
    const result = await db.updateAssignment(id, {
      title,
      instructions: description,
      deadline: new Date(deadline).toISOString(),
      link: link || null
    });
    res.json({ message: 'Assignment updated successfully', assignment: result });
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete assignment
router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.deleteAssignment(id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Add students to assignment
router.post('/:id/students', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array is required' });
    }

    const db = getDb();
    await db.assignAssignmentToStudents(id, studentIds);
    res.json({ message: 'Students assigned successfully' });
  } catch (error: any) {
    console.error('Error assigning students:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Remove student from assignment
router.delete('/:id/students/:studentId', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id, studentId } = req.params;
    const db = getDb();
    await db.removeStudentFromAssignment(id, studentId);
    res.json({ message: 'Student removed from assignment successfully' });
  } catch (error: any) {
    console.error('Error removing student:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ==================== STUDENT ROUTES ====================

// Get all assignments for student
router.get('/student', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = req.user?.id;
    const db = getDb();
    const assignments = await db.getStudentAssignments(studentId);
    res.json(assignments);
  } catch (error: any) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Submit assignment
router.post('/:id/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { documentLink, githubLink, notes } = req.body;
    const studentId = req.user?.id;

    if (!documentLink && !githubLink) {
      return res.status(400).json({ error: 'Document link or GitHub link is required' });
    }

    const db = getDb();
    
    // Check if already submitted
    const existing = await db.getStudentSubmission(id, studentId);
    if (existing) {
      return res.status(400).json({ error: 'Assignment already submitted' });
    }

    const submissionData = {
      id: `submission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assignmentId: id,
      studentId,
      fileUrl: documentLink, // Map documentLink to fileUrl for database
      githubLink,
      notes,
      status: 'submitted'
    };

    const result = await db.createSubmission(submissionData);
    res.json({ message: 'Assignment submitted successfully', submission: result });
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get my submissions
router.get('/my-submissions', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = req.user?.id;
    const db = getDb();
    const submissions = await db.getStudentSubmissions(studentId);
    res.json(submissions);
  } catch (error: any) {
    console.error('Error fetching my submissions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
