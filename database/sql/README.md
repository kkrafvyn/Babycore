# Database Migrations

This folder contains organized SQL migration files for the BabyLog application.

## ⚠️ CRITICAL: Execution Order

**MUST run in this order or migrations will fail!**

### Phase 1: Doctor Role (NEW) - RUN FIRST
| File | Purpose | Status |
|------|---------|--------|
| `00-doctor-profiles.sql` | **Doctor role core - REQUIRED FIRST** | ✅ NEW |

### Phase 2: Core System
| File | Purpose |
|------|---------|
| `01-roles-and-permissions.sql` | User roles and permission system (Admin, Manager, User, Doctor) |
| `02-health-alerts.sql` | Health alerts and disease epidemic notifications |

### Phase 3: Features
| File | Purpose |
|------|---------|
| `03-photo-management.sql` | Baby photos and monthly collages |
| `04-doctor-integration.sql` | Doctor reports and pediatrician contacts |
| `05-family-sharing.sql` | Family sharing invites and caregiver sessions |
| `06-analytics.sql` | Sleep and feeding analytics |
| `07-health-records.sql` | Health records, allergies, and medications |
| `08-content-hub.sql` | Parenting content library |
| `09-wearables.sql` | Wearable device integration |
| `10-voice-logs.sql` | Voice logging and cry detection |
| `11-subscriptions.sql` | Subscription add-ons |
| `12-community.sql` | Community forums and playdates |
| `13-reporting.sql` | Email reports and milestone announcements |

### Phase 4: Functions, Policies, Triggers
| File | Purpose |
|------|---------|
| `14-analytics-usage.sql` | App usage analytics and sync queue |
| `15-rls-policies.sql` | Row-Level Security policies for data access control |
| `16-triggers-functions.sql` | Database triggers and utility functions |
| `17-audit-logging.sql` | Audit logging for compliance and tracking |

### Phase 5: Additional Features
| File | Purpose |
|------|---------|
| `18-vaccine-appointments.sql` | Vaccination tracking |
| `19-expense-tracking.sql` | Expense logging |
| `20-activity-logging.sql` | Activity tracking |
| `21-benchmarking.sql` | Performance benchmarking |
| `22-parent-wellness.sql` | Parent health & wellness |
| `23-sleep-coaching.sql` | Sleep coaching programs |
| `24-nutrition-meals.sql` | Nutrition & meals tracking |
| `25-care-team-patient-assignment.sql` | Doctor/caregiver patient assignment invites + RLS |

## Deployment Instructions

### ⚠️ IMPORTANT: Doctor Profile MUST Run First!

Before running ANY other migrations, you MUST execute `00-doctor-profiles.sql` first!

### Step 1: Run Doctor Profile (REQUIRED)

```bash
# Using Supabase Console (RECOMMENDED)
1. Go to https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Click "New Query"
5. Copy entire contents of 00-doctor-profiles.sql
6. Paste into editor
7. Click "Run"
8. Wait for ✅ Success
```

### Step 2: Run Remaining Migrations in Order

```bash
# Continue with remaining files in order:
# 01-roles-and-permissions.sql
# 02-health-alerts.sql
# ... etc (see execution order above)
```

### Option 1: Run All via Supabase Console

```
1. Go to SQL Editor
2. For each file (in order):
   - Copy file contents
   - Paste into new query
   - Click "Run"
   - Wait for success
```

### Option 2: Use Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: Use psql

```bash
# Run each file in order:
psql -h your-host -U your-user -d your-db -f 00-doctor-profiles.sql
psql -h your-host -U your-user -d your-db -f 01-roles-and-permissions.sql
# ... continue for all files
```

## ✅ Verification

After running all migrations, verify success:

```sql
-- Check tables created
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
-- Should return: 50+

-- Verify doctor tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'doctor%' 
  AND table_schema = 'public'
ORDER BY table_name;
-- Should return:
-- doctor_profiles
-- doctor_baby_assignments
-- diagnoses
-- medications
-- appointment_reminders
-- medical_reports
-- medical_history_summary
-- consultation_notes
-- doctor_growth_assessment
-- medication_adherence
```

## 🐛 Troubleshooting

### Error: "Table 'doctor_profiles' does not exist"
```
❌ WRONG: You ran 01-roles-and-permissions.sql before 00-doctor-profiles.sql
✅ FIX: Run 00-doctor-profiles.sql FIRST, then continue
```

### Error: "Foreign key constraint violation"
```
❌ Migrations not in correct order
✅ FIX: Delete all tables, start over with 00-doctor-profiles.sql
```

### Success: All migrations completed
```
✅ All tables created
✅ All relationships set up
✅ Ready for API testing
```

The files should be executed in order (01 through 17) to ensure:
1. Roles and permissions are set up first
2. Core feature tables are created
3. RLS policies are applied
4. Triggers and functions are set up
5. Audit logging is configured

## Features Enabled

✅ Role-based access control (Admin, Manager, User, Caregiver, Viewer)  
✅ Health alerts and disease tracking  
✅ Photo management and collages  
✅ Doctor integration with reports  
✅ Family sharing with caregiver sessions  
✅ Advanced sleep and feeding analytics  
✅ Complete health records system  
✅ Parenting content library  
✅ Wearable device integration  
✅ Voice logging with cry detection  
✅ Subscription management  
✅ Community forums and playdates  
✅ Advanced reporting and analytics  
✅ Row-level security for data protection  
✅ Automatic audit logging  

## Testing

After running migrations, verify:

```sql
-- Check all tables created
SELECT table_name FROM information_schema.tables WHERE table_schema='public';

-- Check row-level security enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE schemaname='public';
```

## Rollback

To remove all migrations (careful!):

```sql
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS health_alerts CASCADE;
-- ... etc for all tables

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS audit_table_changes();
```

## Support

For issues or questions, refer to the main database documentation or contact the development team.
