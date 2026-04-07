"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const lead_1 = __importDefault(require("./routes/lead"));
const auth_1 = __importDefault(require("./routes/auth"));
const student_1 = __importDefault(require("./routes/student"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const lms_1 = __importDefault(require("./routes/lms"));
const evaluation_1 = __importDefault(require("./routes/evaluation"));
const quizzes_1 = __importDefault(require("./routes/quizzes"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const trading_1 = __importDefault(require("./routes/trading"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const announcements_1 = __importDefault(require("./routes/announcements"));
const adminInitializer_1 = require("./services/adminInitializer");
dotenv_1.default.config();
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process
});
// Initialize admin user on startup (non-blocking)
adminInitializer_1.AdminInitializer.initializeAdmin().catch(error => {
    console.error('Admin initialization failed:', error);
    // Don't exit the process, just log the error
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'https://qg-cms.vercel.app'
        ].filter(Boolean);
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Routes
app.use('/api/leads', lead_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/students', student_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/lms', lms_1.default);
app.use('/api/evaluation', evaluation_1.default);
app.use('/api/quizzes', quizzes_1.default);
app.use('/api/assignments', assignments_1.default);
app.use('/api/trading', trading_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/announcements', announcements_1.default);
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Keep the process alive
server.on('close', () => {
    console.log('Server closed');
});
process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});
// Keep the process alive - prevent event loop from becoming empty
const keepAlive = setInterval(() => {
    // This keeps the event loop alive
}, 1000 * 60 * 60); // Every hour
// Don't let the keep-alive interval prevent graceful shutdown
process.on('SIGINT', () => {
    clearInterval(keepAlive);
    process.exit(0);
});
process.on('SIGTERM', () => {
    clearInterval(keepAlive);
    process.exit(0);
});
