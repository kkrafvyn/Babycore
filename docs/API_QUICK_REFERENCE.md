# 🔌 Cradlyn API Quick Reference

## Authentication
```bash
# All requests require:
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 👶 BABY MANAGEMENT

### Create Baby
```bash
POST /api/babies
{
  "name": "Emma",
  "dateOfBirth": "2024-01-15",
  "gender": "female",
  "weight": 3.5,
  "height": 50
}
```

### Get All Babies
```bash
GET /api/babies
```

### Get Baby Details
```bash
GET /api/babies/{babyId}
```

### Update Baby
```bash
PUT /api/babies/{babyId}
{
  "name": "Emma",
  "weight": 3.6
}
```

### Delete Baby
```bash
DELETE /api/babies/{babyId}
```

### Get Baby Summary
```bash
GET /api/babies/{babyId}/summary
```

---

## 🍼 FEEDING TRACKER

### Log Feeding
```bash
POST /api/feeding/log
{
  "babyId": "uuid",
  "type": "bottle|breast|solids",
  "duration": 20,
  "amount": 120,
  "notes": "Seemed hungry"
}
```

### Get Feeding Logs
```bash
GET /api/feeding/logs?babyId={babyId}&limit=20&offset=0
```

### Update Feeding
```bash
PUT /api/feeding/{feedingId}
{
  "duration": 25,
  "amount": 130
}
```

### Delete Feeding
```bash
DELETE /api/feeding/{feedingId}
```

---

## 😴 SLEEP TRACKER

### Log Sleep
```bash
POST /api/sleep/log
{
  "babyId": "uuid",
  "startTime": "2024-04-23T20:00:00Z",
  "endTime": "2024-04-24T06:30:00Z",
  "quality": 8,
  "notes": "Slept well"
}
```

### Get Sleep Logs
```bash
GET /api/sleep/logs?babyId={babyId}&limit=20&offset=0
```

---

## 🚽 DIAPER TRACKER

### Log Diaper Change
```bash
POST /api/diaper/log
{
  "babyId": "uuid",
  "type": "wet|poop|both",
  "notes": "Normal"
}
```

### Get Diaper Logs
```bash
GET /api/diaper/logs?babyId={babyId}&limit=20&offset=0
```

### Delete Diaper
```bash
DELETE /api/diaper/{diaperId}
```

---

## 🏥 HEALTH & MEDICAL

### Create Health Alert
```bash
POST /api/health/alerts
{
  "babyId": "uuid",
  "alertType": "fever|rash|cough",
  "severity": "low|medium|high",
  "description": "High fever 39.2°C",
  "actionRequired": true
}
```

### Get Health Alerts
```bash
GET /api/health/alerts?babyId={babyId}
```

### Record Vaccination
```bash
POST /api/vaccinations/record
{
  "babyId": "uuid",
  "vaccineName": "Pentavalent",
  "dateGiven": "2024-04-23",
  "nextDue": "2024-05-23",
  "notes": "No reactions"
}
```

### Get Vaccinations
```bash
GET /api/vaccinations/records?babyId={babyId}
```

---

## 📸 PHOTOS

### Upload Photo
```bash
POST /api/photos/upload
{
  "babyId": "uuid",
  "caption": "First smile!",
  "file": <binary>
}
```

### Get Photo Timeline
```bash
GET /api/photos/timeline?babyId={babyId}&limit=20&offset=0
```

### Delete Photo
```bash
DELETE /api/photos/{photoId}
```

---

## 🏥 APPOINTMENTS

### Create Appointment
```bash
POST /api/appointments/create
{
  "babyId": "uuid",
  "type": "checkup|vaccination|consultation",
  "doctorName": "Dr. Smith",
  "datetime": "2024-05-10T15:00:00Z",
  "location": "General Hospital",
  "notes": "6-month checkup"
}
```

### Get Appointments
```bash
GET /api/appointments?babyId={babyId}
```

### Update Appointment
```bash
PUT /api/appointments/{appointmentId}
{
  "datetime": "2024-05-11T15:00:00Z",
  "status": "scheduled"
}
```

### Cancel Appointment
```bash
DELETE /api/appointments/{appointmentId}
```

---

## 💰 EXPENSES

### Log Expense
```bash
POST /api/expenses/log
{
  "babyId": "uuid",
  "category": "formula|diapers|clothing|toys|medical",
  "amount": 45.99,
  "description": "Baby formula",
  "date": "2024-04-23"
}
```

### Get Expenses
```bash
GET /api/expenses/logs?babyId={babyId}&limit=20&offset=0
```

### Get Expense Analytics
```bash
GET /api/expenses/analytics?babyId={babyId}
```

---

## 👨‍👩‍👧 FAMILY SHARING

### Invite Family Member
```bash
POST /api/family/invite
{
  "email": "grandma@email.com",
  "role": "caregiver|viewer"
}
```

### Get Family Members
```bash
GET /api/family/members
```

### Accept Invitation
```bash
POST /api/family/accept-invite
{
  "token": "invitation-token"
}
```

---

## 📊 ANALYTICS

### Get Dashboard
```bash
GET /api/analytics/dashboard?babyId={babyId}
```

### Get Trends
```bash
GET /api/analytics/trends?babyId={babyId}&metric=feeding|sleep&daysBack=30
```

### Export Data
```bash
GET /api/analytics/export?babyId={babyId}&format=json|csv
```

---

## 🧠 AI INSIGHTS

### Analyze Sleep Patterns
```bash
POST /api/ml/analyze-sleep-patterns
{
  "babyId": "uuid",
  "daysBack": 30
}
```

### Predict Next Sleep
```bash
POST /api/ml/predict-next-sleep
{
  "babyId": "uuid"
}
```

### Predict Milestone
```bash
POST /api/ml/predict-milestone
{
  "babyId": "uuid",
  "milestone": "rolling|sitting|crawling|walking|talking"
}
```

### Analyze Growth
```bash
POST /api/ml/growth-analysis
{
  "babyId": "uuid"
}
```

---

## 🔔 NOTIFICATIONS

### Subscribe to Push
```bash
POST /api/notifications/subscribe
{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "auth": "...",
      "p256dh": "..."
    }
  }
}
```

### Send Notification
```bash
POST /api/notifications/send
{
  "userId": "uuid",
  "title": "Feeding Time",
  "body": "Time to feed Emma",
  "data": { "action": "feed" }
}
```

### Schedule Notification
```bash
POST /api/notifications/schedule
{
  "title": "Appointment Reminder",
  "body": "Emma's checkup is tomorrow",
  "scheduledFor": "2024-05-09T15:00:00Z"
}
```

### Schedule Reminders
```bash
POST /api/notifications/schedule-reminders
{
  "babyId": "uuid",
  "reminderType": "feeding|sleep|medication",
  "time": "09:00"
}
```

---

## 📧 EMAIL REPORTS

### Generate Weekly Digest
```bash
POST /api/email-reports/generate-weekly
{
  "babyId": "uuid"
}
```

### Send Milestone Email
```bash
POST /api/email-reports/send-milestone
{
  "babyId": "uuid",
  "milestone": "First smile",
  "details": "Date: 2024-04-23"
}
```

### Schedule Newsletter
```bash
POST /api/email-reports/schedule-newsletter
{
  "frequency": "weekly|monthly",
  "enabled": true
}
```

---

## 📋 DOCTOR REPORTS

### Generate PDF Report
```bash
POST /api/reports/generate
{
  "babyId": "uuid",
  "reportType": "medical|vaccination|growth",
  "includeData": ["vaccinations", "health", "allergies"]
}
```

### Get Shared Report (Public)
```bash
GET /api/reports/shared/{shareToken}
```

### Email Report
```bash
POST /api/reports/email
{
  "reportId": "uuid",
  "doctorEmail": "doctor@hospital.com"
}
```

---

## 🌍 COMMUNITY

### Get Forums
```bash
GET /api/community/forums?ageGroup=0-3|3-6|6-12
```

### Get Forum Posts
```bash
GET /api/community/forums/{forumId}/posts?limit=20&offset=0
```

### Create Post
```bash
POST /api/community/forums/{forumId}/posts
{
  "title": "How to handle teething?",
  "content": "My baby is 4 months...",
  "tags": ["teething", "baby-care"]
}
```

### Like Post
```bash
POST /api/community/posts/{postId}/like
```

### Reply to Post
```bash
POST /api/community/posts/{postId}/reply
{
  "content": "Great advice, thanks!"
}
```

---

## ⌚ WEARABLE DEVICES

### Connect Apple Health
```bash
POST /api/wearable/connect-apple-health
{
  "healthKitToken": "token"
}
```

### Connect Fitbit
```bash
POST /api/wearable/connect-fitbit
{
  "fitbitAccessToken": "token",
  "fitbitRefreshToken": "refresh-token"
}
```

### Sync Data
```bash
POST /api/wearable/sync
{
  "deviceType": "apple_health|fitbit|all"
}
```

### Get Wearable Data
```bash
GET /api/wearable/data?babyId={babyId}&deviceType=apple_health&dataType=heart_rate&startDate=2024-04-01&endDate=2024-04-30
```

---

## 🎤 VOICE TRANSCRIPTION

### Upload Voice Memo
```bash
POST /api/voice/upload
{
  "babyId": "uuid",
  "category": "general|cry",
  "file": <audio_file>
}
```

### Get Voice Logs
```bash
GET /api/voice/logs?babyId={babyId}&category=cry&limit=20
```

### Analyze Cry Pattern
```bash
POST /api/voice/analyze-cry
{
  "voiceLogId": "uuid"
}
```

### Get Cry Patterns
```bash
GET /api/voice/cry-patterns?babyId={babyId}&daysBack=30
```

---

## 🏥 HEALTH ALERTS

### Get Active Alerts
```bash
GET /api/health-alerts/active
```

### Sync External Alerts
```bash
POST /api/health-alerts/sync-external
```

### Dismiss Alert
```bash
POST /api/health-alerts/dismiss
{
  "alertId": "uuid"
}
```

---

## 👨‍💼 ADMIN OPERATIONS

### List Users
```bash
GET /api/admin/users?limit=50&offset=0
```

### Set User Role
```bash
POST /api/admin/users/{userId}/role
{
  "role": "admin|manager|user|caregiver|viewer",
  "reason": "Promoted to manager"
}
```

### Get Admin Stats
```bash
GET /api/admin/stats
```

### Get Logs
```bash
GET /api/admin/logs
GET /api/admin/audit-logs
```

---

## 📊 RESPONSE FORMAT

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 🔗 Common Query Parameters

| Parameter | Type | Example |
|-----------|------|---------|
| `limit` | number | 20 |
| `offset` | number | 0 |
| `babyId` | uuid | uuid-here |
| `startDate` | ISO date | 2024-04-01 |
| `endDate` | ISO date | 2024-04-30 |
| `sortBy` | string | created_at |
| `order` | string | asc\|desc |

---

## 📱 Rate Limits

- Free tier: 100 requests/hour
- Premium tier: 1000 requests/hour
- Enterprise: Unlimited

---

**Last Updated:** April 23, 2026
**Version:** 1.0.0
