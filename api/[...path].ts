import { Router } from 'express';
import authMiddleware, { rateLimit } from '../src/api/middleware/auth.js';
import babiesRoutes from '../src/api/routes/babies.js';
import feedingRoutes from '../src/api/routes/feeding.js';
import sleepRoutes from '../src/api/routes/sleep.js';
import diaperRoutes from '../src/api/routes/diaper.js';
import healthRoutes from '../src/api/routes/health.js';
import vaccinationsRoutes from '../src/api/routes/vaccinations.js';
import photosRoutes from '../src/api/routes/photos.js';
import analyticsRoutes from '../src/api/routes/analytics.js';
import mlInsightsRoutes from '../src/api/routes/ml-insights.js';
import familyRoutes from '../src/api/routes/family.js';
import appointmentsRoutes from '../src/api/routes/appointments.js';
import doctorReportsRoutes from '../src/api/routes/doctor-reports.js';
import healthAlertsRoutes from '../src/api/routes/health-alerts.js';
import expensesRoutes from '../src/api/routes/expenses.js';
import notificationsRoutes from '../src/api/routes/notifications.js';
import emailReportsRoutes from '../src/api/routes/email-reports.js';
import communityRoutes from '../src/api/routes/community.js';
import wearableRoutes from '../src/api/routes/wearable.js';
import voiceRoutes from '../src/api/routes/voice-transcription.js';
import paymentsRoutes, {
  handleFlutterwaveWebhook,
  handlePaystackWebhook,
} from '../src/api/routes/payments.js';
import adminRoutes from '../src/api/routes/admin.js';
import managerRoutes from '../src/api/routes/manager.js';
import doctorRoutes from '../src/api/routes/doctor.js';
import careAdvancedRoutes from '../src/api/routes/care-advanced.js';
import cronRoutes from '../src/api/routes/cron.js';
import {
  adminOverviewHandler,
  currentRoleHandler,
  healthCheckHandler,
  healthConfigHandler,
  sendEmailHandler,
  sendInviteEmailHandler,
  sendReportEmailHandler,
  syncFullHandler,
  syncSnapshotHandler,
  voiceTranscribeHandler,
} from '../src/api/handlers/system-handlers.js';
import { sendWelcomeEmailHandler } from '../src/api/handlers/auth-handlers.js';
import { runExpressRouter } from './_shared/router-proxy.js';
import type { ApiAdapterRequest, ApiAdapterResponse } from './_shared/http.js';

const router = Router();
const genericEmailRateLimit = rateLimit(3, '1m');
const inviteEmailRateLimit = rateLimit(6, '1m');
const welcomeEmailRateLimit = rateLimit(3, '1m');
const reportEmailRateLimit = rateLimit(4, '1m');
const syncRateLimit = rateLimit(8, '1m');
const voiceTranscriptionRateLimit = rateLimit(12, '1m');

router.get('/health', healthCheckHandler);
router.get('/health/config', healthConfigHandler);

router.use(authMiddleware);

router.post('/send-email', genericEmailRateLimit, sendEmailHandler);
router.post('/auth/welcome-email', welcomeEmailRateLimit, sendWelcomeEmailHandler);
router.post('/email/send-invite', inviteEmailRateLimit, sendInviteEmailHandler);
router.post('/email/send-report', reportEmailRateLimit, sendReportEmailHandler);
router.get('/admin/current-role', currentRoleHandler);
router.get('/admin/overview', adminOverviewHandler);
router.post('/sync/full', syncRateLimit, syncFullHandler);
router.get('/sync/snapshot', syncSnapshotHandler);
router.post('/voice/transcribe', voiceTranscriptionRateLimit, voiceTranscribeHandler);
router.post('/webhooks/paystack', handlePaystackWebhook);
router.post('/webhooks/flutterwave', handleFlutterwaveWebhook);

router.use('/babies', babiesRoutes);
router.use('/feeding', feedingRoutes);
router.use('/sleep', sleepRoutes);
router.use('/diaper', diaperRoutes);
router.use('/health', healthRoutes);
router.use('/vaccinations', vaccinationsRoutes);
router.use('/photos', photosRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ml', mlInsightsRoutes);
router.use('/family', familyRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/reports', doctorReportsRoutes);
router.use('/health-alerts', healthAlertsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/email-reports', emailReportsRoutes);
router.use('/community', communityRoutes);
router.use('/wearable', wearableRoutes);
router.use('/voice', voiceRoutes);
router.use('/payments', paymentsRoutes);
router.use('/admin', adminRoutes);
router.use('/manager', managerRoutes);
router.use('/doctor', doctorRoutes);
router.use('/care', careAdvancedRoutes);
router.use('/cron', cronRoutes);

router.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

export default async function handler(
  req: ApiAdapterRequest,
  res: ApiAdapterResponse,
): Promise<void> {
  await runExpressRouter({
    request: req,
    response: res,
    router: router as any,
    mountPath: '/api',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    requireAuth: false,
  });
}
