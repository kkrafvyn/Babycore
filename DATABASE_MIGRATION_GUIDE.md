# Database Migration & Setup Guide

## Step 1: Prepare Supabase Project

### 1a. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Fill in project name, database password, region
5. Wait for project initialization (5-10 minutes)

### 1b. Get Connection Details
1. In Supabase dashboard, go to **Settings** > **API**
2. Copy `Project URL` and `anon public` key
3. Add to `.env.local`:
```
VITE_SUPABASE_URL=<your_project_url>
VITE_SUPABASE_ANON_KEY=<your_anon_key>
```

---

## Step 2: Execute Database Migrations

### Option A: Using Supabase SQL Editor (Easiest for Testing)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `DATABASE_MIGRATIONS.sql`
4. Paste into SQL editor
5. Click **Run** button
6. Wait for all migrations to complete
7. Check for any errors

### Option B: Using Supabase CLI (Recommended for Production)

```powershell
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Verify migrations
supabase db list
```

### Option C: Using PostgreSQL Client

```powershell
# Install PostgreSQL client (psql)
# On Windows: download from https://www.postgresql.org/download/windows/

# Get connection string from Supabase Settings > Database
# Format: postgresql://[user]:[password]@[host]:[port]/postgres

# Connect and run migrations
psql "your_connection_string" -f DATABASE_MIGRATIONS.sql
```

---

## Step 3: Verify Migrations

After running migrations, verify all tables were created:

### Using Supabase Dashboard:
1. Go to **Table Editor**
2. You should see all these tables:
   - babies (existing)
   - health_alerts
   - user_health_preferences
   - baby_photos
   - doctor_reports
   - family_sharing_invites
   - caregiver_sessions
   - sharing_activity_log
   - sleep_analytics
   - feeding_analytics
   - health_records
   - allergies
   - medications
   - voice_logs
   - voice_recognition_results
   - wearable_integrations
   - wearable_data
   - content_library
   - community_forums
   - community_posts
   - playdate_events
   - email_reports
   - milestone_announcements
   - subscription_addons
   - user_addon_subscriptions
   - And more...

### Using SQL Query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

## Step 4: Set Up Row-Level Security (RLS)

RLS policies are included in DATABASE_MIGRATIONS.sql. Verify they're enabled:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable RLS on tables (if needed)
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE baby_photos ENABLE ROW LEVEL SECURITY;
-- ... etc for other tables
```

---

## Step 5: Create Storage Buckets

Supabase Storage buckets for file uploads:

```sql
-- These can be created via Supabase dashboard:
-- 1. Go to Storage
-- 2. Create new bucket for each:
--    - health-records (private)
--    - baby-photos (private)
--    - doctor-reports (private)
--    - allergy-photos (private)
--    - voice-memos (private)
--    - voice-transcripts (private)

-- Or use Supabase CLI:
-- supabase storage create health-records --private
-- supabase storage create baby-photos --private
```

---

## Step 6: Set Up Realtime Subscriptions

Enable realtime for important tables:

In Supabase dashboard > **Realtime** > **Add Subscription**:
- Enable for: health_alerts, baby_photos, community_posts, sleep_analytics, feeding_analytics
- This allows live updates across devices

---

## Step 7: Test Database Connection

Create a test script to verify everything works:

```typescript
// test-db-connection.ts
import { supabase } from './src/lib/supabase';

async function testConnection() {
  try {
    // Test 1: Query existing table
    const { data: babies, error: e1 } = await supabase
      .from('babies')
      .select('*')
      .limit(1);
    
    if (e1) throw e1;
    console.log('✅ Babies table query: OK');

    // Test 2: Query new tables
    const tables = [
      'health_alerts',
      'baby_photos',
      'doctor_reports',
      'family_sharing_invites',
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) throw error;
      console.log(`✅ ${table}: OK`);
    }

    console.log('\n✅ All database migrations verified!');
  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
}

testConnection();
```

Run with:
```powershell
npx ts-node test-db-connection.ts
```

---

## Troubleshooting

### "Authentication required" error
- Check that Supabase keys are correct in `.env.local`
- Verify CORS settings in Supabase dashboard

### "Permission denied" error
- Check RLS policies are correctly set
- Verify user has appropriate role/permissions
- Check Supabase auth status

### Migration fails on specific table
- Check for duplicate foreign keys
- Verify column names don't conflict with reserved keywords
- Run individual table creation in SQL editor to isolate issue

### Tables not appearing
- Refresh Supabase dashboard (F5)
- Check `public` schema specifically
- Run verification query above to confirm creation

---

## Migration Rollback (if needed)

If you need to revert migrations:

```sql
-- Drop all created tables
DROP TABLE IF EXISTS user_addon_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_addons CASCADE;
DROP TABLE IF EXISTS milestone_announcements CASCADE;
DROP TABLE IF EXISTS email_reports CASCADE;
-- ... continue for all tables

-- Or use Supabase CLI:
supabase db reset
```

---

## Next Steps

After successful migration:
1. ✅ Configure backend API endpoints (see BACKEND_API_SETUP.md)
2. ✅ Set up authentication rules
3. ✅ Configure external API integrations
4. ✅ Deploy to production

**Estimated time for full setup: 30 minutes**
