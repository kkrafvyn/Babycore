import { describe, expect, it } from 'vitest';
import { buildDoctorVisitBrief, generateDoctorVisitPacketHTML } from './export';
import type {
  Baby,
  DiaperLog,
  FeedLog,
  GrowthMeasurement,
  MemoryLog,
  Milestone,
  SleepLog,
  VaccinationRecord,
} from '../types';

const baby: Baby = {
  id: 'baby-1',
  name: 'Ava',
  dateOfBirth: '2025-12-01T00:00:00.000Z',
  gender: 'girl',
  country: 'US',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const feedLogs: FeedLog[] = [
  {
    id: 'feed-1',
    babyId: baby.id,
    timestamp: '2026-05-01T08:00:00.000Z',
    type: 'bottle',
    bottleAmount: 120,
    bottleType: 'formula',
    createdAt: '2026-05-01T08:00:00.000Z',
  },
];

const sleepLogs: SleepLog[] = [
  {
    id: 'sleep-1',
    babyId: baby.id,
    startTime: '2026-05-01T01:00:00.000Z',
    endTime: '2026-05-01T03:00:00.000Z',
    duration: 120,
    createdAt: '2026-05-01T03:00:00.000Z',
  },
];

const diaperLogs: DiaperLog[] = [
  {
    id: 'diaper-1',
    babyId: baby.id,
    timestamp: '2026-05-01T09:00:00.000Z',
    type: 'wet',
    createdAt: '2026-05-01T09:00:00.000Z',
  },
];

const growthMeasurements: GrowthMeasurement[] = [
  {
    id: 'growth-1',
    babyId: baby.id,
    date: '2026-05-01T00:00:00.000Z',
    weight: 6.2,
    height: 61,
    headCircumference: 40,
    createdAt: '2026-05-01T00:00:00.000Z',
  },
];

const vaccinationRecords: VaccinationRecord[] = [
  {
    id: 'vax-1',
    babyId: baby.id,
    name: 'DTaP',
    dueDate: '2026-05-20T00:00:00.000Z',
    status: 'scheduled',
    createdAt: '2026-05-01T00:00:00.000Z',
  },
];

const milestones: Milestone[] = [
  {
    id: 'mile-1',
    babyId: baby.id,
    date: '2026-05-03T00:00:00.000Z',
    type: 'rolling',
    description: 'Rolled from tummy to back',
    createdAt: '2026-05-03T00:00:00.000Z',
  },
];

const memories: MemoryLog[] = [
  {
    id: 'memory-1',
    babyId: baby.id,
    timestamp: '2026-05-04T00:00:00.000Z',
    text: 'Seemed extra alert after the afternoon bottle.',
    createdAt: '2026-05-04T00:00:00.000Z',
  },
];

const exportData = {
  baby,
  sleepLogs,
  feedLogs,
  diaperLogs,
  growthMeasurements,
  vaccinationRecords,
  milestones,
  memories,
  dateRange: {
    start: new Date('2026-05-01T00:00:00.000Z'),
    end: new Date('2026-05-08T00:00:00.000Z'),
  },
};

describe('export helpers', () => {
  it('builds a doctor visit brief with key summary lines', () => {
    const brief = buildDoctorVisitBrief(exportData as any);

    expect(brief).toContain('Ava visit brief');
    expect(brief).toContain('Average feeds/day');
    expect(brief).toContain('Next vaccine to review: DTaP');
  });

  it('generates a visit packet html document', () => {
    const html = generateDoctorVisitPacketHTML(exportData as any);

    expect(html).toContain('BabyLog Visit Packet');
    expect(html).toContain('Ava');
    expect(html).toContain('Vaccines To Review');
    expect(html).toContain('DTaP');
  });
});
