"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ==================== ADMIN ROUTES ====================
// Create LMS content (PDF, Text, or Link)
router.post('/content', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { title, type, content } = req.body;
        const adminId = req.user?.id;
        console.log('Creating LMS content:', { title, type, content: content?.substring(0, 50), adminId });
        if (!title || !type || !content) {
            return res.status(400).json({ error: 'Title, type, and content are required' });
        }
        if (!['pdf', 'text', 'link', 'video'].includes(type)) {
            return res.status(400).json({ error: 'Type must be pdf, text, link, or video' });
        }
        const db = (0, database_1.getDb)();
        const contentData = {
            id: `lms-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title,
            type,
            content,
            createdBy: adminId
        };
        const result = await db.createLmsContent(contentData);
        console.log('LMS content created successfully:', result);
        res.json({ message: 'Content created successfully', content: result });
    }
    catch (error) {
        console.error('Error creating LMS content:', error);
        console.error('Error details:', error.message, error.code, error.details);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Get all LMS content
router.get('/content', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.getDb)();
        const content = await db.getAllLmsContent();
        res.json(content);
    }
    catch (error) {
        console.error('Error fetching LMS content:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Assign content to students
router.post('/assign', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { contentId, studentIds, notes } = req.body;
        const adminId = req.user?.id;
        console.log('Assigning content:', { contentId, studentIds, notes, adminId });
        if (!contentId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: 'Content ID and student IDs are required' });
        }
        const db = (0, database_1.getDb)();
        const assignments = [];
        for (const studentId of studentIds) {
            const assignmentId = `lms-assign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('Creating assignment:', { assignmentId, contentId, studentId });
            const assignment = await db.createLmsAssignment({
                id: assignmentId,
                contentId,
                studentId,
                status: 'assigned',
                notes: notes || ''
            });
            console.log('Assignment created:', assignment);
            // Create initial timeline entry
            await db.createLmsTimeline({
                id: `lms-timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                assignmentId,
                status: 'assigned',
                notes: 'Content assigned to student',
                updatedBy: adminId
            });
            assignments.push(assignment);
        }
        console.log('All assignments created:', assignments.length);
        res.json({ message: 'Content assigned successfully', assignments });
    }
    catch (error) {
        console.error('Error assigning LMS content:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Get all assignments with student and content details
router.get('/assignments', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.getDb)();
        console.log('Fetching all LMS assignments...');
        const assignments = await db.getAllLmsAssignments();
        console.log(`Found ${assignments.length} assignments`);
        res.json(assignments);
    }
    catch (error) {
        console.error('Error fetching LMS assignments:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Get timeline for a specific student
router.get('/timeline/:studentId', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { studentId } = req.params;
        const db = (0, database_1.getDb)();
        const timeline = await db.getStudentLmsTimeline(studentId);
        res.json(timeline);
    }
    catch (error) {
        console.error('Error fetching student timeline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete LMS content
router.delete('/content/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.getDb)();
        await db.deleteLmsContent(id);
        res.json({ message: 'Content deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting LMS content:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ==================== STUDENT ROUTES ====================
// Get student's assigned content
router.get('/my-assignments', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        console.log('Fetching assignments for student:', studentId);
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        const db = (0, database_1.getDb)();
        const assignments = await db.getStudentLmsAssignments(studentId);
        console.log(`Found ${assignments.length} assignments for student ${studentId}`);
        res.json(assignments);
    }
    catch (error) {
        console.error('Error fetching student assignments:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Update assignment status (student marks as in_progress or completed)
router.patch('/assignments/:id/status', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        if (!['in_progress', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Status must be in_progress or completed' });
        }
        const db = (0, database_1.getDb)();
        // Verify the assignment belongs to this student
        const assignment = await db.getLmsAssignmentById(id);
        if (!assignment || assignment.studentId !== studentId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Update assignment status
        const updated = await db.updateLmsAssignmentStatus(id, status, notes);
        // Add timeline entry
        await db.createLmsTimeline({
            id: `lms-timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            assignmentId: id,
            status,
            notes: notes || `Status updated to ${status}`,
            updatedBy: studentId
        });
        res.json({ message: 'Status updated successfully', assignment: updated });
    }
    catch (error) {
        console.error('Error updating assignment status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get student's timeline
router.get('/my-timeline', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        const db = (0, database_1.getDb)();
        const timeline = await db.getStudentLmsTimeline(studentId);
        res.json(timeline);
    }
    catch (error) {
        console.error('Error fetching student timeline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student: Get my assignments
router.get('/student/assignments', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        const db = (0, database_1.getDb)();
        const assignments = await db.getStudentLmsAssignments(studentId);
        res.json(assignments);
    }
    catch (error) {
        console.error('Error fetching student assignments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student: Get my timeline
router.get('/student/timeline', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        const db = (0, database_1.getDb)();
        const timeline = await db.getStudentLmsTimeline(studentId);
        res.json(timeline);
    }
    catch (error) {
        console.error('Error fetching student timeline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Get all students' timelines
router.get('/timelines', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.getDb)();
        // Get all students
        const students = await db.findAllStudentsWithProfiles();
        // Get timeline for each student
        const timelines = await Promise.all(students.map(async (student) => {
            const studentTimeline = await db.getStudentLmsTimeline(student.id);
            return {
                studentId: student.id,
                studentName: `${student.firstname} ${student.lastname}`,
                email: student.email,
                timeline: studentTimeline
            };
        }));
        res.json(timelines);
    }
    catch (error) {
        console.error('Error fetching all timelines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
