import cors from 'cors';
import express, { NextFunction, Request, Response, Router } from 'express';
import authMiddleware from '../src/api/middleware/auth';
import adminRoutes from '../src/api/routes/admin';
import analyticsRoutes from '../src/api/routes/analytics';
import appointmentsRoutes from '../src/api/routes/appointments';
import babiesRoutes from '../src/api/routes/babies';
import communityRoutes from '../src/api/routes/community';
import diaperRoutes from '../src/api/routes/diaper';
import doctorRoutes from '../src/api/routes/doctor';
import doctorReportsRoutes from '../src/api/routes/doctor-reports';
import emailReportsRoutes from '../src/api/routes/email-reports';
import expensesRoutes from '../src/api/routes/expenses';
import familyRoutes from '../src/api/routes/family';
import feedingRoutes from '../src/api/routes/feeding';
import healthRoutes from '../src/api/routes/health';
import healthAlertsRoutes from '../src/api/routes/health-alerts';
import managerRoutes from '../src/api/routes/manager';
import mlInsightsRoutes from '../src/api/routes/ml-insights';
import notificationsRoutes from '../src/api/routes/notifications';
import photosRoutes from '../src/api/routes/photos';
import paymentsRoutes, {
  handleFlutterwaveWebhook,
  handlePaystackWebhook,
} from '../src/api/routes/payments';
import sleepRoutes from '../src/api/routes/sleep';
import vaccinationsRoutes from '../src/api/routes/vaccinations';
import voiceRoutes from '../src/api/routes/voice-transcription';
import wearableRoutes from '../src/api/routes/wearable';

const app = express();

const corsOriginConfig = process.env.CORS_ORIGIN?.trim()
  ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim())
  : process.env.CLIENT_URL || true;

app.use(
  cors({
    origin: corsOriginConfig,
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
  });
});

app.post(['/webhooks/paystack', '/api/webhooks/paystack'], handlePaystackWebhook);
app.post(['/webhooks/flutterwave', '/api/webhooks/flutterwave'], handleFlutterwaveWebhook);

app.use(authMiddleware);

const mountRoute = (segment: string, router: Router) => {
  app.use(segment, router);
  app.use(`/api${segment}`, router);
};

mountRoute('/babies', babiesRoutes);
mountRoute('/feeding', feedingRoutes);
mountRoute('/sleep', sleepRoutes);
mountRoute('/diaper', diaperRoutes);
mountRoute('/health', healthRoutes);
mountRoute('/vaccinations', vaccinationsRoutes);
mountRoute('/photos', photosRoutes);
mountRoute('/analytics', analyticsRoutes);
mountRoute('/ml', mlInsightsRoutes);
mountRoute('/family', familyRoutes);
mountRoute('/appointments', appointmentsRoutes);
mountRoute('/reports', doctorReportsRoutes);
mountRoute('/health-alerts', healthAlertsRoutes);
mountRoute('/expenses', expensesRoutes);
mountRoute('/notifications', notificationsRoutes);
mountRoute('/email-reports', emailReportsRoutes);
mountRoute('/community', communityRoutes);
mountRoute('/wearable', wearableRoutes);
mountRoute('/voice', voiceRoutes);
mountRoute('/payments', paymentsRoutes);
mountRoute('/admin', adminRoutes);
mountRoute('/manager', managerRoutes);
mountRoute('/doctor', doctorRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

export default app;
