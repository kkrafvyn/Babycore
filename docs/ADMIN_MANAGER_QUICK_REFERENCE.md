# Admin & Manager Quick Reference

## 📋 Common Admin Tasks

### List All Users
```bash
curl -X GET http://localhost:3000/api/admin/users?limit=50&offset=0 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Get User Statistics
```bash
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
Response shows count of admins, managers, users, caregivers, viewers.

### Change User Role
```bash
curl -X POST http://localhost:3000/api/admin/users/[USER_ID]/role \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "manager",
    "reason": "Promotion for exemplary moderation"
  }'
```

**Valid Roles:**
- `admin` - Full system access
- `manager` - Content & analytics
- `user` - Regular user
- `caregiver` - Limited access
- `viewer` - Read-only

### Promote to Manager
```bash
curl -X POST http://localhost:3000/api/admin/users/[USER_ID]/promote \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newRole": "manager", "reason": "Team expansion"}'
```

### Promote to Admin
```bash
curl -X POST http://localhost:3000/api/admin/users/[USER_ID]/promote \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newRole": "admin", "reason": "System administrator"}'
```

### Demote User
```bash
curl -X POST http://localhost:3000/api/admin/users/[USER_ID]/demote \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Conduct violation"}'
```

### Delete User
```bash
curl -X DELETE http://localhost:3000/api/admin/users/[USER_ID] \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
**Note:** Cannot delete your own account.

### View Admin Action Logs
```bash
curl -X GET http://localhost:3000/api/admin/logs?limit=50&offset=0 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### View Role Assignment Audit Trail
```bash
curl -X GET http://localhost:3000/api/admin/audit-logs?limit=50&offset=0 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📊 Common Manager Tasks

### Access Manager Dashboard
```bash
curl -X GET http://localhost:3000/api/manager/dashboard \
  -H "Authorization: Bearer MANAGER_TOKEN"
```
Shows: Role statistics, recent activity, system overview.

### Create Report
```bash
curl -X POST http://localhost:3000/api/manager/reports \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "weekly",
    "title": "Weekly Moderation Report",
    "description": "Content moderation and user activity summary",
    "metrics": {
      "postsModerated": 15,
      "flaggedContent": 3,
      "userComplaints": 2
    }
  }'
```

**Report Types:**
- `daily` - Daily report
- `weekly` - Weekly summary
- `monthly` - Monthly summary
- `custom` - Custom report

### List Reports
```bash
curl -X GET http://localhost:3000/api/manager/reports?limit=20&offset=0 \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

### Delete Report
```bash
curl -X DELETE http://localhost:3000/api/manager/reports/[REPORT_ID] \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

### View Activity Logs
```bash
curl -X GET http://localhost:3000/api/manager/activity-logs?limit=50&offset=0 \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

### Filter Activity by Action
```bash
curl -X GET http://localhost:3000/api/manager/activity-logs?action=role_changed \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

### Moderate Content
```bash
curl -X POST http://localhost:3000/api/manager/moderate-content/[POST_ID] \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "hide",
    "reason": "Violates community guidelines"
  }'
```

**Moderation Actions:**
- `flag` - Flag for further review
- `hide` - Hide from public view
- `delete` - Permanently delete
- `restore` - Restore hidden/deleted content

### Check Permissions
```bash
curl -X GET http://localhost:3000/api/manager/permissions \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

---

## 🔐 Database SQL Commands

### Add First Admin (SQL)
```sql
INSERT INTO user_roles (user_id, role, created_at)
VALUES ('your-admin-user-uuid', 'admin', NOW());
```

### Add Manager (SQL)
```sql
INSERT INTO user_roles (user_id, role, assigned_by, created_at)
VALUES (
  'new-manager-uuid',
  'manager',
  'admin-uuid',
  NOW()
);
```

### View All Users with Roles (SQL)
```sql
SELECT user_id, role, assigned_at, updated_at
FROM user_roles
ORDER BY role, assigned_at DESC;
```

### View Role Assignment History (SQL)
```sql
SELECT user_id, previous_role, new_role, assigned_by, reason, created_at
FROM role_assignment_logs
ORDER BY created_at DESC
LIMIT 50;
```

### View Admin Actions (SQL)
```sql
SELECT admin_id, action, target_user_id, details, created_at
FROM admin_actions_log
ORDER BY created_at DESC
LIMIT 50;
```

### Check Role Change Statistics (SQL)
```sql
SELECT 
  new_role,
  COUNT(*) as changes,
  COUNT(DISTINCT user_id) as users_affected
FROM role_assignment_logs
GROUP BY new_role;
```

### Get All Manager Reports (SQL)
```sql
SELECT manager_id, report_type, title, metrics, created_at
FROM manager_reports
ORDER BY created_at DESC;
```

---

## 🚨 Common Issues & Solutions

### "Insufficient permissions" Error
**Problem:** Non-admin trying to access admin endpoints  
**Solution:** Ensure user role is 'admin' or 'manager'
```bash
# Check user role
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer TOKEN"

# If denied, user isn't admin
```

### Cannot Delete Own Account
**Problem:** Admin trying to delete self  
**Solution:** Have another admin delete you, or just demote to user
```bash
# This will fail:
curl -X DELETE http://localhost:3000/api/admin/users/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Role Not Updating
**Problem:** Role assignment doesn't take effect  
**Solution:** Check database migration ran successfully
```sql
-- Verify table exists
SELECT * FROM user_roles LIMIT 1;

-- Check RLS is enabled
SELECT row_security_active('user_roles');
```

### Manager Cannot Access Moderation
**Problem:** Manager sees "permission denied" on moderate-content  
**Solution:** Ensure user is actually assigned manager role
```sql
SELECT * FROM user_roles WHERE user_id = 'manager-uuid';
```

---

## 📈 Monitoring & Reporting

### Monitor Admin Actions
```bash
# Get last 10 admin actions
curl -X GET http://localhost:3000/api/admin/logs?limit=10 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Monitor Manager Reports
```bash
# List manager reports
curl -X GET http://localhost:3000/api/manager/reports \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

### Track Role Changes
```bash
# View role change audit trail
curl -X GET http://localhost:3000/api/admin/audit-logs \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Monitor Moderation Activity
```bash
# View content moderation actions
curl -X GET http://localhost:3000/api/manager/activity-logs?action=content_moderated \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

---

## 📋 Role Responsibilities

### Admin Responsibilities
- User account management
- Role assignments & promotions
- System oversight
- Emergency escalations
- Compliance & audit

### Manager Responsibilities
- Community moderation
- Content oversight
- Report generation
- Activity monitoring
- User support

---

## 🔄 Workflow Example

1. **Admin promotes user to Manager**
   ```bash
   curl -X POST /api/admin/users/john-uuid/promote \
     -d '{"newRole": "manager"}'
   ```

2. **Action logged in admin_actions_log**
   ```
   admin_id: admin-uuid
   action: role_changed
   target_user_id: john-uuid
   details: {previousRole: user, newRole: manager}
   ```

3. **New manager accesses dashboard**
   ```bash
   curl -X GET /api/manager/dashboard
   ```

4. **Manager moderates content**
   ```bash
   curl -X POST /api/manager/moderate-content/post-123 \
     -d '{"action": "hide", "reason": "Inappropriate"}'
   ```

5. **Action tracked in admin_actions_log**
   ```
   admin_id: john-uuid
   action: content_moderated
   details: {postId: 123, action: hide}
   ```

6. **Manager creates report**
   ```bash
   curl -X POST /api/manager/reports \
     -d '{"reportType": "weekly", "metrics": {...}}'
   ```

---

## 📞 Support

For issues:
1. Check `ADMIN_MANAGER_ROLES.md` for detailed docs
2. Review role permissions matrix
3. Check database RLS policies
4. View audit logs for what happened
5. Check server logs for errors

---

**Quick Links:**
- Full Documentation: ADMIN_MANAGER_ROLES.md
- Implementation Details: ADMIN_MANAGER_IMPLEMENTATION.md
- Role Matrix: See ADMIN_MANAGER_ROLES.md
- Database Schema: DATABASE_MIGRATIONS.sql
