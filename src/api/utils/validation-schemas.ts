import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const EmailSchema = z.string().email('Invalid email format');

export const PhoneSchema = z.string().regex(/^[\d+\-\s()]+$/, 'Invalid phone format');

export const DateSchema = z.string().date('Invalid date format (YYYY-MM-DD)');

// ============================================================================
// HEALTH ALERTS
// ============================================================================

export const HealthAlertTypeSchema = z.enum(['epidemic', 'seasonal', 'outbreak', 'warning']);
export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const CreateHealthAlertSchema = z.object({
  type: HealthAlertTypeSchema,
  disease_name: z.string().min(1, 'Disease name required'),
  regions: z.array(z.string()).min(1, 'At least one region required'),
  severity: SeveritySchema,
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  description: z.string().optional(),
  prevention_tips: z.string().optional(),
  affected_age_groups: z.array(z.string()).optional(),
  source: z.string().optional(),
  data_source_url: z.string().url('Invalid URL').optional(),
});

export const UpdateHealthPreferencesSchema = z.object({
  alerts_enabled: z.boolean().optional(),
  alert_types: z.array(HealthAlertTypeSchema).optional(),
  notification_frequency: z.enum(['immediate', 'daily']).optional(),
  primary_region: z.string().optional(),
});

// ============================================================================
// DOCTOR REPORTS
// ============================================================================

export const GenerateDoctorReportSchema = z.object({
  babyId: UUIDSchema,
  reportType: z.enum(['pediatrician', 'vaccination', 'health_summary']),
  includeData: z.array(z.string()).optional(),
  dateRange: z.object({
    start: DateSchema,
    end: DateSchema,
  }).optional(),
});

export const EmailReportSchema = z.object({
  reportId: UUIDSchema,
  doctorEmail: EmailSchema,
  message: z.string().max(500, 'Message too long'),
});

// ============================================================================
// SLEEP & FEEDING ANALYTICS
// ============================================================================

export const AnalyzeSleepPatternsSchema = z.object({
  babyId: UUIDSchema,
  daysBack: z.number().min(1).max(365).optional().default(30),
});

export const SleepLogSchema = z.object({
  babyId: UUIDSchema,
  date: DateSchema,
  total_sleep_minutes: z.number().min(0),
  sleep_quality_score: z.number().min(0).max(10),
  night_sleep_continuous: z.boolean().optional(),
  nap_count: z.number().min(0).optional(),
});

export const FeedingLogSchema = z.object({
  babyId: UUIDSchema,
  date: DateSchema,
  total_feeds: z.number().min(0),
  total_duration_minutes: z.number().min(0).optional(),
  breast_milk_sessions: z.number().min(0).optional(),
  bottle_sessions: z.number().min(0).optional(),
  solids_sessions: z.number().min(0).optional(),
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const PushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('Invalid endpoint URL'),
    keys: z.object({
      auth: z.string(),
      p256dh: z.string(),
    }),
  }),
});

export const SendNotificationSchema = z.object({
  userId: UUIDSchema.optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.string()).optional(),
  tag: z.string().optional(),
});

export const ScheduleNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  scheduledFor: z.string().datetime(),
  data: z.record(z.string()).optional(),
});

// ============================================================================
// PAYMENTS
// ============================================================================

export const PaymentMethodEnum = z.enum(['paystack', 'flutterwave', 'stripe']);

export const ProcessAddonPaymentSchema = z.object({
  addonId: UUIDSchema,
  paymentMethod: PaymentMethodEnum,
  amount: z.number().min(1),
});

export const CancelSubscriptionSchema = z.object({
  subscriptionId: UUIDSchema,
});

// ============================================================================
// COMMUNITY
// ============================================================================

export const CreateForumPostSchema = z.object({
  forumId: UUIDSchema,
  title: z.string().min(5).max(200),
  content: z.string().min(10).max(5000),
  tags: z.array(z.string().max(20)).max(5).optional(),
});

export const CreatePlaydateSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().max(500).optional(),
  location: z.string().min(1),
  datetime: z.string().datetime(),
  babyAge: z.string().optional(),
  maxAttendees: z.number().min(1).optional(),
});

export const GetNearbyPlaydatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(100).optional().default(10),
});

// ============================================================================
// WEARABLE
// ============================================================================

export const ConnectAppleHealthSchema = z.object({
  healthKitToken: z.string(),
});

export const ConnectFitbitSchema = z.object({
  fitbitAuthCode: z.string(),
});

export const GetWearableDataSchema = z.object({
  babyId: UUIDSchema,
  deviceType: z.enum(['apple_health', 'health_connect', 'fitbit', 'oura_ring', 'garmin']).optional(),
  dataType: z.enum(['heart_rate', 'steps', 'sleep', 'temperature', 'activity']).optional(),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
});

// ============================================================================
// VOICE TRANSCRIPTION
// ============================================================================

export const UploadVoiceMemoSchema = z.object({
  babyId: UUIDSchema,
  category: z.enum(['general', 'cry']),
  file: z.any(), // FormData file
});

export const GetVoiceLogsSchema = z.object({
  babyId: UUIDSchema,
  category: z.enum(['general', 'cry']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// ============================================================================
// ML/AI INSIGHTS
// ============================================================================

export const PredictMilestoneSchema = z.object({
  babyId: UUIDSchema,
  milestone: z.enum(['rolling', 'sitting', 'walking', 'talking', 'crawling']),
});

export const GrowthAnalysisSchema = z.object({
  babyId: UUIDSchema,
});

// ============================================================================
// EMAIL REPORTS
// ============================================================================

export const GenerateWeeklyDigestSchema = z.object({
  babyId: UUIDSchema,
});

export const SendMilestoneAnnouncementSchema = z.object({
  babyId: UUIDSchema,
  milestone: z.string(),
  details: z.object({
    date: DateSchema,
    notes: z.string().optional(),
  }),
});

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ valid: boolean; data?: T; error?: string }> {
  try {
    const validated = await schema.parseAsync(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { valid: false, error: messages.join('; ') };
    }
    return { valid: false, error: 'Validation failed' };
  }
}

// ============================================================================
// NEW FEATURES: SMART SCHEDULING, EXPENSES, BENCHMARKING
// ============================================================================

export const CreateVaccineReminderSchema = z.object({
  babyId: UUIDSchema,
  vaccineId: z.string().min(1),
  vaccineName: z.string().min(1),
  scheduledDate: DateSchema,
  notes: z.string().optional(),
});

export const CreateDoctorAppointmentSchema = z.object({
  babyId: UUIDSchema,
  doctorName: z.string().min(1),
  appointmentType: z.enum(['checkup', 'vaccination', 'consultation', 'emergency']),
  scheduledDate: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateBabyExpenseSchema = z.object({
  babyId: UUIDSchema,
  category: z.enum(['formula', 'diapers', 'clothing', 'toys', 'medical', 'other']),
  description: z.string().min(1),
  amount: z.number().min(0),
  purchaseDate: DateSchema,
  quantity: z.number().min(1).optional(),
  receiptUrl: z.string().url().optional(),
});

export const ExpenseBudgetSchema = z.object({
  babyId: UUIDSchema,
  category: z.enum(['formula', 'diapers', 'clothing', 'toys', 'medical', 'other']),
  monthlyBudget: z.number().min(0),
  alertThreshold: z.number().min(0).max(100).default(80),
});

export const GetGrowthBenchmarksSchema = z.object({
  babyId: UUIDSchema,
  metric: z.enum(['height', 'weight', 'head_circumference']),
  ageInDays: z.number().min(0),
  gender: z.enum(['male', 'female']),
});

export const GetMilestoneBenchmarksSchema = z.object({
  ageInMonths: z.number().min(0).max(60),
  milestone: z.string(),
});

export const CreateActivityLogSchema = z.object({
  babyId: UUIDSchema,
  activityType: z.enum(['tummy_time', 'reading', 'outdoor', 'music', 'sensory', 'social', 'other']),
  durationMinutes: z.number().min(1),
  date: DateSchema,
  notes: z.string().optional(),
  developmentalBenefit: z.string().optional(),
});

export const TrackParentStressSchema = z.object({
  userId: UUIDSchema,
  stressLevel: z.number().min(1).max(10),
  sleepHours: z.number().min(0).max(24),
  moodTags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const SleepCoachingProgramSchema = z.object({
  babyId: UUIDSchema,
  method: z.enum(['ferber', 'cio', 'gentling', 'pick_up_put_down', 'shush_pat']),
  targetBedtime: z.string().regex(/^\d{2}:\d{2}$/),
  currentChallenges: z.array(z.string()).optional(),
});

export const CreateMealPlanSchema = z.object({
  babyId: UUIDSchema,
  ageInMonths: z.number().min(4).max(36),
  mealType: z.enum(['solids_intro', 'finger_foods', 'mixed', 'toddler']),
  startDate: DateSchema,
  weeklyPlan: z.record(z.array(z.string())).optional(),
});

export const NutritionTrackingSchema = z.object({
  babyId: UUIDSchema,
  date: DateSchema,
  meals: z.array(z.object({
    mealName: z.string(),
    ingredients: z.array(z.string()),
    calories: z.number().optional(),
    allergens: z.array(z.string()).optional(),
  })),
});

export const CreateSleepCoachingSessionSchema = z.object({
  programId: UUIDSchema,
  dayNumber: z.number().min(1),
  bedtimeAchieved: z.boolean(),
  nightWakings: z.number().min(0),
  notes: z.string().optional(),
  parentFatigue: z.number().min(1).max(10),
});

// Type exports for use in routes
export type HealthAlert = z.infer<typeof CreateHealthAlertSchema>;
export type DoctorReport = z.infer<typeof GenerateDoctorReportSchema>;
export type SleepLog = z.infer<typeof SleepLogSchema>;
export type FeedingLog = z.infer<typeof FeedingLogSchema>;
export type ForumPost = z.infer<typeof CreateForumPostSchema>;
export type Playdate = z.infer<typeof CreatePlaydateSchema>;
export type WearableData = z.infer<typeof GetWearableDataSchema>;
export type VaccineReminder = z.infer<typeof CreateVaccineReminderSchema>;
export type BabyExpense = z.infer<typeof CreateBabyExpenseSchema>;
export type SleepCoachingProgram = z.infer<typeof SleepCoachingProgramSchema>;
export type MealPlan = z.infer<typeof CreateMealPlanSchema>;
