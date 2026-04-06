import { Router } from 'express';
import { getDb } from '../database';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ==================== STUDENT ROUTES - TRADING REPORTS ====================

// Get all trading reports for student
router.get('/reports', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = req.user?.id;
    const db = getDb();
    const reports = await db.getStudentTradingReports(studentId);
    res.json(reports);
  } catch (error: any) {
    console.error('Error fetching trading reports:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create new trading report
router.post('/reports', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentId = req.user?.id;
    const { reportDate, instrument, dailyPnL, strategyName, strategyDescription, resultsDocLink } = req.body;

    if (!reportDate || !instrument || dailyPnL === undefined || !strategyName || !resultsDocLink) {
      return res.status(400).json({ 
        error: 'Report date, instrument, daily PnL, strategy name, and results document link are required' 
      });
    }

    const db = getDb();
    const reportData = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId,
      reportDate,
      instrument: instrument.toUpperCase(),
      dailyPnL: parseFloat(dailyPnL),
      strategyName,
      strategyDescription: strategyDescription || '',
      resultsDocLink,
      status: 'pending'
    };

    const result = await db.createTradingReport(reportData);
    res.json({ message: 'Trading report submitted successfully', report: result });
  } catch (error: any) {
    console.error('Error creating trading report:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update trading report
router.patch('/reports/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const { reportDate, instrument, dailyPnL, strategyName, strategyDescription, resultsDocLink } = req.body;

    const db = getDb();
    const updateData: any = {};
    if (reportDate) updateData.report_date = reportDate;
    if (instrument) updateData.instrument = instrument.toUpperCase();
    if (dailyPnL !== undefined) updateData.daily_pnl = parseFloat(dailyPnL);
    if (strategyName) updateData.strategy_name = strategyName;
    if (strategyDescription !== undefined) updateData.strategy_description = strategyDescription;
    if (resultsDocLink) updateData.results_doc_link = resultsDocLink;

    const result = await db.updateTradingReport(id, studentId, updateData);
    if (!result) {
      return res.status(404).json({ error: 'Report not found or unauthorized' });
    }

    res.json({ message: 'Trading report updated successfully', report: result });
  } catch (error: any) {
    console.error('Error updating trading report:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete trading report
router.delete('/reports/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    const db = getDb();
    await db.deleteTradingReport(id, studentId);
    res.json({ message: 'Trading report deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting trading report:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all trading reports (Admin only)
router.get('/admin/reports', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const reports = await db.getAllTradingReports();
    res.json(reports);
  } catch (error: any) {
    console.error('Error fetching all trading reports:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Review/Update trading report status (Admin only)
router.patch('/admin/reports/:id/review', authenticate, authorizeAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const { status, notes } = req.body;

    if (!status || !['pending', 'reviewed', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (pending, reviewed, approved, rejected)' });
    }

    const db = getDb();
    await db.reviewTradingReport(id, adminId, status, notes);
    res.json({ message: 'Report reviewed successfully' });
  } catch (error: any) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
