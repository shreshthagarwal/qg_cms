"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const xlsx = __importStar(require("xlsx"));
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../database"));
const router = (0, express_1.Router)();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
// Admin: Get all quiz assignments
router.get('/assignments', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const assignments = await db.getAllQuizAssignments();
        res.json(assignments);
    }
    catch (error) {
        console.error('Error getting all quiz assignments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Get quiz assignments
router.get('/:id/assignments', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const quizId = req.params.id;
        const db = (0, database_1.default)();
        const assignments = await db.getQuizAssignments(quizId);
        res.json(assignments);
    }
    catch (error) {
        console.error('Error getting quiz assignments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Delete quiz submission
router.delete('/submissions/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const submissionId = req.params.id;
        const db = (0, database_1.default)();
        await db.deleteQuizSubmission(submissionId);
        res.json({ message: 'Submission deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting submission:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get quiz submission details with answers (for admin and student review)
router.get('/submissions/:id/details', auth_1.authenticate, async (req, res) => {
    try {
        const submissionId = req.params.id;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const db = (0, database_1.default)();
        const submissionDetails = await db.getQuizSubmissionDetails(submissionId, userId, userRole);
        if (!submissionDetails) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json({
            submission: submissionDetails.submission,
            answers: submissionDetails.answers
        });
    }
    catch (error) {
        console.error('Error getting submission details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Delete quiz (with cascade delete)
router.delete('/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const quizId = req.params.id;
        const db = (0, database_1.default)();
        // Delete quiz (cascade will handle assignments and submissions)
        await db.deleteQuiz(quizId);
        res.json({ message: 'Quiz deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Get all quizzes
router.get('/', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const quizzes = await db.findAllQuizzes();
        res.json(quizzes);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Upload quiz questions from Excel (metadata provided in request)
router.post('/upload', auth_1.authenticate, auth_1.authorizeAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Get metadata from request body
        const { title, description, duration } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Quiz title is required' });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        console.log('Excel parsed data:', JSON.stringify(data.slice(0, 3), null, 2)); // Log first 3 rows
        console.log('First row keys:', data.length > 0 ? Object.keys(data[0]) : 'No data');
        // Process questions from Excel (with headers in first row)
        const questions = data.map((row, index) => {
            console.log(`Processing row ${index}:`, row);
            // Parse correct answer - Excel uses 1-4, convert to 0-3 for code
            let correctAnswer = parseInt(row.correctAnswer || row.CorrectAnswer || row.correctanswer || row['correct answer'] || row['Correct Answer'] || 0);
            if (correctAnswer >= 1 && correctAnswer <= 4) {
                correctAnswer = correctAnswer - 1; // Convert 1-4 to 0-3
            }
            return {
                id: `q${index}`,
                question: row.question || row.Question || row.QUESTION || '',
                options: [
                    row.option1 || row.Option1 || row.OPTION1 || row['option 1'] || row['Option 1'] || '',
                    row.option2 || row.Option2 || row.OPTION2 || row['option 2'] || row['Option 2'] || '',
                    row.option3 || row.Option3 || row.OPTION3 || row['option 3'] || row['Option 3'] || '',
                    row.option4 || row.Option4 || row.OPTION4 || row['option 4'] || row['Option 4'] || ''
                ],
                correctAnswer: correctAnswer
            };
        }).filter(q => q.question);
        if (questions.length === 0) {
            return res.status(400).json({ error: 'No valid questions found in the Excel file. Ensure the file has columns: question, option1, option2, option3, option4, correctAnswer' });
        }
        const quizData = {
            title: title || 'Untitled Quiz',
            description: description || '',
            duration: parseInt(duration) || 60,
            questions: questions
        };
        const db = (0, database_1.default)();
        const quiz = await db.createQuiz(quizData);
        res.json({ message: 'Quiz uploaded successfully', quiz });
    }
    catch (error) {
        console.error('Error uploading quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Assign quiz to students
router.post('/:id/assign', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { studentIds, deadline, duration } = req.body;
        const quizId = req.params.id;
        const db = (0, database_1.default)();
        await db.assignQuizToStudents(quizId, studentIds, deadline, duration);
        res.json({ message: 'Quiz assigned successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Delete quiz assignment
router.delete('/assignments/:id', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const db = (0, database_1.default)();
        await db.deleteQuizAssignment(assignmentId);
        res.json({ message: 'Assignment deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Get submitted quizzes
router.get('/submitted', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const db = (0, database_1.default)();
        const submittedQuizzes = await db.findSubmittedQuizzes();
        res.json(submittedQuizzes);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Release scores
router.post('/:id/release-scores', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const quizId = req.params.id;
        const db = (0, database_1.default)();
        await db.releaseQuizScores(quizId);
        res.json({ message: 'Scores released successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: Archive quiz
router.post('/:id/archive', auth_1.authenticate, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const quizId = req.params.id;
        const db = (0, database_1.default)();
        await db.archiveQuiz(quizId);
        res.json({ message: 'Quiz archived successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student: Get active quizzes
router.get('/active', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId)
            return res.status(401).json({ error: 'Student ID not found' });
        const db = (0, database_1.default)();
        const activeQuizzes = await db.findActiveQuizzesForStudent(studentId);
        res.json(activeQuizzes);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student: Get attempted quizzes
router.get('/attempted', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId)
            return res.status(401).json({ error: 'Student ID not found' });
        const db = (0, database_1.default)();
        const attemptedQuizzes = await db.findAttemptedQuizzesForStudent(studentId);
        res.json(attemptedQuizzes);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student: Get quiz questions
router.get('/:id/questions', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        const quizId = req.params.id;
        console.log('Fetching quiz questions:', { studentId, quizId });
        if (!studentId) {
            console.error('Student ID not found in request');
            return res.status(401).json({ error: 'Student ID not found' });
        }
        const db = (0, database_1.default)();
        // Check if student has access to this quiz
        console.log('Checking quiz access...');
        const hasAccess = await db.checkQuizAccess(studentId, quizId);
        console.log('Quiz access result:', hasAccess);
        if (!hasAccess) {
            console.log('Access denied for student:', studentId, 'quiz:', quizId);
            return res.status(403).json({ error: 'Access denied' });
        }
        // Check if student has already attempted this quiz
        console.log('Checking if quiz already attempted...');
        const hasAttempted = await db.hasStudentAttemptedQuiz(studentId, quizId);
        console.log('Quiz attempted result:', hasAttempted);
        if (hasAttempted) {
            console.log('Quiz already attempted by student:', studentId);
            return res.status(400).json({ error: 'Quiz already attempted' });
        }
        // Get quiz questions
        console.log('Getting quiz questions...');
        const questions = await db.getQuizQuestions(quizId);
        console.log('Quiz questions retrieved:', questions.length, 'questions');
        // Get quiz details
        const quiz = await db.getQuizById(quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        res.json({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            duration: quiz.duration,
            questions: questions
        });
    }
    catch (error) {
        console.error('Error in get quiz questions route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Student: Submit quiz
router.post('/:id/submit', auth_1.authenticate, async (req, res) => {
    try {
        const studentId = req.user?.id;
        const quizId = req.params.id;
        const { answers, windowSwitches, timeSpent } = req.body;
        console.log('Quiz submission received:', { studentId, quizId, answers, windowSwitches, timeSpent });
        console.log('Answers type:', typeof answers, 'Is array:', Array.isArray(answers));
        console.log('Answers length:', answers?.length);
        console.log('First few answers:', answers?.slice(0, 5));
        if (!studentId)
            return res.status(401).json({ error: 'Student ID not found' });
        const db = (0, database_1.default)();
        // Calculate score based on correct answers
        const questions = await db.getQuizQuestions(quizId);
        console.log('Questions for scoring:', questions.length);
        let correctCount = 0;
        questions.forEach((question, index) => {
            let userAnswer = answers[index];
            // Handle both array and object formats
            if (Array.isArray(answers)) {
                userAnswer = answers[index];
            }
            else {
                userAnswer = answers[index];
            }
            console.log(`Checking question ${index}: student answer=${userAnswer}, correct=${question.correctAnswer}, answer type=${typeof userAnswer}`);
            if (userAnswer === question.correctAnswer) {
                console.log(`Question ${index} is CORRECT`);
                correctCount++;
            }
            else {
                console.log(`Question ${index} is INCORRECT`);
            }
        });
        const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
        console.log('Calculated score:', score);
        // Check for cheating flags
        const cheatingFlagged = windowSwitches > 3; // Flag if more than 3 window switches
        const submission = await db.submitQuizAttempt({
            quizId,
            studentId,
            answers,
            score,
            windowSwitches,
            timeSpent,
            cheatingFlagged,
            submittedAt: new Date().toISOString()
        });
        console.log('Quiz submitted successfully:', submission);
        res.json({ message: 'Quiz submitted successfully', score, cheatingFlagged });
    }
    catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
