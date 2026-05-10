export const CARE_WORKSPACE_UPDATED_EVENT = 'babylog:care-workspace-updated';

export interface CareWorkspaceUpdatedDetail {
  babyId?: string;
  source?: 'tasks' | 'wellness' | 'emergency' | 'sync';
}

export const emitCareWorkspaceUpdated = (detail?: CareWorkspaceUpdatedDetail) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CARE_WORKSPACE_UPDATED_EVENT, {
      detail,
    }),
  );
};
