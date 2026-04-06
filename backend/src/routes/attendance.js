"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Admin: Get all attendance for a month
router.get('/', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { month } = req.query;
        const db = (0, database_1.default)();
        if (month) {
            // Parse month (format: YYYY-MM)
            const [year, monthNum] = month.split('-');
            const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month
            const records = await db.findAttendanceByDateRange(startDate, endDate);
            res.json(records);
        }
        else {
            // Get all attendance
            const records = await db.findAllAttendance();
            res.json(records);
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Create or update attendance (handles both marking and updating)
router.post('/', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { studentId, date, status } = req.body;
        // Validate status
        const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be PRESENT, ABSENT, HALF_DAY, or LATE' });
        }
        const db = (0, database_1.default)();
        // Check if attendance already exists for this student and date
        const existingAttendance = await db.findAttendanceByStudentAndDate(studentId, new Date(date));
        let attendance;
        if (existingAttendance) {
            // Update existing attendance
            attendance = await db.updateAttendance(existingAttendance.id, { status });
        }
        else {
            // Create new attendance
            attendance = await db.createAttendance({
                studentid: studentId,
                date: new Date(date),
                status,
            });
        }
        res.json({ message: 'Attendance saved', attendance });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Mark attendance for a student
router.post('/mark', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { studentId, date, status } = req.body;
        // Validate status
        const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be PRESENT, ABSENT, or HALF_DAY' });
        }
        const db = (0, database_1.default)();
        const attendance = await db.createAttendance({
            studentid: studentId,
            date: new Date(date),
            status,
        });
        res.json({ message: 'Attendance marked', attendance });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Get attendance by student ID
router.get('/student/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const records = await db.findStudentAttendance(req.params.id);
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student: Get own attendance with optional date range
router.get('/student', auth_1.authenticate, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const studentId = req.user?.id;
        const { start, end } = req.query;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        let records;
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            records = await db.findAttendanceByDateRange(startDate, endDate);
            records = records.filter(r => r.studentid === studentId);
        }
        else {
            records = await db.findStudentAttendance(studentId);
        }
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Export attendance to CSV
router.get('/export', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { month } = req.query;
        const db = (0, database_1.default)();
        let records;
        if (month) {
            // Parse month (format: YYYY-MM)
            const [year, monthNum] = month.split('-');
            const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(monthNum) + 1, 0); // First day of NEXT month
            records = await db.findAttendanceByDateRange(startDate, endDate);
        }
        else {
            // Get all attendance
            records = await db.findAllAttendance();
        }
        // Transform data for CSV export
        const csvData = records.map(record => ({
            'Student ID': record.studentid,
            'Student Name': record.studentName || 'N/A',
            'Date': new Date(record.date).toLocaleDateString(),
            'Status': record.status,
            'Marked By': record.markedBy || 'Admin',
            'Created At': new Date(record.created_at).toLocaleString()
        }));
        // Convert to CSV
        const csv = convertToCSV(csvData);
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_${month || 'all'}_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Helper function to convert JSON to CSV
function convertToCSV(data) {
    if (!data || data.length === 0)
        return '';
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
        }).join(',');
    });
    return [csvHeaders, ...csvRows].join('\n');
}
exports.default = router;
