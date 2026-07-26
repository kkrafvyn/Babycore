import { describe, expect, it } from 'vitest';

import {
  buildCareCopilotBabyContext,
  buildFallbackCopilotResponse,
  parseBabyAge,
} from './care-copilot.js';

describe('care-copilot', () => {
  it('flags implausible infant date of birth', () => {
    const age = parseBabyAge('2002-09-09', new Date('2026-07-24T12:00:00.000Z'));
    expect(age.dobInvalid).toBe(true);
    expect(age.ageLabel).toContain('years old');
  });

  it('builds conversational sleep guidance without context dump', () => {
    const context = buildCareCopilotBabyContext({
      babyName: 'Dia',
      dateOfBirth: '2002-09-09',
      feeds: [],
      sleeps: [],
      diapers: [],
      growth: [],
      vaccines: [],
    });

    const response = buildFallbackCopilotResponse(
      'Should we adjust bedtime this week?',
      context,
      parseBabyAge(context.dateOfBirth),
    );

    expect(response).toContain('Dia');
    expect(response).not.toContain('Context used:');
    expect(response).not.toContain('Here is a practical care plan');
    expect(response).toMatch(/birth date|date of birth/i);
    expect(response).toMatch(/sleep|bedtime/i);
  });

  it('answers feeding questions with age-aware guidance', () => {
    const context = buildCareCopilotBabyContext({
      babyName: 'Dia',
      dateOfBirth: '2026-04-01',
      feeds: [],
      sleeps: [],
      diapers: [],
      growth: [],
      vaccines: [],
    });

    const response = buildFallbackCopilotResponse(
      'How often should we feed today?',
      context,
      parseBabyAge(context.dateOfBirth, new Date('2026-07-24T12:00:00.000Z')),
    );

    expect(response).toMatch(/feed|hunger/i);
    expect(response).not.toContain('Context used:');
  });

  it('explains when no vaccines are scheduled', () => {
    const context = buildCareCopilotBabyContext({
      babyName: 'Dia',
      dateOfBirth: '2026-01-15',
      feeds: [],
      sleeps: [],
      diapers: [],
      growth: [],
      vaccines: [],
    });

    const response = buildFallbackCopilotResponse(
      'What vaccines are coming up next?',
      context,
      parseBabyAge(context.dateOfBirth, new Date('2026-07-24T12:00:00.000Z')),
    );

    expect(response).toMatch(/no upcoming vaccines|not scheduled/i);
    expect(response).not.toContain('Context used:');
  });
});
