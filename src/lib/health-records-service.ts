import { supabase } from './supabase';
import { buildStorageReference, createSignedStorageUrl } from './storage-signed-url';

export interface HealthRecord {
  id: string;
  baby_id: string;
  record_type: 'doctor_visit' | 'vaccine' | 'medication' | 'allergy' | 'condition' | 'test';
  title: string;
  description?: string;
  date_recorded: string;
  file_url?: string;
  storage_key?: string;
  tags?: string[];
  created_at: string;
}

export interface Allergy {
  id: string;
  baby_id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction_description?: string;
  photo_url?: string;
  discovered_date?: string;
}

export interface Medication {
  id: string;
  baby_id: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  reason?: string;
  start_date?: string;
  end_date?: string;
  effectiveness_notes?: string;
}

export interface MedicationAdherence {
  id: string;
  medication_id: string;
  given_at: string;
  given_by?: string;
  dose_taken: boolean;
  notes?: string;
  created_at: string;
  medication_name?: string;
  dosage?: string;
  frequency?: string;
}

const isMissingRelationError = (error: unknown): boolean => {
  const value = String((error as any)?.message || (error as any)?.details || '').toLowerCase();
  return value.includes('does not exist') || value.includes('relation');
};

const hydrateHealthRecord = async (record: HealthRecord): Promise<HealthRecord> => ({
  ...record,
  file_url:
    (await createSignedStorageUrl('health-records', record.storage_key, record.file_url)) ||
    record.file_url,
});

const extractBucketStorageKey = (bucket: string, value?: string | null): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (!/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const marker = `/${bucket}/`;
  if (!raw.includes(marker)) {
    return null;
  }

  return raw.split(marker)[1] || null;
};

const hydrateAllergy = async (allergy: Allergy): Promise<Allergy> => ({
  ...allergy,
  photo_url:
    (await createSignedStorageUrl(
      'allergy-photos',
      extractBucketStorageKey('allergy-photos', allergy.photo_url),
      allergy.photo_url,
    )) || allergy.photo_url,
});

/**
 * Create health record
 */
export async function createHealthRecord(
  babyId: string,
  recordType: string,
  title: string,
  description?: string,
  file?: File,
  tags?: string[]
): Promise<HealthRecord | null> {
  try {
    let storageKey: string | undefined;

    if (file) {
      const fileName = `health-records/${babyId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('health-records')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      storageKey = fileName;
    }

    const { data, error } = await supabase
      .from('health_records')
      .insert({
        baby_id: babyId,
        record_type: recordType,
        title,
        description,
        file_url: buildStorageReference('health-records', storageKey),
        storage_key: storageKey,
        date_recorded: new Date().toISOString().split('T')[0],
        tags: tags || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error creating health record:', err);
    return null;
  }
}

/**
 * Get health records for a baby
 */
export async function getHealthRecords(
  babyId: string,
  recordType?: string,
  limit = 50
): Promise<HealthRecord[]> {
  try {
    let query = supabase
      .from('health_records')
      .select('*')
      .eq('baby_id', babyId)
      .order('date_recorded', { ascending: false })
      .limit(limit);

    if (recordType) {
      query = query.eq('record_type', recordType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return await Promise.all(((data || []) as HealthRecord[]).map((record) => hydrateHealthRecord(record)));
  } catch (err) {
    console.error('Error fetching health records:', err);
    return [];
  }
}

/**
 * Add allergy
 */
export async function addAllergy(
  babyId: string,
  allergen: string,
  severity: 'mild' | 'moderate' | 'severe',
  reactionDescription?: string,
  photoFile?: File
): Promise<Allergy | null> {
  try {
    let photoUrl: string | undefined;

    if (photoFile) {
      const fileName = `allergies/${babyId}/${Date.now()}_${photoFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('allergy-photos')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      photoUrl = fileName;
    }

    const { data, error } = await supabase
      .from('allergies')
      .insert({
        baby_id: babyId,
        allergen,
        severity,
        reaction_description: reactionDescription,
        photo_url: photoUrl,
        discovered_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error adding allergy:', err);
    return null;
  }
}

/**
 * Get baby's allergies
 */
export async function getAllergies(babyId: string): Promise<Allergy[]> {
  try {
    const { data, error } = await supabase
      .from('allergies')
      .select('*')
      .eq('baby_id', babyId)
      .order('discovered_date', { ascending: true });

    if (error) throw error;
    return await Promise.all(((data || []) as Allergy[]).map((allergy) => hydrateAllergy(allergy)));
  } catch (err) {
    console.error('Error fetching allergies:', err);
    return [];
  }
}

/**
 * Add medication
 */
export async function addMedication(
  babyId: string,
  medicationName: string,
  dosage?: string,
  frequency?: string,
  reason?: string,
  startDate?: string,
  endDate?: string
): Promise<Medication | null> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .insert({
        baby_id: babyId,
        medication_name: medicationName,
        dosage,
        frequency,
        reason,
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error adding medication:', err);
    return null;
  }
}

/**
 * Get baby's medications
 */
export async function getMedications(babyId: string, activOnly = true): Promise<Medication[]> {
  try {
    let query = supabase.from('medications').select('*').eq('baby_id', babyId);

    if (activOnly) {
      const today = new Date().toISOString().split('T')[0];
      query = query
        .or(`end_date.is.null,end_date.gte.${today}`)
        .lte('start_date', today);
    }

    const { data, error } = await query.order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching medications:', err);
    return [];
  }
}

/**
 * Record a medication dose event for adherence tracking
 */
export async function recordMedicationDose(
  medicationId: string,
  notes?: string,
  givenAt?: string
): Promise<MedicationAdherence | null> {
  try {
    const auth = supabase.auth as any;
    const { data: userData } = await auth.getUser();

    const { data, error } = await supabase
      .from('medication_adherence')
      .insert({
        medication_id: medicationId,
        given_at: givenAt || new Date().toISOString(),
        given_by: userData?.user?.id,
        dose_taken: true,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    if (isMissingRelationError(err)) {
      console.warn(
        'medication_adherence table not available yet. Run the latest SQL migrations to enable dose tracking.',
      );
      return null;
    }
    console.error('Error recording medication dose:', err);
    return null;
  }
}

/**
 * Get medication adherence logs for all medications linked to a baby profile
 */
export async function getMedicationAdherenceByBaby(
  babyId: string,
  limit = 120
): Promise<MedicationAdherence[]> {
  try {
    const { data, error } = await supabase
      .from('medication_adherence')
      .select(
        `
          id,
          medication_id,
          given_at,
          given_by,
          dose_taken,
          notes,
          created_at,
          medications!inner (
            id,
            baby_id,
            medication_name,
            dosage,
            frequency
          )
        `,
      )
      .eq('medications.baby_id', babyId)
      .order('given_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      medication_id: row.medication_id,
      given_at: row.given_at,
      given_by: row.given_by || undefined,
      dose_taken: row.dose_taken ?? true,
      notes: row.notes || undefined,
      created_at: row.created_at,
      medication_name: row.medications?.medication_name,
      dosage: row.medications?.dosage,
      frequency: row.medications?.frequency,
    }));
  } catch (err) {
    if (isMissingRelationError(err)) {
      console.warn(
        'medication_adherence table not available yet. Run the latest SQL migrations to enable dose tracking.',
      );
      return [];
    }
    console.error('Error fetching medication adherence:', err);
    return [];
  }
}

/**
 * Update medication effectiveness
 */
export async function updateMedicationEffectiveness(
  medicationId: string,
  effectivenessNotes: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('medications')
      .update({ effectiveness_notes: effectivenessNotes })
      .eq('id', medicationId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating medication effectiveness:', err);
    return false;
  }
}

/**
 * Delete health record
 */
export async function deleteHealthRecord(recordId: string, storageKey?: string): Promise<boolean> {
  try {
    if (storageKey) {
      await supabase.storage.from('health-records').remove([storageKey]);
    }

    const { error } = await supabase.from('health_records').delete().eq('id', recordId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting health record:', err);
    return false;
  }
}

/**
 * Get health summary for a baby
 */
export async function getHealthSummary(babyId: string): Promise<{
  allergies: Allergy[];
  medications: Medication[];
  recentVisits: HealthRecord[];
}> {
  try {
    const [allergies, medications, visits] = await Promise.all([
      getAllergies(babyId),
      getMedications(babyId),
      getHealthRecords(babyId, 'doctor_visit', 5),
    ]);

    return { allergies, medications, recentVisits: visits };
  } catch (err) {
    console.error('Error getting health summary:', err);
    return {
      allergies: [],
      medications: [],
      recentVisits: [],
    };
  }
}
