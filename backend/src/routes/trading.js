"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ==================== STUDENT ROUTES - TRADING REPORTS ====================
// Get all trading reports for student
router.get('/reports', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        const db = (0, database_1.getDb)();
        const reports = await db.getStudentTradingReports(studentId);
        res.json(reports);
    }
    catch (error) {
        console.error('Error fetching trading reports:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Create new trading report
router.post('/reports', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        const { reportDate, instrument, dailyPnL, strategyName, strategyDescription, resultsDocLink } = req.body;
        if (!reportDate || !instrument || dailyPnL === undefined || !strategyName || !resultsDocLink) {
            return res.status(400).json({
                error: 'Report date, instrument, daily PnL, strategy name, and results document link are required'
            });
        }
        const db = (0, database_1.getDb)();
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
    }
    catch (error) {
        console.error('Error creating trading report:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Update trading report
router.patch('/reports/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user?.id;
        const { reportDate, instrument, dailyPnL, strategyName, strategyDescription, resultsDocLink } = req.body;
        const db = (0, database_1.getDb)();
        const updateData = {};
        if (reportDate)
            updateData.report_date = reportDate;
        if (instrument)
            updateData.instrument = instrument.toUpperCase();
        if (dailyPnL !== undefined)
            updateData.daily_pnl = parseFloat(dailyPnL);
        if (strategyName)
            updateData.strategy_name = strategyName;
        if (strategyDescription !== undefined)
            updateData.strategy_description = strategyDescription;
        if (resultsDocLink)
            updateData.results_doc_link = resultsDocLink;
        const result = await db.updateTradingReport(id, studentId, updateData);
        if (!result) {
            return res.status(404).json({ error: 'Report not found or unauthorized' });
        }
        res.json({ message: 'Trading report updated successfully', report: result });
    }
    catch (error) {
        console.error('Error updating trading report:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Delete trading report
router.delete('/reports/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user?.id;
        const db = (0, database_1.getDb)();
        await db.deleteTradingReport(id, studentId);
        res.json({ message: 'Trading report deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting trading report:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// ==================== ADMIN ROUTES ====================
// Get all trading reports (Admin only)
router.get('/admin/reports', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.getDb)();
        const reports = await db.getAllTradingReports();
        res.json(reports);
    }
    catch (error) {
        console.error('Error fetching all trading reports:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Review/Update trading report status (Admin only)
router.patch('/admin/reports/:id/review', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;
        const { status, notes } = req.body;
        if (!status || !['pending', 'reviewed', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required (pending, reviewed, approved, rejected)' });
        }
        const db = (0, database_1.getDb)();
        await db.reviewTradingReport(id, adminId, status, notes);
        res.json({ message: 'Report reviewed successfully' });
    }
    catch (error) {
        console.error('Error reviewing report:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.default = router;
