import type { Activity } from '../types';
import { supabase } from './supabase';

type ActivityLogRow = {
  id: string;
  baby_id: string;
  activity_type: Activity['type'];
  duration_minutes: number;
  activity_date: string;
  notes: string | null;
  developmental_benefit: string | null;
  created_at: string;
};

const fromActivityLogRow = (row: ActivityLogRow): Activity => ({
  id: row.id,
  babyId: row.baby_id,
  timestamp: new Date(`${row.activity_date}T12:00:00`).toISOString(),
  type: row.activity_type,
  duration: row.duration_minutes,
  description: row.developmental_benefit || undefined,
  notes: row.notes || undefined,
  createdAt: row.created_at,
});

const toActivityLogRow = (activity: Activity) => ({
  id: activity.id,
  baby_id: activity.babyId,
  activity_type: activity.type,
  duration_minutes: activity.duration,
  activity_date: activity.timestamp.slice(0, 10),
  notes: activity.notes || null,
  developmental_benefit: activity.description || null,
});

export async function getActivityLogsByBaby(babyId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      'id,baby_id,activity_type,duration_minutes,activity_date,notes,developmental_benefit,created_at',
    )
    .eq('baby_id', babyId)
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => fromActivityLogRow(row as ActivityLogRow));
}

export async function saveActivityLog(activity: Activity): Promise<Activity> {
  const { data, error } = await supabase
    .from('activity_logs')
    .upsert(toActivityLogRow(activity), { onConflict: 'id' })
    .select(
      'id,baby_id,activity_type,duration_minutes,activity_date,notes,developmental_benefit,created_at',
    )
    .single();

  if (error) {
    throw error;
  }

  return fromActivityLogRow(data as ActivityLogRow);
}

export async function deleteActivityLog(id: string): Promise<void> {
  const { error } = await supabase.from('activity_logs').delete().eq('id', id);

  if (error) {
    throw error;
  }
}
