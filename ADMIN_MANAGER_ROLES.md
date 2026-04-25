# Admin & Manager Roles Documentation

## Overview

BabyLog now includes a comprehensive role-based access control (RBAC) system with 5 roles:
- **Admin** - Full system access
- **Manager** - Content moderation and analytics
- **User** - Regular app user
- **Caregiver** - Limited access to specific babies
- **Viewer** - Read-only access

---

## Role Hierarchy & Permissions

### Admin
**Permissions:**
- ✅ Manage all users
- ✅ Assign/change roles
- ✅ View analytics
- ✅ Delete data
- ✅ Access payments
- ✅ Access reports
- ✅ Moderate content

**Endpoints:**
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/:userId/role` - Change user role
- `POST /api/admin/users/:userId/promote` - Promote to manager/admin
- `POST /api/admin/users/:userId/demote` - Demote to user
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/stats` - Role statistics
- `GET /api/admin/logs` - Admin action logs
- `GET /api/admin/audit-logs` - Role assignment audit trail

### Manager
**Permissions:**
- ❌ Manage users
- ❌ Assign roles
- ✅ View analytics
- ❌ Delete data
- ✅ Access payments
- ✅ Access reports
- ✅ Moderate content

**Endpoints:**
- `GET /api/manager/dashboard` - Manager dashboard
- `GET /api/manager/reports` - List reports
- `POST /api/manager/reports` - Create report
- `DELETE /api/manager/reports/:reportId` - Delete report
- `GET /api/manager/activity-logs` - View activity logs
- `POST /api/manager/moderate-content/:postId` - Moderate posts
- `GET /api/manager/permissions` - Check permissions

### User
**Permissions:**
- ❌ Manage users
- ❌ Assign roles
- ❌ View analytics
- ❌ Delete data (only own)
- ✅ Access payments
- ✅ Access reports
- ❌ Moderate content

### Caregiver
**Permissions:**
- ❌ Manage users
- ❌ Assign roles
- ❌ View analytics
- ❌ Delete data
- ❌ Access payments
- ✅ Access reports (assigned babies)
- ❌ Moderate content

### Viewer
**Permissions:**
- ❌ Manage users
- ❌ Assign roles
- ❌ View analytics
- ❌ Delete data
- ❌ Access payments
- ✅ Access reports (read-only)
- ❌ Moderate content

---

## Database Schema

### user_roles Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('admin', 'manager', 'user', 'caregiver', 'viewer')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### role_assignment_logs Table
Tracks all role changes for audit purposes:
```sql
CREATE TABLE role_assignment_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  previous_role TEXT,
  new_role TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP
);
```

### admin_actions_log Table
Tracks all admin actions:
```sql
CREATE TABLE admin_actions_log (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP
);
```

### manager_reports Table
Stores reports created by managers:
```sql
CREATE TABLE manager_reports (
  id UUID PRIMARY KEY,
  manager_id UUID REFERENCES auth.users(id),
  report_type TEXT,
  title TEXT,
  description TEXT,
  metrics JSONB,
  generated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

---

## API Usage Examples

### Admin: List All Users
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-1",
        "user_id": "uuid-user-1",
        "role": "manager",
        "assigned_at": "2026-04-22T10:00:00Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### Admin: Change User Role
```bash
curl -X POST http://localhost:3000/api/admin/users/user-uuid/role \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "manager",
    "reason": "Promoted for content moderation"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "previousRole": "user",
  "newRole": "manager"
}
```

### Admin: Promote User
```bash
curl -X POST http://localhost:3000/api/admin/users/user-uuid/promote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newRole": "manager",
    "reason": "Excellent performance"
  }'
```

### Admin: Get Role Statistics
```bash
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "admin": 1,
    "manager": 3,
    "user": 150,
    "caregiver": 10,
    "viewer": 5
  }
}
```

### Admin: Get Admin Action Logs
```bash
curl -X GET http://localhost:3000/api/admin/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Manager: Get Dashboard
```bash
curl -X GET http://localhost:3000/api/manager/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roleStatistics": {
      "admin": 1,
      "manager": 3,
      "user": 150,
      "caregiver": 10,
      "viewer": 5
    },
    "recentActivity": [
      {
        "id": "uuid",
        "admin_id": "admin-uuid",
        "action": "role_changed",
        "target_user_id": "user-uuid",
        "details": {...},
        "created_at": "2026-04-22T10:00:00Z"
      }
    ]
  }
}
```

### Manager: Create Report
```bash
curl -X POST http://localhost:3000/api/manager/reports \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "weekly",
    "title": "Weekly Activity Report",
    "description": "Summary of user activity",
    "metrics": {
      "activeUsers": 150,
      "newSignups": 25,
      "contentModerated": 5
    }
  }'
```

### Manager: Moderate Content
```bash
curl -X POST http://localhost:3000/api/manager/moderate-content/post-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "hide",
    "reason": "Inappropriate content"
  }'
```

**Valid Actions:**
- `flag` - Flag post for review
- `hide` - Hide from public view
- `delete` - Permanently delete
- `restore` - Restore hidden/deleted post

---

## Security Features

### Row-Level Security (RLS)
All role-related tables have RLS policies:
- Users can only view their own role
- Admins can manage all roles
- Managers can view activity logs
- All actions are logged

### Audit Logging
Every role change is logged with:
- Who made the change
- Previous and new role
- Timestamp
- Reason (optional)

### Action Logging
All admin actions are tracked:
- User management
- Role assignments
- Content moderation
- System changes

---

## Backend Implementation Files

### New Files Created
1. **src/api/utils/role-manager.ts**
   - Role permission matrix
   - Role assignment functions
   - Permission checking utilities

2. **src/api/routes/admin.ts**
   - Admin-only endpoints
   - User management
   - Audit log access
   - Statistics

3. **src/api/routes/manager.ts**
   - Manager endpoints
   - Dashboard
   - Report management
   - Content moderation

### Updated Files
1. **DATABASE_MIGRATIONS.sql**
   - Added user_roles table
   - Added role_assignment_logs table
   - Added admin_actions_log table
   - Added manager_reports table
   - Added RLS policies
   - Added indexes for performance

2. **src/api/server.ts**
   - Mounted admin routes
   - Mounted manager routes

3. **src/api/middleware/auth.ts**
   - Already supports role-based access

---

## Implementation Checklist

- ✅ Created role-manager utility
- ✅ Created admin routes
- ✅ Created manager routes
- ✅ Updated database schema
- ✅ Added RLS policies
- ✅ Added audit logging
- ✅ Integrated into server.ts
- ⏳ Test all endpoints
- ⏳ Deploy database migrations
- ⏳ Create admin user on first launch

---

## First Admin Setup

When deploying, create the first admin:

```sql
-- Insert first admin user role
INSERT INTO user_roles (user_id, role, created_at)
VALUES ('your-admin-user-id', 'admin', NOW());
```

Then test:
```bash
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Troubleshooting

### "Insufficient permissions" Error
- Check user's role: `GET /api/admin/users`
- Verify user role in database

### Role not updating
- Check RLS policies are enabled
- Verify user has admin role
- Check database migrations ran

### Can't access manager endpoints
- Ensure user role is 'manager'
- Check token is valid
- Verify permissions in role-manager.ts

---

## Future Enhancements

- [ ] Role-based API rate limiting
- [ ] Granular permission system
- [ ] Role templates
- [ ] Time-based role assignments
- [ ] Role approval workflows
- [ ] Manager sub-roles (content, payments, analytics)
- [ ] Team assignments for managers
