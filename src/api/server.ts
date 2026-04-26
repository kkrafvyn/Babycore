/**
 * Express Server Configuration
 * Main backend server setup with middleware and route mounting
 */

import express, { Express, Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authMiddleware from './middleware/auth.js';
import babiesRoutes from './routes/babies.js';
import feedingRoutes from './routes/feeding.js';
import sleepRoutes from './routes/sleep.js';
import diaperRoutes from './routes/diaper.js';
import healthRoutes from './routes/health.js';
import vaccinationsRoutes from './routes/vaccinations.js';
import photosRoutes from './routes/photos.js';
import analyticsRoutes from './routes/analytics.js';
import mlInsightsRoutes from './routes/ml-insights.js';
import familyRoutes from './routes/family.js';
import appointmentsRoutes from './routes/appointments.js';
import doctorReportsRoutes from './routes/doctor-reports.js';
import healthAlertsRoutes from './routes/health-alerts.js';
import expensesRoutes from './routes/expenses.js';
import notificationsRoutes from './routes/notifications.js';
import emailReportsRoutes from './routes/email-reports.js';
import communityRoutes from './routes/community.js';
import wearableRoutes from './routes/wearable.js';
import voiceRoutes from './routes/voice-transcription.js';
import paymentsRoutes, {
  handleFlutterwaveWebhook,
  handlePaystackWebhook,
} from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import managerRoutes from './routes/manager.js';
import doctorRoutes from './routes/doctor.js';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local',
});

const app: Express = express();

// ==================== MIDDLEWARE ====================

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    console.log(
      `[${logLevel.toUpperCase()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });
  
  next();
});

// Request validation
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// Authentication middleware
app.use(authMiddleware);

// ==================== ROUTES ====================

// Health check (no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
  });
});

// API v1 routes
const apiRouter = express.Router();

// ===== CORE FUNCTIONALITY =====
// Baby Management
apiRouter.use('/babies', babiesRoutes);

// Feeding Tracking
apiRouter.use('/feeding', feedingRoutes);

// Sleep Tracking
apiRouter.use('/sleep', sleepRoutes);

// Diaper Tracking
apiRouter.use('/diaper', diaperRoutes);

// Health Records
apiRouter.use('/health', healthRoutes);

// Vaccinations
apiRouter.use('/vaccinations', vaccinationsRoutes);

// Photos
apiRouter.use('/photos', photosRoutes);

// ===== ANALYTICS & INSIGHTS =====
// Analytics Dashboard
apiRouter.use('/analytics', analyticsRoutes);

// ML/AI Insights
apiRouter.use('/ml', mlInsightsRoutes);

// ===== FAMILY & SHARING =====
// Family Sharing
apiRouter.use('/family', familyRoutes);

// ===== APPOINTMENTS & HEALTH =====
// Doctor Appointments
apiRouter.use('/appointments', appointmentsRoutes);

// Doctor Reports
apiRouter.use('/reports', doctorReportsRoutes);

// Health Alerts
apiRouter.use('/health-alerts', healthAlertsRoutes);

// ===== EXPENSES & BUDGET =====
// Expense Tracking
apiRouter.use('/expenses', expensesRoutes);

// ===== COMMUNICATION =====
// Notifications
apiRouter.use('/notifications', notificationsRoutes);

// Email Reports
apiRouter.use('/email-reports', emailReportsRoutes);

// Community
apiRouter.use('/community', communityRoutes);

// ===== INTEGRATIONS =====
// Wearable Integration
apiRouter.use('/wearable', wearableRoutes);

// Voice Transcription
apiRouter.use('/voice', voiceRoutes);

// ===== PAYMENTS =====
// Payments
apiRouter.use('/payments', paymentsRoutes);

// ===== ADMIN & MANAGEMENT =====
// Admin Routes
apiRouter.use('/admin', adminRoutes);

// Manager Routes
apiRouter.use('/manager', managerRoutes);

// Doctor Routes
apiRouter.use('/doctor', doctorRoutes);

app.use('/api', apiRouter);

// ==================== WEBHOOK ROUTES (NO AUTH) ====================

// Payment webhooks - bypass authentication
app.post('/webhooks/paystack', handlePaystackWebhook);
app.post('/webhooks/flutterwave', handleFlutterwaveWebhook);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ==================== SERVER STARTUP ====================

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║     BabyLog Backend API Server         ║
╚════════════════════════════════════════╝

Environment: ${process.env.NODE_ENV || 'development'}
Server:     http://${HOST}:${PORT}
Client:     ${process.env.CLIENT_URL || 'http://localhost:5173'}
Database:   ${process.env.SUPABASE_URL?.substring(8, 30)}...

Routes:
  ✓ Health Alerts:     /api/health-alerts
  ✓ Doctor Reports:    /api/reports
  ✓ ML/AI Insights:    /api/ml
  ✓ Notifications:     /api/notifications
  ✓ Payments:          /api/payments
  ✓ Email Reports:     /api/email-reports
  ✓ Community:         /api/community
  ✓ Wearables:         /api/wearable

Ready to accept requests! 🚀
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, send to error tracking service
});

export default app;
