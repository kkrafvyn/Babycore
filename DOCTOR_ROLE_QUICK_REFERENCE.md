# Doctor Role - Quick Reference Guide

> Historical note: this document was written when Vercel was the example deployment target. The current app and API can be deployed on any platform.

## ⚡ Quick Start

### 1. Doctor Creates Profile
```bash
POST /api/doctor/profile
{
  "fullName": "Dr. Name",
  "specialization": "pediatrician",
  "licenseNumber": "LICENSE123"
}
```

### 2. Get Assigned Babies
```bash
GET /api/doctor/babies
# Returns list of babies doctor monitors
```

### 3. Write Diagnosis
```bash
POST /api/doctor/diagnoses
{
  "babyId": "uuid",
  "diagnosisText": "Condition",
  "severity": "mild"
}
```

### 4. Prescribe Medication
```bash
POST /api/doctor/medications
{
  "babyId": "uuid",
  "medicationName": "Drug",
  "dosage": "5",
  "unit": "ml",
  "frequency": "twice_daily"
}
```

### 5. Set Appointment Reminder
```bash
POST /api/doctor/appointments/reminders
{
  "babyId": "uuid",
  "parentId": "uuid",
  "appointmentType": "follow_up",
  "scheduledDate": "2026-05-10"
}
```

---

## 📚 Key Endpoints (15 total)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/doctor/profile` | Create/update profile |
| GET | `/api/doctor/profile` | Get own profile |
| GET | `/api/doctor/profile/{id}` | Get doctor by ID |
| GET | `/api/doctor/babies` | Get assigned babies |
| GET | `/api/doctor/babies/{id}/details` | Get baby full details |
| POST | `/api/doctor/diagnoses` | Create diagnosis |
| GET | `/api/doctor/diagnoses/{babyId}` | Get diagnoses |
| PUT | `/api/doctor/diagnoses/{id}` | Update diagnosis |
| POST | `/api/doctor/medications` | Prescribe medication |
| GET | `/api/doctor/medications/{babyId}` | Get medications |
| POST | `/api/doctor/medications/{id}/track-adherence` | Log dose |
| PUT | `/api/doctor/medications/{id}/stop` | Stop medication |
| POST | `/api/doctor/appointments/reminders` | Create appointment |
| GET | `/api/doctor/appointments/upcoming` | Get upcoming appointments |
| PUT | `/api/doctor/appointments/reminders/{id}/status` | Update appointment |

---

## 🗄️ Database Tables (10 new)

```
✅ doctor_profiles
✅ doctor_baby_assignments
✅ diagnoses
✅ medications
✅ medication_adherence
✅ appointment_reminders
✅ medical_reports
✅ medical_history_summary
✅ consultation_notes
✅ doctor_growth_assessment
```

---

## 🔐 Permissions

✅ Doctor can:
- View assigned babies only
- Create diagnoses
- Prescribe medications
- Set reminders
- Generate reports

❌ Doctor cannot:
- View other doctors' data
- Access unassigned babies
- Delete records (mark as inactive)
- Access payment data

---

## 📁 Files Created/Updated

| File | Purpose | Status |
|------|---------|--------|
| `DOCTOR_ROLE_SCHEMA.sql` | Database schema | ✅ Created |
| `src/api/routes/doctor.ts` | API endpoints | ✅ Created |
| `DOCTOR_ROLE_API_DOCUMENTATION.md` | Full API docs | ✅ Created |
| `.env` | Fixed placeholders | ✅ Updated |
| `vercel.json` | Optional Vercel config | ✅ Created |
| `.env.production.example` | Prod template | ✅ Created |
| `DEPLOYMENT_CHECKLIST.md` | Platform-neutral deployment guide | ✅ Available |

---

## 🚀 Next Steps

### Immediate (Before testing)
1. Run `DOCTOR_ROLE_SCHEMA.sql` in Supabase
2. Add doctor route to `src/api/server.ts`:
   ```typescript
   import doctorRouter from './routes/doctor';
   app.use('/api/doctor', doctorRouter);
   ```
3. Verify `.env` is updated with real API keys
4. Test endpoints with cURL

### For Frontend Integration
1. Create Doctor Dashboard component
2. Add Doctor profile form
3. Create Diagnosis form
4. Create Medication prescription form
5. Create Appointment reminder interface
6. Add Doctor role to authentication

### For Deployment
1. Copy `.env` to `.env.production.example`
2. Set all production environment variables in your hosting platform
3. Run database migrations in production Supabase
4. Deploy to your chosen host
5. Verify all endpoints working

---

## 🧪 Test Scenarios

### Test 1: Doctor Registration
```bash
1. Doctor signs up via auth
2. POST /api/doctor/profile with details
3. Verify profile created in DB
```

### Test 2: Baby Assignment
```bash
1. Parent invites doctor to baby
2. Doctor accepts assignment
3. GET /api/doctor/babies returns baby
```

### Test 3: Diagnosis & Medication
```bash
1. Doctor creates diagnosis
2. Doctor prescribes medication
3. Parent logs adherence
4. Doctor views medication history
```

### Test 4: Appointments
```bash
1. Doctor sets appointment
2. Appointment appears in upcoming list
3. Doctor sends notification
4. Appointment marked as completed
```

---

## 📊 Data Flow Diagram

```
Parent                  Doctor                  Baby
  |                       |                       |
  |---Invite Doctor------>|                       |
  |                       |                       |
  |<--Doctor Accepts------|                       |
  |                       |                       |
  |                       |---Examine Baby------->|
  |                       |                       |
  |                       |---Create Diagnosis-->|
  |                       |                       |
  |<--View Diagnosis-----|--                      |
  |                       |                       |
  |                       |---Prescribe Med----->|
  |                       |                       |
  |---Log Adherence------>|                       |
  |                       |                       |
  |                       |---Set Reminder------->|
  |<--Get Reminder--------|                       |
```

---

## 🔄 Status Enums

### Diagnosis Status
- `active` - Currently being treated
- `resolved` - Treatment completed
- `under_investigation` - Still investigating

### Medication Status
- `active` - Currently prescribed
- `completed` - Course finished
- `discontinued` - Stopped early

### Appointment Status
- `pending` - Not yet reminded
- `reminded` - Reminder sent
- `completed` - Appointment done
- `cancelled` - Appointment cancelled
- `no_show` - Parent didn't attend

---

## 🔗 Related Roles

### User/Parent
- Creates baby profiles
- Invites doctors
- Views doctor recommendations
- Logs medication adherence
- Confirms appointments

### Caregiver
- Can view baby data
- May log some data (with permission)
- Receives appointment reminders

### Admin
- Verifies doctor credentials
- Can assign/unassign doctors
- Access analytics

---

## 📞 Support Matrix

| Issue | Solution |
|-------|----------|
| Doctor can't see babies | Check `doctor_baby_assignments` with `status='active'` |
| Medication script fails | Verify `baby_id` exists and doctor is assigned |
| Appointment not sending | Check parent contact info and notification service |
| RLS policy errors | Verify `auth.uid()` matches doctor_id |
| Database constraint error | Check unique constraints on doctor_profiles |

---

## 📈 Performance Indexes

All implemented for fast queries:
- `doctor_profiles(user_id)` - Profile lookup
- `doctor_baby_assignments(doctor_id)` - Get doctor's patients
- `diagnoses(baby_id, status)` - Get active diagnoses
- `medications(baby_id, status)` - Get active medications
- `appointment_reminders(scheduled_date)` - Query upcoming appointments

---

## ✅ Deployment Checklist

- [ ] SQL schema run in Supabase
- [ ] Doctor route added to server.ts
- [ ] Environment variables updated
- [ ] API endpoints tested with cURL
- [ ] Frontend components created
- [ ] Doctor registration flow tested
- [ ] Full workflow tested end-to-end
- [ ] Production environment variables set on your chosen host
- [ ] Production deployment successful
- [ ] Monitoring/Sentry configured

---

## 🎯 Key Features Summary

✅ **Profile Management** - Doctors create verified profiles  
✅ **Baby Monitoring** - View multiple assigned babies  
✅ **Diagnoses** - Document medical conditions  
✅ **Medications** - Prescribe with dosage tracking  
✅ **Adherence** - Parents log medication taken  
✅ **Reminders** - Schedule parent follow-up appointments  
✅ **Reports** - Generate medical reports  
✅ **Growth Tracking** - Record developmental milestones  
✅ **Security** - RLS policies prevent unauthorized access  
✅ **Audit Trail** - All changes logged  

---

## 📚 Documentation Files

1. `DOCTOR_ROLE_SCHEMA.sql` - Database setup
2. `DOCTOR_ROLE_API_DOCUMENTATION.md` - Full API reference
3. `DOCTOR_ROLE_QUICK_REFERENCE.md` - This file
4. `DEPLOYMENT_CHECKLIST.md` - Production deployment
5. `.env.production.example` - Environment template

---

**Status**: ✅ Complete & Ready for Testing  
**Version**: 1.0.0  
**Last Updated**: April 25, 2026

