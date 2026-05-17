# Database SQL Order

The canonical schema sources live in:

1. [`../../DATABASE_SCHEMA.sql`](../../DATABASE_SCHEMA.sql)
2. [`../../database/sql`](../../database/sql)

The Supabase CLI migration track in `supabase/migrations` is generated from those files. Run `npm run db:sync-migrations` whenever the source SQL changes. `npm run db:migrate` now syncs the generated migrations before pushing them.

For linked-project migration commands, export `SUPABASE_DB_PASSWORD` first. This repo routes linked CLI calls through the pooler `--db-url` path with `npm run supabase:linked -- ...`, because that path is currently more reliable than the default linked-password flow on this project.

## 0) Optional Hard Reset (Destructive)

If you want to fully restart from scratch:

1. Run [`../../database/sql/00-reset-public-schema.sql`](../../database/sql/00-reset-public-schema.sql)
2. Then continue with the ordered schema below

## 1) Ordered Schema Sources

Apply the following files in order on a fresh database:

1. `DATABASE_SCHEMA.sql`
2. `database/sql/00-doctor-profiles.sql`
3. `database/sql/01-roles-and-permissions.sql`
4. `database/sql/02-health-alerts.sql`
5. `database/sql/03-photo-management.sql`
6. `database/sql/04-doctor-integration.sql`
7. `database/sql/05-family-sharing.sql`
8. `database/sql/06-analytics.sql`
9. `database/sql/07-health-records.sql`
10. `database/sql/08-content-hub.sql`
11. `database/sql/09-wearables.sql`
12. `database/sql/10-voice-logs.sql`
13. `database/sql/11-subscriptions.sql`
14. `database/sql/12-community.sql`
15. `database/sql/13-reporting.sql`
16. `database/sql/14-analytics-usage.sql`
17. `database/sql/15-rls-policies.sql`
18. `database/sql/16-triggers-functions.sql`
19. `database/sql/17-audit-logging.sql`
20. `database/sql/18-vaccine-appointments.sql`
21. `database/sql/19-expense-tracking.sql`
22. `database/sql/20-activity-logging.sql`
23. `database/sql/21-benchmarking.sql`
24. `database/sql/22-parent-wellness.sql`
25. `database/sql/23-sleep-coaching.sql`
26. `database/sql/24-nutrition-meals.sql`
27. `database/sql/25-care-team-patient-assignment.sql`
28. `database/sql/26-sharing-link-and-directory-fields.sql`
29. `database/sql/27-storage-buckets-and-policies.sql`
30. `database/sql/28-notifications-infrastructure.sql`
31. `database/sql/29-core-compatibility-and-shared-access.sql`
32. `database/sql/30-care-team-chat.sql`
33. `database/sql/31-care-advanced-features.sql`
34. `database/sql/32-emergency-links-and-billing-events.sql`
35. `database/sql/33-health-logs-and-user-settings.sql`
36. `database/sql/34-table-grants-for-health-logs-and-user-settings.sql`
37. `database/sql/35-core-client-table-grants.sql`
38. `database/sql/36-babies-owner-policies-and-user-roles-access.sql`
39. `database/sql/36-user-settings-care-workspace-data.sql`
40. `database/sql/37-activity-logs-access.sql`
41. `database/sql/37-user-settings-care-profile-preferences.sql`
42. `database/sql/38-shared-care-workspaces.sql`
43. `database/sql/38-wearables-client-access.sql`
44. `database/sql/39-health-connect-wearable-type.sql`
45. `database/sql/39-user-roles-doctor-support.sql`
46. `database/sql/40-caregiver-shift-notes.sql`

## Common Errors

- `column "status" does not exist`
  Cause: old table shape from a previous schema version.
  Fix: run the reset script, then rerun the ordered schema or `npm run db:migrate`.

- `relation "public.babies" does not exist`
  Cause: `DATABASE_SCHEMA.sql` was skipped.
  Fix: start with `DATABASE_SCHEMA.sql` before any numbered `database/sql` file.
