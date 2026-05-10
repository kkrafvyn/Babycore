import { afterEach, describe, expect, it } from 'vitest';

import type { EmergencyShareCardResponse } from './care-advanced-api';
import {
  clearOfflineEmergencyCardSnapshot,
  clearOfflineEmergencyCardSnapshotsForTests,
  getOfflineEmergencyCardSnapshot,
  saveOfflineEmergencyCardSnapshot,
} from './offline-emergency-card';

const apiCard: EmergencyShareCardResponse = {
  baby: {
    id: 'baby-1',
    name: 'Ava',
    date_of_birth: '2025-01-02',
    country: 'US',
  },
  generatedAt: '2026-05-10T00:00:00.000Z',
  allergies: [],
  medications: [],
  latestGrowth: null,
  vaccines: [],
  doctorContacts: [],
  text: 'Emergency Health Card - Ava',
  qrCodeDataUrl: 'data:image/png;base64,abc',
};

afterEach(() => {
  clearOfflineEmergencyCardSnapshotsForTests();
});

describe('offline-emergency-card', () => {
  it('saves and loads a snapshot for a baby', () => {
    const snapshot = saveOfflineEmergencyCardSnapshot({
      babyId: 'baby-1',
      babyName: 'Ava',
      apiCard,
    });

    expect(snapshot.source).toBe('api');
    expect(getOfflineEmergencyCardSnapshot('baby-1')).toMatchObject({
      babyId: 'baby-1',
      babyName: 'Ava',
      text: 'Emergency Health Card - Ava',
    });
  });

  it('replaces an existing snapshot for the same baby', () => {
    saveOfflineEmergencyCardSnapshot({
      babyId: 'baby-1',
      babyName: 'Ava',
      apiCard,
    });

    const updated = saveOfflineEmergencyCardSnapshot({
      babyId: 'baby-1',
      babyName: 'Ava Rose',
      fallbackCard: {
        babyId: 'baby-1',
        babyName: 'Ava Rose',
        generatedAt: '2026-05-10T10:00:00.000Z',
        knownAllergies: [],
        activeMedications: ['Vitamin D'],
        overdueVaccines: [],
        emergencyNotes: [],
      },
    });

    expect(updated.source).toBe('fallback');
    expect(getOfflineEmergencyCardSnapshot('baby-1')).toMatchObject({
      babyName: 'Ava Rose',
      source: 'fallback',
    });
  });

  it('clears snapshots when requested', () => {
    saveOfflineEmergencyCardSnapshot({
      babyId: 'baby-1',
      babyName: 'Ava',
      apiCard,
    });

    expect(clearOfflineEmergencyCardSnapshot('baby-1')).toBe(true);
    expect(getOfflineEmergencyCardSnapshot('baby-1')).toBeNull();
    expect(clearOfflineEmergencyCardSnapshot('baby-1')).toBe(false);
  });
});
