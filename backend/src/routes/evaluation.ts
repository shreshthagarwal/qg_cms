import { Router } from 'express';
import getDb from '../database';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// Admin: Score an assignment
router.post('/score', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { contentId, score } = req.body;
    const db = getDb();

    const updatedContent = await db.updateLmsContentScore(contentId, Number(score));

    res.json({ message: 'Assignment scored', content: updatedContent });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student/Admin: Get Evaluation/Performance Dashboard Stats
router.get('/dashboard/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = req.params.studentId as string;
    
    if ((req as any).user?.role === 'STUDENT' && (req as any).user.id !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const db = getDb();
    const attendances = await db.findStudentAttendance(studentId);
    const contents = await db.findStudentLmsContent(studentId);

    const totalClasses = attendances.length;
    const presentClasses = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    const assignments = contents.filter(c => c.type === 'ASSIGNMENT');
    const scoredAssignments = assignments.filter(c => c.assignmentscore !== null);
    
    let avgScore = 0;
    if (scoredAssignments.length > 0) {
      avgScore = scoredAssignments.reduce((acc, curr) => acc + (curr.assignmentscore || 0), 0) / scoredAssignments.length;
    }

    res.json({
      attendancePercentage: attendancePercentage.toFixed(2),
      totalAssignments: assignments.length,
      scoredAssignments: scoredAssignments.length,
      averageAssignmentScore: avgScore.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
