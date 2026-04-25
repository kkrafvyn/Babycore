# Complete API Documentation

**Base URL**: `http://localhost:3000/api` (development)  
**Authentication**: Bearer token in Authorization header  
**Content-Type**: `application/json`

---

## 📋 Table of Contents

1. [Health Alerts API](#health-alerts-api)
2. [Doctor Reports API](#doctor-reports-api)
3. [ML/AI Insights API](#mlai-insights-api)
4. [Notifications API](#notifications-api)
5. [Payments API](#payments-api)
6. [Community API](#community-api)
7. [Email Reports API](#email-reports-api)
8. [Wearable API](#wearable-api)
9. [Voice & Transcription API](#voice--transcription-api)
10. [Error Handling](#error-handling)

---

## Health Alerts API

### GET /api/health-alerts/active

Get active health alerts for user's region.

**Authentication**: Required  
**Response**: `200 OK`

```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert-123",
      "type": "outbreak",
      "disease": "Measles",
      "region": "Lagos, Nigeria",
      "severity": "high",
      "description": "Measles outbreak reported",
      "affectedAgeGroup": "0-5 years",
      "createdAt": "2026-04-22T10:00:00Z"
    }
  ]
}
```

### POST /api/health-alerts/sync-external

Sync alerts from WHO/CDC (cron job).

**Authentication**: Required  
**Request Body**: None  
**Response**: `200 OK`

```json
{
  "success": true,
  "synced": 15,
  "message": "Synced 15 new alerts"
}
```

### POST /api/health-alerts/dismiss

Dismiss a health alert.

**Authentication**: Required  
**Request Body**:

```json
{
  "alertId": "alert-123"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Alert dismissed"
}
```

---

## Doctor Reports API

### POST /api/reports/generate

Generate PDF doctor report with QR code.

**Authentication**: Required  
**Request Body**:

```json
{
  "babyId": "baby-123",
  "reportType": "pediatrician",
  "includeData": ["vaccinations", "allergies", "medications"],
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-04-22"
  }
}
```

**Response**: `201 Created`

```json
{
  "success": true,
  "report": {
    "id": "report-456",
    "babyId": "baby-123",
    "pdfUrl": "https://storage.example.com/reports/report-456.pdf",
    "shareToken": "share_token_xyz",
    "shareUrl": "https://babylog.app/reports/share_token_xyz",
    "qrCode": "data:image/png;base64,..."
  },
  "message": "Report generated successfully"
}
```

### GET /api/reports/shared/:token

Get shared report (public, no auth needed).

**Authentication**: None required  
**Response**: `200 OK`

```json
{
  "success": true,
  "report": {
    "babyName": "Emma",
    "dateGenerated": "2026-04-22",
    "data": {
      "vaccinations": [...],
      "allergies": [...],
      "medications": [...]
    }
  }
}
```

### POST /api/reports/email

Email report to pediatrician.

**Authentication**: Required  
**Request Body**:

```json
{
  "reportId": "report-456",
  "doctorEmail": "dr.smith@example.com",
  "message": "Please review my baby's report"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Report sent to doctor"
}
```

---

## ML/AI Insights API

### POST /api/ml/analyze-sleep-patterns

Analyze baby's sleep patterns.

**Authentication**: Required  
**Request Body**:

```json
{
  "babyId": "baby-123",
  "daysBack": 30
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "analysis": {
    "averageSleepPerDay": 15.5,
    "sleepQuality": 7.8,
    "regressions": [
      {
        "date": "2026-04-15",
        "severity": "high",
        "explanation": "Significant decrease in sleep"
      }
    ],
    "trends": "improving",
    "recommendations": [
      "Maintain consistent bedtime routine",
      "Try white noise for better sleep"
    ]
  },
  "period": "Last 30 days",
  "dataPoints": 30
}
```

### POST /api/ml/predict-next-sleep

Predict when baby will sleep next.

**Authentication**: Required  
**Request Body**:

```json
{
  "babyId": "baby-123"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "prediction": {
    "timeUntilSleep": 120,
    "predictedTime": "2026-04-22T15:00:00Z",
    "confidence": 0.82
  }
}
```

### POST /api/ml/predict-milestone

Predict when baby will reach milestone.

**Authentication**: Required  
**Request Body**:

```json
{
  "babyId": "baby-123",
  "milestone": "walking"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "prediction": {
    "milestone": "walking",
    "averagePredictedAge": 12,
    "earlyRange": 8,
    "lateRange": 18,
    "monthsUntil": 4,
    "confidence": 0.75
  }
}
```

### POST /api/ml/growth-analysis

Analyze baby's growth trajectory.

**Authentication**: Required  
**Request Body**:

```json
{
  "babyId": "baby-123"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "analysis": {
    "currentPercentile": {
      "weight": 45,
      "height": 50,
      "headCircumference": 55
    },
    "growthRate": "normal",
    "trend": "increasing",
    "concerns": []
  }
}
```

---

## Notifications API

### POST /api/notifications/subscribe

Subscribe to push notifications.

**Authentication**: Required  
**Request Body**:

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "auth": "auth_key",
      "p256dh": "p256dh_key"
    }
  }
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Subscribed to notifications"
}
```

### POST /api/notifications/send

Send push notification.

**Authentication**: None (internal)  
**Request Body**:

```json
{
  "userId": "user-123",
  "title": "Feeding Reminder",
  "body": "Time to feed your baby",
  "data": {
    "type": "feeding_reminder"
  },
  "tag": "feeding"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "message": "Sent notification to 2 devices"
}
```

### POST /api/notifications/schedule

Schedule notification for later.

**Authentication**: Required  
**Request Body**:

```json
{
  "title": "Feeding Reminder",
  "body": "Don't forget to feed your baby",
  "scheduledFor": "2026-04-22T14:00:00Z",
  "data": {"type": "feeding"}
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Notification scheduled"
}
```

### POST /api/notifications/health-alert

Send health alert notification.

**Authentication**: Required  
**Request Body**:

```json
{
  "userId": "user-123",
  "alertType": "outbreak",
  "disease": "Measles",
  "region": "Lagos"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "sent": 1,
  "message": "Health alert sent"
}
```

---

## Payments API

### POST /api/payments/process-addon

Process payment for premium add-on.

**Authentication**: Required  
**Request Body**:

```json
{
  "addonId": "addon-123",
  "paymentMethod": "paystack",
  "amount": 4999
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "subscription": {
    "id": "sub-456",
    "userId": "user-123",
    "addonId": "addon-123",
    "status": "active",
    "renewalDate": "2026-05-22T00:00:00Z"
  },
  "message": "Successfully subscribed to Premium Analytics"
}
```

### POST /api/payments/cancel-subscription

Cancel addon subscription.

**Authentication**: Required  
**Request Body**:

```json
{
  "subscriptionId": "sub-456"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "subscription": {
    "id": "sub-456",
    "status": "cancelled",
    "cancelledAt": "2026-04-22T10:30:00Z"
  },
  "message": "Subscription cancelled"
}
```

### POST /webhooks/paystack (No Auth)

Paystack webhook endpoint.

**Request Body**: Paystack event payload  
**Response**: `200 OK`

### POST /webhooks/flutterwave (No Auth)

Flutterwave webhook endpoint.

**Request Body**: Flutterwave event payload  
**Response**: `200 OK`

---

## Community API

### GET /api/community/forums

Get community forums by age group.

**Authentication**: Required  
**Query Parameters**:
- `ageGroup` (optional): Filter by age group

**Response**: `200 OK`

```json
{
  "success": true,
  "forums": [
    {
      "id": "forum-123",
      "name": "0-3 Months",
      "description": "Discussions for newborns",
      "memberCount": 1250
    }
  ]
}
```

### POST /api/community/forums/:forumId/posts

Create forum post.

**Authentication**: Required  
**Request Body**:

```json
{
  "title": "Sleeping through the night",
  "content": "My baby started sleeping through the night...",
  "tags": ["sleep", "milestone"]
}
```

**Response**: `201 Created`

```json
{
  "success": true,
  "post": {
    "id": "post-789",
    "title": "Sleeping through the night",
    "author": {"username": "john_doe"},
    "createdAt": "2026-04-22T10:00:00Z",
    "likes": 0
  },
  "message": "Post created successfully"
}
```

### POST /api/community/posts/:postId/like

Like a forum post.

**Authentication**: Required  
**Response**: `200 OK`

```json
{
  "success": true,
  "liked": true
}
```

### POST /api/community/playdates

Create playdate event.

**Authentication**: Required  
**Request Body**:

```json
{
  "title": "Park Playdate",
  "description": "Meet at Central Park",
  "location": "Central Park, Lagos",
  "datetime": "2026-04-29T10:00:00Z",
  "babyAge": "6-12 months",
  "maxAttendees": 10
}
```

**Response**: `201 Created`

```json
{
  "success": true,
  "event": {
    "id": "playdate-123",
    "title": "Park Playdate",
    "datetime": "2026-04-29T10:00:00Z",
    "currentAttendees": 1
  },
  "message": "Playdate created successfully"
}
```

### GET /api/community/playdates/nearby

Get nearby playdates.

**Authentication**: Required  
**Query Parameters**:
- `latitude` (required): User latitude
- `longitude` (required): User longitude
- `radiusKm` (optional): Search radius in kilometers (default: 10)

**Response**: `200 OK`

```json
{
  "success": true,
  "playdates": [
    {
      "id": "playdate-123",
      "title": "Park Playdate",
      "location": "Central Park",
      "distance": 2.5,
      "datetime": "2026-04-29T10:00:00Z",
      "attendees": 3
    }
  ],
  "count": 1
}
```

---

## Email Reports API

### POST /api/email-reports/generate-weekly

Generate and send weekly digest.

**Authentication**: Required  
**Request Body**:

```json
{
  "babyId": "baby-123"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Weekly digest sent successfully",
  "stats": {
    "feedings": 8.3,
    "sleep": 51.5,
    "diapers": 7.2,
    "vaccinations": 0
  }
}
```

### POST /api/email-reports/send-milestone-announcement

Send milestone announcement email.

**Authentication**: Required  
**Request Body**:

```json
{
  "babyId": "baby-123",
  "milestone": "rolling",
  "details": {
    "date": "2026-04-22",
    "notes": "Rolled over on tummy!"
  }
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Milestone announcement sent"
}
```

---

## Wearable API

### POST /api/wearable/connect-apple-health

Connect Apple Health.

**Authentication**: Required  
**Request Body**:

```json
{
  "healthKitToken": "token_xyz"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "integration": {
    "id": "integration-123",
    "deviceType": "apple_health",
    "isActive": true,
    "lastSync": "2026-04-22T10:00:00Z"
  },
  "message": "Apple Health connected successfully"
}
```

### POST /api/wearable/sync

Manually trigger sync.

**Authentication**: Required  
**Request Body**:

```json
{
  "deviceType": "apple_health"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "syncResults": [
    {
      "device": "apple_health",
      "status": "success"
    }
  ],
  "message": "Synced 1 devices"
}
```

### GET /api/wearable/data

Get synced wearable data.

**Authentication**: Required  
**Query Parameters**:
- `babyId` (required)
- `deviceType` (optional): apple_health, fitbit
- `dataType` (optional): heart_rate, steps, sleep, temperature
- `startDate` (optional)
- `endDate` (optional)

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "heart_rate": [
      {
        "value": 120,
        "unit": "bpm",
        "recordedAt": "2026-04-22T10:00:00Z"
      }
    ],
    "sleep": [
      {
        "value": 8.5,
        "unit": "hours",
        "recordedAt": "2026-04-22T06:00:00Z"
      }
    ]
  },
  "count": 2
}
```

---

## Voice & Transcription API

### POST /api/voice/upload

Upload and transcribe voice memo.

**Authentication**: Required  
**Request Type**: multipart/form-data  
**Form Data**:
- `file`: Audio file (WAV format)
- `babyId`: Baby ID
- `category`: "general" or "cry"

**Response**: `201 Created`

```json
{
  "success": true,
  "voiceLog": {
    "id": "voice-123",
    "babyId": "baby-123",
    "transcription": "Baby is crying and seems hungry",
    "confidence": 0.92,
    "cryAnalysis": {
      "primaryCryType": "hungry",
      "confidence": 0.85,
      "painLevel": 3.2
    }
  },
  "message": "Voice memo uploaded and transcribed"
}
```

### GET /api/voice/logs

Get voice logs for baby.

**Authentication**: Required  
**Query Parameters**:
- `babyId` (required)
- `category` (optional): Filter by category
- `limit` (optional): Default 20
- `offset` (optional): Default 0

**Response**: `200 OK`

```json
{
  "success": true,
  "logs": [
    {
      "id": "voice-123",
      "babyId": "baby-123",
      "category": "cry",
      "transcription": "...",
      "createdAt": "2026-04-22T10:00:00Z"
    }
  ],
  "count": 1
}
```

### POST /api/voice/analyze-cry

Analyze crying pattern.

**Authentication**: Required  
**Request Body**:

```json
{
  "voiceLogId": "voice-123"
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "analysis": {
    "primaryCryType": "hungry",
    "confidence": 0.87,
    "painLevel": 2.5,
    "hungerProbability": 0.92,
    "tirednessProbability": 0.15,
    "discomfortProbability": 0.08
  },
  "message": "Cry pattern analyzed"
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| NO_TOKEN | 401 | No authentication token provided |
| INVALID_TOKEN | 401 | Token is invalid or expired |
| NOT_AUTHORIZED | 403 | User lacks required permissions |
| RESOURCE_NOT_FOUND | 404 | Requested resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| INTERNAL_ERROR | 500 | Server error |

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - Auth required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Internal error |

---

## Authentication

All endpoints require Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/endpoint
```

**Token Sources**:
- Supabase authentication
- Frontend localStorage: `localStorage.getItem('sb-auth-token')`

---

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Payment endpoints: 10 requests/minute
- Report generation: 5 requests/minute

---

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

---

**API Version**: 1.0.0  
**Last Updated**: April 22, 2026  
**Maintained by**: BabyLog Team
