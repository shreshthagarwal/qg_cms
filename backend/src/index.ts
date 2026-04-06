import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import leadRoutes from './routes/lead';
import authRoutes from './routes/auth';
import studentRoutes from './routes/student';
import attendanceRoutes from './routes/attendance';
import lmsRoutes from './routes/lms';
import evaluationRoutes from './routes/evaluation';
import quizRoutes from './routes/quizzes';
import assignmentRoutes from './routes/assignments';
import tradingRoutes from './routes/trading';
import feedbackRoutes from './routes/feedback';
import { AdminInitializer } from './services/adminInitializer';

dotenv.config();

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

// Validate environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

// Initialize admin user on startup (non-blocking)
AdminInitializer.initializeAdmin().catch(error => {
  console.error('Admin initialization failed:', error);
  // Don't exit the process, just log the error
});

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://qg-cms.vercel.app'
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/leads', leadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/feedback', feedbackRoutes);

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
