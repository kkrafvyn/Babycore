import { describe, expect, it } from 'vitest';
import type { CareProfilePreferences } from '../types';
import {
  deriveSettingsFromCareProfile,
  getCareProfileBadges,
  getCareProfileSummary,
  normalizeCareProfile,
} from './care-profile';

describe('care-profile', () => {
  it('normalizes baby profile values with defaults', () => {
    expect(
      normalizeCareProfile('baby', {
        childStage: 'infant',
        carePriorities: ['feeding'],
      }),
    ).toEqual({
      childStage: 'infant',
      feedingStyle: 'mixed',
      carePriorities: ['feeding'],
      healthConsiderations: [],
      supportFocus: [],
    });
  });

  it('derives reminder settings from a newborn baby care plan', () => {
    const derived = deriveSettingsFromCareProfile('baby', {
      childStage: 'newborn',
      feedingStyle: 'breastfeeding',
      carePriorities: ['feeding', 'sleep', 'medical'],
      healthConsiderations: ['reflux'],
    });

    expect(derived.feedingInterval).toBe(2);
    expect(derived.reminderPreferences?.feeding).toBe(true);
    expect(derived.reminderPreferences?.sleep).toBe(true);
    expect(derived.reminderPreferences?.medication).toBe(true);
    expect(derived.reminderPreferences?.snoozeMinutes).toBe(15);
  });

  it('creates concise labels and summary for caregiver plans', () => {
    const profile: CareProfilePreferences = {
      carePriorities: ['routine', 'feeding'],
      supportFocus: ['daily-logs', 'handoff-updates'],
    };

    expect(getCareProfileBadges('caregiver', profile)).toEqual([
      'Routine',
      'Feeding',
      'Daily logs',
      'Handoff updates',
    ]);
    expect(getCareProfileSummary('caregiver', profile)).toContain('daily logs');
  });
});
