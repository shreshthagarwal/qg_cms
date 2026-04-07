import { Router } from 'express';
import getDb from '../database';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import cron from 'node-cron';

const router = Router();

// Create new announcement
router.post('/', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, message, targetAudience, targetStudentIds } = req.body;
    const adminId = req.user?.id;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const db = getDb();
    const announcement = await db.createAnnouncement({
      title,
      message,
      target_audience: targetAudience || 'all',
      target_student_ids: targetStudentIds || null,
      created_by: adminId,
      created_at: new Date().toISOString()
    });

    res.json(announcement);
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get all announcements (admin)
router.get('/', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const announcements = await db.getAllAnnouncements();
    res.json(announcements);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get announcements for student
router.get('/student', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = req.user?.id;
    const db = getDb();
    
    // Get announcements for this student
    const announcements = await db.getAnnouncementsForStudent(studentId);
    
    // Get which announcements student has read
    const reads = await db.getAnnouncementReads(studentId);
    const readIds = new Set(reads.map((r: any) => r.announcement_id));
    
    // Add read status to each announcement
    const studentAnnouncements = announcements.map((announcement: any) => ({
      ...announcement,
      announcement_reads: readIds.has(announcement.id) 
        ? [{ read_at: new Date().toISOString() }] 
        : [{ read_at: null }]
    }));
    
    res.json(studentAnnouncements);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Mark announcement as read
router.post('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const announcementId = req.params.id as string;
    const studentId = req.user?.id;
    
    const db = getDb();
    await db.markAnnouncementAsRead(announcementId, studentId!);
    
    res.json({ message: 'Announcement marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get unread count for student
router.get('/student/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = req.user?.id;
    
    const db = getDb();
    const unreadCount = await db.getUnreadAnnouncementsCount(studentId);
    
    res.json({ count: unreadCount });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete announcement (admin)
router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const announcementId = req.params.id;
    
    const db = getDb();
    await db.deleteAnnouncement(announcementId);
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ==================== AUTOMATIC PNL REMINDER SYSTEM ====================

// Function to check and create PnL reminder announcements
async function checkAndCreatePnLReminders() {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Get all students and their trading reports
    const db = getDb();
    const students = await db.getAllStudents();
    const reports = await db.getAllTradingReports();
    
    // Filter students who haven't submitted today's PnL report
    const studentsWithoutReport = students.filter((student: any) => {
      // Skip students who joined after today
      const joinDate = new Date(student.created_at);
      if (joinDate > new Date()) return false;
      
      // Check if student has submitted a report for today
      const hasSubmittedToday = reports.some((report: any) => {
        const reportDate = report.report_date || report.reportDate;
        return report.student_id === student.id && reportDate === today;
      });
      
      return !hasSubmittedToday;
    });
    
    // If there are students who haven't submitted, create an announcement
    if (studentsWithoutReport.length > 0) {
      const studentIds = studentsWithoutReport.map((s: any) => s.id);
      
      await db.createAnnouncement({
        title: "Reminder for Today's PnL Report",
        message: "Please go to the QuantLive Trading Tab, and generate a PnL report of all the trades you did today. Your daily report is due by 4:00 PM.",
        target_audience: 'specific',
        target_student_ids: studentIds,
        created_by: 'system-auto',
        created_at: new Date().toISOString()
      });
    }
  } catch (error: any) {
    // Silent fail for cron job
  }
}

// Schedule daily PnL reminder check at 4:00 PM (16:00)
// Cron format: minute hour * * *
cron.schedule('0 16 * * *', () => {
  checkAndCreatePnLReminders();
}, {
  timezone: 'Asia/Kolkata' // Indian timezone for 4 PM
});

export default router;
