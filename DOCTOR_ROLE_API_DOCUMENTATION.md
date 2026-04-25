# Doctor Role Implementation - Complete API Documentation

**Status**: ✅ Complete  
**Version**: 1.0.0  
**Last Updated**: April 25, 2026

---

## 📋 Overview

The Doctor role enables healthcare professionals to:
- Create and manage their professional profile
- Monitor multiple babies (with parental consent)
- Write and manage diagnoses
- Prescribe medications with adherence tracking
- Set appointment reminders for parents
- Generate medical reports
- Track growth and developmental milestones

---

## 🗄️ Database Schema

### New Tables Added (10 total)

1. **doctor_profiles** - Doctor professional information
2. **doctor_baby_assignments** - Doctor-baby relationships
3. **diagnoses** - Medical diagnoses for babies
4. **medications** - Prescribed medications
5. **medication_adherence** - Medication compliance tracking
6. **appointment_reminders** - Doctor appointments for parents
7. **medical_reports** - Consultation reports
8. **medical_history_summary** - Cached medical history
9. **consultation_notes** - Doctor consultation details
10. **doctor_growth_assessment** - Doctor-recorded growth data

**Schema File**: `DOCTOR_ROLE_SCHEMA.sql`

---

## 🔐 Role & Permissions

### Doctor Role Features
- ✅ View assigned babies
- ✅ Create and manage diagnoses
- ✅ Prescribe medications
- ✅ Set appointment reminders
- ✅ View vaccination history
- ✅ Access medical records
- ✅ Generate medical reports
- ✅ Track medication adherence
- ✅ Monitor growth metrics

### Access Control
- Doctors can only view babies assigned to them
- Doctors can only modify their own records
- Parents have visibility to all doctor interactions
- Admin can assign/unassign doctors

---

## 🔌 API Endpoints

### 1. Doctor Profile Management

#### Create/Update Doctor Profile
```http
POST /api/doctor/profile
Content-Type: application/json
Authorization: Bearer {token}

{
  "fullName": "Dr. Jane Smith",
  "specialization": "pediatrician",
  "licenseNumber": "PED123456789",
  "qualification": "MD, Pediatrics",
  "clinicName": "Happy Kids Clinic",
  "clinicAddress": "123 Health Street, Lagos",
  "clinicPhone": "+234-800-123-4567",
  "clinicEmail": "clinic@happykids.ng",
  "bio": "15 years of pediatric experience",
  "yearsOfExperience": 15,
  "languagesSpoken": ["English", "Yoruba"],
  "consultationFee": 5000,
  "availabilityHours": {
    "monday": "09:00-17:00",
    "tuesday": "09:00-17:00",
    "wednesday": "09:00-17:00",
    "thursday": "09:00-17:00",
    "friday": "09:00-17:00",
    "saturday": "10:00-14:00",
    "sunday": null
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Doctor profile saved successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "full_name": "Dr. Jane Smith",
    "specialization": "pediatrician",
    "is_verified": false,
    "created_at": "2026-04-25T10:30:00Z",
    "updated_at": "2026-04-25T10:30:00Z"
  }
}
```

#### Get Own Doctor Profile
```http
GET /api/doctor/profile
Authorization: Bearer {token}
```

#### Get Doctor Profile by ID
```http
GET /api/doctor/profile/{doctorId}
```

---

### 2. Baby Assignment

#### Get Assigned Babies
```http
GET /api/doctor/babies
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "baby_id": "uuid",
      "baby_name": "Emma Johnson",
      "parent_id": "uuid",
      "parent_email": "parent@email.com",
      "status": "active",
      "assignment_reason": "Regular checkup"
    }
  ]
}
```

#### Get Baby Full Details
```http
GET /api/doctor/babies/{babyId}/details
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "baby": {
      "id": "uuid",
      "name": "Emma Johnson",
      "dateOfBirth": "2024-01-15",
      "gender": "girl"
    },
    "diagnoses": [
      {
        "id": "uuid",
        "diagnosis_text": "Mild gastroenteritis",
        "severity": "mild",
        "status": "active",
        "onset_date": "2026-04-20"
      }
    ],
    "medications": [
      {
        "medication_id": "uuid",
        "medication_name": "Omeprazole",
        "dosage": "5ml",
        "frequency": "twice_daily",
        "status": "active"
      }
    ],
    "medicalHistory": {
      "allergies": [],
      "chronic_conditions": [],
      "past_surgeries": [],
      "current_medications": ["Omeprazole"]
    }
  }
}
```

---

### 3. Diagnoses Management

#### Create Diagnosis
```http
POST /api/doctor/diagnoses
Content-Type: application/json
Authorization: Bearer {token}

{
  "babyId": "uuid",
  "diagnosisText": "Acute otitis media",
  "icd10Code": "H66.001",
  "severity": "moderate",
  "onsetDate": "2026-04-24",
  "notes": "Viral infection, recommend rest and hydration"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Diagnosis recorded successfully",
  "data": {
    "id": "uuid",
    "baby_id": "uuid",
    "doctor_id": "uuid",
    "diagnosis_text": "Acute otitis media",
    "severity": "moderate",
    "status": "active",
    "created_at": "2026-04-25T10:30:00Z"
  }
}
```

#### Get Baby's Diagnoses
```http
GET /api/doctor/diagnoses/{babyId}
Authorization: Bearer {token}
```

#### Update Diagnosis Status
```http
PUT /api/doctor/diagnoses/{diagnosisId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "resolved",
  "notes": "Baby recovered after treatment"
}
```

---

### 4. Medications Management

#### Prescribe Medication
```http
POST /api/doctor/medications
Content-Type: application/json
Authorization: Bearer {token}

{
  "babyId": "uuid",
  "medicationName": "Amoxicillin",
  "dosage": "125",
  "unit": "ml",
  "frequency": "three_times_daily",
  "startDate": "2026-04-25",
  "endDate": "2026-05-05",
  "reason": "Ear infection treatment",
  "instructions": "Take with food. Do not skip doses",
  "sideEffects": "May cause mild diarrhea",
  "contraindications": "None known"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Medication prescribed successfully",
  "data": {
    "id": "uuid",
    "medication_name": "Amoxicillin",
    "dosage": "125",
    "unit": "ml",
    "frequency": "three_times_daily",
    "status": "active",
    "prescribed_at": "2026-04-25T10:30:00Z"
  }
}
```

#### Get Baby's Active Medications
```http
GET /api/doctor/medications/{babyId}
Authorization: Bearer {token}
```

#### Track Medication Adherence (Parent logs dose)
```http
POST /api/doctor/medications/{medicationId}/track-adherence
Content-Type: application/json
Authorization: Bearer {parentToken}

{
  "givenAt": "2026-04-25T14:30:00Z",
  "notes": "Baby took medicine with food"
}
```

#### Stop Medication
```http
PUT /api/doctor/medications/{medicationId}/stop
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Course completed"
}
```

---

### 5. Appointment Reminders

#### Create Appointment Reminder
```http
POST /api/doctor/appointments/reminders
Content-Type: application/json
Authorization: Bearer {token}

{
  "babyId": "uuid",
  "parentId": "uuid",
  "appointmentType": "follow_up",
  "scheduledDate": "2026-05-10",
  "scheduledTime": "14:30",
  "reason": "Follow-up for ear infection treatment"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Appointment reminder set successfully",
  "data": {
    "id": "uuid",
    "appointment_type": "follow_up",
    "scheduled_date": "2026-05-10",
    "scheduled_time": "14:30",
    "status": "pending",
    "created_at": "2026-04-25T10:30:00Z"
  }
}
```

#### Get Upcoming Appointments
```http
GET /api/doctor/appointments/upcoming?days=7
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "appointment_id": "uuid",
      "baby_name": "Emma Johnson",
      "scheduled_date": "2026-04-26",
      "scheduled_time": "10:00",
      "appointment_type": "checkup",
      "status": "pending"
    }
  ]
}
```

#### Update Appointment Status
```http
PUT /api/doctor/appointments/reminders/{reminderId}/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "completed"
}
```

Valid statuses: `pending`, `reminded`, `completed`, `cancelled`, `no_show`

#### Send Reminder Notification to Parent
```http
POST /api/doctor/appointments/reminders/{reminderId}/send-notification
Authorization: Bearer {token}
```

---

### 6. Doctor Dashboard

#### Get Doctor Dashboard Statistics
```http
GET /api/doctor/dashboard
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "patientCount": 3,
    "upcomingAppointments": [
      {
        "baby_name": "Emma Johnson",
        "scheduled_date": "2026-04-26",
        "appointment_type": "checkup"
      }
    ],
    "recentDiagnoses": [
      {
        "baby_name": "Liam Smith",
        "diagnosis_text": "Common cold",
        "created_at": "2026-04-24T15:20:00Z"
      }
    ]
  }
}
```

---

## 🔄 Complete Workflow Examples

### Example 1: Initial Doctor Setup

```bash
# 1. Doctor creates profile
POST /api/doctor/profile
{
  "fullName": "Dr. Jane Smith",
  "specialization": "pediatrician",
  "licenseNumber": "PED123456789",
  "qualification": "MD, Pediatrics"
}

# 2. Parent approves doctor assignment
POST /api/doctor/assign-baby
{
  "babyId": "baby-uuid",
  "parentId": "parent-uuid",
  "reason": "Regular medical checkup"
}

# 3. Doctor gets list of assigned babies
GET /api/doctor/babies
→ Returns list of babies assigned to this doctor
```

### Example 2: Diagnosis & Medication Flow

```bash
# 1. Doctor examines baby and creates diagnosis
POST /api/doctor/diagnoses
{
  "babyId": "baby-uuid",
  "diagnosisText": "Acute bronchitis",
  "severity": "moderate",
  "onsetDate": "2026-04-24"
}

# 2. Doctor prescribes medication
POST /api/doctor/medications
{
  "babyId": "baby-uuid",
  "medicationName": "Cough Syrup",
  "dosage": "5",
  "unit": "ml",
  "frequency": "twice_daily",
  "startDate": "2026-04-25",
  "endDate": "2026-05-05"
}

# 3. Parent tracks medication adherence
POST /api/doctor/medications/{medicationId}/track-adherence
{
  "givenAt": "2026-04-25T08:00:00Z"
}

# 4. Doctor schedules follow-up appointment
POST /api/doctor/appointments/reminders
{
  "babyId": "baby-uuid",
  "parentId": "parent-uuid",
  "appointmentType": "follow_up",
  "scheduledDate": "2026-05-02"
}
```

### Example 3: Appointment Management

```bash
# 1. Doctor sets reminder
POST /api/doctor/appointments/reminders

# 2. Doctor sends notification to parent
POST /api/doctor/appointments/reminders/{reminderId}/send-notification

# 3. Doctor marks appointment as completed
PUT /api/doctor/appointments/reminders/{reminderId}/status
{
  "status": "completed"
}
```

---

## 🔍 Database Helper Functions

### get_doctor_assigned_babies
```sql
SELECT * FROM get_doctor_assigned_babies('doctor-uuid');
```
Returns all babies assigned to a doctor.

### get_doctor_upcoming_appointments
```sql
SELECT * FROM get_doctor_upcoming_appointments('doctor-uuid', 7);
```
Returns appointments scheduled for next 7 days.

### get_baby_active_medications
```sql
SELECT * FROM get_baby_active_medications('baby-uuid');
```
Returns all active medications for a baby.

### get_doctor_patient_count
```sql
SELECT get_doctor_patient_count('doctor-uuid');
```
Returns total number of babies assigned to doctor.

---

## 📊 Data Models

### Doctor Profile
```typescript
interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string;
  specialization: 'pediatrician' | 'general_practitioner' | 'specialist';
  licenseNumber: string;
  qualification: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  bio?: string;
  isVerified: boolean;
  yearsOfExperience: number;
  languagesSpoken: string[];
  consultationFee?: number;
  availabilityHours?: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
}
```

### Diagnosis
```typescript
interface Diagnosis {
  id: string;
  babyId: string;
  doctorId: string;
  diagnosisText: string;
  icd10Code?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  onsetDate: string;
  status: 'active' | 'resolved' | 'under_investigation';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Medication
```typescript
interface Medication {
  id: string;
  babyId: string;
  doctorId: string;
  medicationName: string;
  dosage: string;
  unit: 'ml' | 'mg' | 'tablet' | 'capsule' | 'drop' | 'spray' | 'injection';
  frequency: 'as_needed' | 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'every_6_hours' | 'every_8_hours' | 'every_12_hours' | 'weekly' | 'monthly';
  startDate: string;
  endDate?: string;
  reasonForPrescription: string;
  instructions?: string;
  possibleSideEffects?: string;
  status: 'active' | 'completed' | 'discontinued';
  prescribedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

### Appointment Reminder
```typescript
interface AppointmentReminder {
  id: string;
  babyId: string;
  doctorId: string;
  parentId: string;
  appointmentType: 'checkup' | 'follow_up' | 'review' | 'vaccination';
  scheduledDate: string;
  scheduledTime?: string;
  reason?: string;
  status: 'pending' | 'reminded' | 'completed' | 'cancelled' | 'no_show';
  reminderSent: boolean;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔐 Security & Access Control

### Row Level Security (RLS) Policies

**Doctor can only view/manage babies assigned to them:**
```sql
-- Doctors can view assigned babies
CREATE POLICY "Doctors can view assigned babies"
  ON doctor_baby_assignments FOR SELECT
  USING (auth.uid() = doctor_id OR auth.uid() = parent_id);

-- Doctors can create diagnoses for assigned babies
CREATE POLICY "Doctors can create diagnoses for assigned babies"
  ON diagnoses FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id AND
    baby_id IN (
      SELECT baby_id FROM doctor_baby_assignments 
      WHERE doctor_id = auth.uid() AND status = 'active'
    )
  );
```

---

## 🧪 Testing

### cURL Examples

#### Create Doctor Profile
```bash
curl -X POST http://localhost:3000/api/doctor/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fullName": "Dr. Jane Smith",
    "specialization": "pediatrician",
    "licenseNumber": "PED123456789",
    "qualification": "MD, Pediatrics"
  }'
```

#### Create Diagnosis
```bash
curl -X POST http://localhost:3000/api/doctor/diagnoses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "babyId": "baby-uuid",
    "diagnosisText": "Common cold",
    "severity": "mild",
    "onsetDate": "2026-04-25"
  }'
```

#### Get Doctor Dashboard
```bash
curl -X GET http://localhost:3000/api/doctor/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 Integration with Frontend

### Example React Component
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

export function DoctorDashboard() {
  // Fetch doctor's assigned babies
  const { data: babies } = useQuery({
    queryKey: ['doctor-babies'],
    queryFn: async () => {
      const { data } = await axios.get('/api/doctor/babies');
      return data.data;
    }
  });

  // Create diagnosis mutation
  const createDiagnosis = useMutation({
    mutationFn: (diagnosis) => 
      axios.post('/api/doctor/diagnoses', diagnosis),
    onSuccess: () => {
      // Invalidate and refetch
    }
  });

  return (
    <div>
      <h1>Doctor Dashboard</h1>
      <div>Patients: {babies?.length}</div>
      {/* Render babies and diagnoses UI */}
    </div>
  );
}
```

---

## 📝 Notes & Recommendations

- Always verify doctor-baby relationship before allowing modifications
- Implement audit logging for all medical data changes
- Enable HIPAA compliance for medical data handling
- Use encryption for sensitive medical information
- Implement proper backup and disaster recovery
- Consider implementing digital signature for prescriptions
- Validate medication dosages against baby's age/weight

---

## 🆘 Troubleshooting

### Issue: Doctor can't see assigned babies
**Solution**: Check `doctor_baby_assignments` table. Verify `status = 'active'` and `parent_consent = true`

### Issue: Medication prescription fails
**Solution**: Verify baby_id exists and doctor is assigned to baby. Check database constraints.

### Issue: Appointment reminder not sending
**Solution**: Verify parent contact information. Check notification service configuration.

---

## 📞 Support

For issues or questions about doctor role implementation:
1. Check error logs in Sentry
2. Review database logs in Supabase
3. Verify API endpoint configuration
4. Test with cURL before integrating with frontend

