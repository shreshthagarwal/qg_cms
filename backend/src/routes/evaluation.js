"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Admin: Score an assignment
router.post('/score', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { contentId, score } = req.body;
        const db = (0, database_1.default)();
        const updatedContent = await db.updateLmsContentScore(contentId, Number(score));
        res.json({ message: 'Assignment scored', content: updatedContent });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student/Admin: Get Evaluation/Performance Dashboard Stats
router.get('/dashboard/:studentId', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        if (req.user?.role === 'STUDENT' && req.user.id !== studentId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const db = (0, database_1.default)();
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
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
