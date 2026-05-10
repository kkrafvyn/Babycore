import { getCurrentUser, supabase } from './supabase';
import {
  buildCareWorkspaceSyncData,
  parseCareWorkspaceSyncData,
  type CareWorkspaceSyncData,
} from './care-workspace-sync';
import { isMissingSupabaseRelationError as isMissingRelationError } from './cloud-sync-mappers';

interface SharedCareWorkspaceRow {
  baby_id: string;
  shared_care_tasks?: unknown;
  parent_wellness_entries?: unknown;
  offline_emergency_snapshots?: unknown;
  synced_at?: string | null;
  updated_at?: string | null;
}

const toWorkspaceData = (row: SharedCareWorkspaceRow | null): CareWorkspaceSyncData | null => {
  if (!row) {
    return null;
  }

  return parseCareWorkspaceSyncData({
    sharedCareTasks: Array.isArray(row.shared_care_tasks) ? row.shared_care_tasks : [],
    parentWellnessEntries: Array.isArray(row.parent_wellness_entries)
      ? row.parent_wellness_entries
      : [],
    offlineEmergencySnapshots: Array.isArray(row.offline_emergency_snapshots)
      ? row.offline_emergency_snapshots
      : [],
    syncedAt: row.synced_at || row.updated_at || new Date().toISOString(),
  });
};

export const getSharedCareWorkspaceSnapshot = async (
  babyId: string,
): Promise<CareWorkspaceSyncData | null> => {
  try {
    const { data, error } = await supabase
      .from('shared_care_workspaces')
      .select(
        'baby_id,shared_care_tasks,parent_wellness_entries,offline_emergency_snapshots,synced_at,updated_at',
      )
      .eq('baby_id', babyId)
      .maybeSingle();

    if (error) throw error;
    return toWorkspaceData((data || null) as SharedCareWorkspaceRow | null);
  } catch (error) {
    if (isMissingRelationError(error, 'shared_care_workspaces')) {
      console.warn(
        'shared_care_workspaces table missing. Run latest SQL migrations to enable cross-account care workspace sync.',
      );
      return null;
    }

    console.error('Error fetching shared care workspace snapshot:', error);
    return null;
  }
};

export const saveSharedCareWorkspaceSnapshot = async (
  babyId: string,
  payload?: CareWorkspaceSyncData | null,
): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return false;
    }

    const workspace = payload || buildCareWorkspaceSyncData([babyId]);
    const { error } = await supabase.from('shared_care_workspaces').upsert(
      {
        baby_id: babyId,
        shared_care_tasks: workspace.sharedCareTasks,
        parent_wellness_entries: workspace.parentWellnessEntries,
        offline_emergency_snapshots: workspace.offlineEmergencySnapshots,
        synced_at: workspace.syncedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'baby_id' },
    );

    if (error) throw error;
    return true;
  } catch (error) {
    if (isMissingRelationError(error, 'shared_care_workspaces')) {
      console.warn(
        'shared_care_workspaces table missing. Run latest SQL migrations to enable cross-account care workspace sync.',
      );
      return false;
    }

    console.error('Error saving shared care workspace snapshot:', error);
    return false;
  }
};
