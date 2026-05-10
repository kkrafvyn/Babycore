import { afterEach, describe, expect, it } from 'vitest';

import {
  clearParentWellnessEntriesForTests,
  createParentWellnessEntry,
  deleteParentWellnessEntry,
  getParentWellnessEntries,
  getParentWellnessRecommendations,
  getParentWellnessSummary,
} from './parent-wellness';

afterEach(() => {
  clearParentWellnessEntriesForTests();
});

describe('parent-wellness', () => {
  it('stores entries and derives helpful tags', () => {
    const entry = createParentWellnessEntry({
      babyId: 'baby-1',
      caregiverName: 'Mom',
      mood: 'drained',
      stressLevel: 9,
      sleepHours: 4,
      pumpingSessions: 6,
      waterIntake: 3,
      mealsCompleted: 1,
      recoveryStatus: 'recovering',
      notes: 'Very long night',
    });

    expect(entry.tags).toEqual(
      expect.arrayContaining([
        'sleep-debt',
        'high-stress',
        'low-hydration',
        'skipped-meals',
        'heavy-pumping',
        'recovery-mode',
      ]),
    );
    expect(getParentWellnessEntries('baby-1')).toHaveLength(1);
  });

  it('summarizes entries for a baby', () => {
    createParentWellnessEntry({
      babyId: 'baby-1',
      caregiverName: 'Mom',
      mood: 'steady',
      stressLevel: 6,
      sleepHours: 6,
      pumpingSessions: 2,
      waterIntake: 5,
      mealsCompleted: 3,
      recoveryStatus: 'steady',
    });
    createParentWellnessEntry({
      babyId: 'baby-1',
      caregiverName: 'Dad',
      mood: 'hopeful',
      stressLevel: 4,
      sleepHours: 7,
      pumpingSessions: 0,
      waterIntake: 6,
      mealsCompleted: 3,
      recoveryStatus: 'strong',
    });

    const summary = getParentWellnessSummary('baby-1');
    expect(summary).toMatchObject({
      checkInCount: 2,
      averageStressLevel: 5,
      averageSleepHours: 6.5,
      totalPumpingSessions: 2,
      averageWaterIntake: 5.5,
      highStressCount: 0,
      lowSleepCount: 0,
    });
    expect(summary.sleepDebtHours).toBe(2);
  });

  it('deletes entries and exposes recommendations when needed', () => {
    const entry = createParentWellnessEntry({
      babyId: 'baby-1',
      caregiverName: 'Mom',
      mood: 'overwhelmed',
      stressLevel: 8,
      sleepHours: 4.5,
      pumpingSessions: 1,
      waterIntake: 4,
      mealsCompleted: 2,
      recoveryStatus: 'recovering',
    });

    const recommendations = getParentWellnessRecommendations(getParentWellnessSummary('baby-1'));
    expect(recommendations.join(' ')).toContain('recovery');
    expect(deleteParentWellnessEntry(entry.id)).toBe(true);
    expect(getParentWellnessEntries('baby-1')).toHaveLength(0);
  });
});
