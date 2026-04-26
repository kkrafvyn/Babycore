# Database SQL Order

Run files in this order to avoid missing-table or missing-column errors.

## 0) Optional Hard Reset (Destructive)

If you want to fully restart from scratch:

1. Run [`00-reset-public-schema.sql`](./00-reset-public-schema.sql)
2. Then continue with the steps below

## 1) Core Base Schema (Required On Fresh DB)

Run [`../../DATABASE_SCHEMA.sql`](../../DATABASE_SCHEMA.sql) first.

This creates core tables like `public.babies`, which later migrations depend on.

## 2) Feature Migrations (`database/sql`)

Run in this exact order:

1. `00-doctor-profiles.sql`
2. `01-roles-and-permissions.sql`
3. `02-health-alerts.sql`
4. `03-photo-management.sql`
5. `04-doctor-integration.sql`
6. `05-family-sharing.sql`
7. `06-analytics.sql`
8. `07-health-records.sql`
9. `08-content-hub.sql`
10. `09-wearables.sql`
11. `10-voice-logs.sql`
12. `11-subscriptions.sql`
13. `12-community.sql`
14. `13-reporting.sql`
15. `14-analytics-usage.sql`
16. `15-rls-policies.sql`
17. `16-triggers-functions.sql`
18. `17-audit-logging.sql`
19. `18-vaccine-appointments.sql`
20. `19-expense-tracking.sql`
21. `20-activity-logging.sql`
22. `21-benchmarking.sql`
23. `22-parent-wellness.sql`
24. `23-sleep-coaching.sql`
25. `24-nutrition-meals.sql`
26. `25-care-team-patient-assignment.sql`
27. `26-sharing-link-and-directory-fields.sql`
28. `27-storage-buckets-and-policies.sql`
29. `28-notifications-infrastructure.sql`

## Common Errors

- `column "status" does not exist`
  - Cause: old table shape from previous schema version.
  - Fix: run the reset script, then re-run in order above.

- `relation "public.babies" does not exist`
  - Cause: `DATABASE_SCHEMA.sql` was skipped.
  - Fix: run `DATABASE_SCHEMA.sql` before `00-doctor-profiles.sql`.
