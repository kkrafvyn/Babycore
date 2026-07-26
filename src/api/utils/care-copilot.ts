export type CareCopilotBabyContext = {
  babyName: string;
  dateOfBirth?: string;
  ageLabel: string;
  dobInvalid: boolean;
  hasSparseData: boolean;
  feedsCount: number;
  sleepsCount: number;
  diapersCount: number;
  growthCount: number;
  pendingVaccines: number;
  overdueVaccines: number;
  upcomingVaccineNames: string[];
};

const MAX_INFANT_AGE_DAYS = 5 * 365;

export const parseBabyAge = (
  dateOfBirth?: string,
  now: Date = new Date(),
): Pick<CareCopilotBabyContext, 'ageLabel' | 'dobInvalid'> & {
  ageWeeks: number | null;
  ageMonths: number | null;
} => {
  if (!dateOfBirth?.trim()) {
    return { ageWeeks: null, ageMonths: null, ageLabel: 'unknown age', dobInvalid: false };
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return { ageWeeks: null, ageMonths: null, ageLabel: 'unknown age', dobInvalid: true };
  }

  const ageMs = now.getTime() - dob.getTime();
  if (ageMs < 0) {
    return { ageWeeks: null, ageMonths: null, ageLabel: 'future date of birth', dobInvalid: true };
  }

  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageWeeks = Math.floor(ageDays / 7);
  const ageMonths = Math.floor(ageDays / 30.44);

  if (ageDays > MAX_INFANT_AGE_DAYS) {
    const years = Math.floor(ageDays / 365);
    return {
      ageWeeks,
      ageMonths,
      ageLabel: `${years} years old (birth date may need updating)`,
      dobInvalid: true,
    };
  }

  if (ageMonths >= 1) {
    return {
      ageWeeks,
      ageMonths,
      ageLabel: `${ageMonths} month${ageMonths === 1 ? '' : 's'} old`,
      dobInvalid: false,
    };
  }

  return {
    ageWeeks,
    ageMonths: 0,
    ageLabel: `${ageWeeks} week${ageWeeks === 1 ? '' : 's'} old`,
    dobInvalid: false,
  };
};

export const buildCareCopilotBabyContext = (input: {
  babyName: string;
  dateOfBirth?: string;
  feeds: unknown[];
  sleeps: unknown[];
  diapers: unknown[];
  growth: unknown[];
  vaccines: Array<{ name?: string; status?: string }>;
}): CareCopilotBabyContext => {
  const age = parseBabyAge(input.dateOfBirth);
  const pendingVaccines = input.vaccines.filter((item) => item.status === 'scheduled').length;
  const overdueVaccines = input.vaccines.filter((item) => item.status === 'overdue').length;
  const upcomingVaccineNames = input.vaccines
    .filter((item) => item.status === 'scheduled' || item.status === 'overdue')
    .map((item) => String(item.name || 'Vaccine').trim())
    .filter(Boolean)
    .slice(0, 4);

  const feedsCount = input.feeds.length;
  const sleepsCount = input.sleeps.length;
  const diapersCount = input.diapers.length;
  const growthCount = input.growth.length;
  const hasSparseData = feedsCount + sleepsCount + diapersCount < 3;

  return {
    babyName: input.babyName || 'Baby',
    dateOfBirth: input.dateOfBirth,
    ageLabel: age.ageLabel,
    dobInvalid: age.dobInvalid,
    hasSparseData,
    feedsCount,
    sleepsCount,
    diapersCount,
    growthCount,
    pendingVaccines,
    overdueVaccines,
    upcomingVaccineNames,
  };
};

export const formatCareContextForAi = (context: CareCopilotBabyContext): string => {
  return [
    `Baby name: ${context.babyName}`,
    `Age: ${context.ageLabel}`,
    context.dateOfBirth ? `Date of birth on file: ${context.dateOfBirth}` : 'Date of birth: not set',
    context.dobInvalid ? 'Note: date of birth looks incorrect for an infant profile.' : '',
    `Logged data available: ${context.feedsCount} feeds, ${context.sleepsCount} sleep sessions, ${context.diapersCount} diapers, ${context.growthCount} growth entries`,
    context.hasSparseData ? 'Data is sparse — lean on age-based guidance and encourage logging.' : '',
    `Vaccines scheduled: ${context.pendingVaccines}, overdue: ${context.overdueVaccines}${
      context.upcomingVaccineNames.length
        ? ` (up next: ${context.upcomingVaccineNames.join(', ')})`
        : ''
    }`,
  ]
    .filter(Boolean)
    .join('\n');
};

const formatDobHint = (context: CareCopilotBabyContext): string | null => {
  if (!context.dobInvalid) {
    return null;
  }

  return `The birth date on ${context.babyName}'s profile doesn't look right for a baby (currently ${context.dateOfBirth || 'missing'}). Updating it in profile settings will unlock age-specific guidance.`;
};

const sparseDataIntro = (context: CareCopilotBabyContext, topic: string): string => {
  if (!context.hasSparseData) {
    return '';
  }

  return `I don't have much ${topic} logged for ${context.babyName} yet, so this is general guidance for a ${context.ageLabel} baby rather than a pattern from your records. `;
};

const feedingGuidanceForAge = (ageMonths: number | null, ageWeeks: number | null): string => {
  if (ageMonths === null && ageWeeks === null) {
    return 'Most newborns feed every 2–3 hours (8–12 times in 24 hours), including overnight. Watch hunger cues—rooting, hands to mouth, fussiness—rather than the clock alone.';
  }

  if (ageMonths === 0 && (ageWeeks ?? 0) < 4) {
    return 'At this age, aim for feeds roughly every 2–3 hours (8–12 feeds/day). Cluster feeding in the evening is common. Offer a feed when you see early hunger cues.';
  }

  if (ageMonths < 4) {
    return 'Many babies this age still feed every 2–3 hours, often 7–9 times/day. Follow hunger/fullness cues; some days they will want more during growth spurts.';
  }

  if (ageMonths < 6) {
    return 'Feeding often settles to about every 3–4 hours (6–8 feeds/day) for many babies, though breastfed infants may still cluster feed. Let appetite lead unless your pediatrician gave a specific plan.';
  }

  return 'Feeding intervals vary with solids introduction and activity. Keep regular meal and snack times, stay hydrated, and follow your pediatrician\'s plan for volume and frequency.';
};

const sleepGuidanceForAge = (ageMonths: number | null, ageWeeks: number | null): string => {
  if (ageMonths === null && ageWeeks === null) {
    return 'Keep bedtime and wake-up within a 30–45 minute window each day, use a short wind-down (dim lights, diaper, feed, song), and give any change at least 3–5 nights before deciding if it helped.';
  }

  if (ageMonths === 0 && (ageWeeks ?? 0) < 8) {
    return 'Newborns often have late bedtimes and frequent night wakes—that is normal. Focus on safe sleep (back, firm surface, empty crib) and a calm, repeatable bedtime routine rather than a strict clock time.';
  }

  if (ageMonths < 4) {
    return 'Many babies this age do well with bedtime around 7:30–9:00 PM after wake windows of roughly 60–90 minutes. Keep the routine consistent for several nights before shifting bedtime earlier or later by 15 minutes.';
  }

  if (ageMonths < 12) {
    return 'Bedtime often works best between 7:00–8:30 PM with 2–3 naps depending on age. If nights are rough, try an earlier bedtime by 15–20 minutes for a few nights—not a big jump all at once.';
  }

  return 'A steady bedtime routine and limiting screens before bed still help. Adjust bedtime in 15-minute steps and keep it consistent for at least a week before judging results.';
};

export const buildFallbackCopilotResponse = (
  prompt: string,
  context: CareCopilotBabyContext,
  age: { ageWeeks: number | null; ageMonths: number | null } = parseBabyAge(context.dateOfBirth),
): string => {
  const lowerPrompt = prompt.toLowerCase();
  const name = context.babyName;
  const dobHint = formatDobHint(context);
  const disclaimer =
    'This is general guidance, not medical advice—contact your pediatrician for urgent concerns or a plan tailored to your child.';

  if (/(fever|rash|pain|vomit|blood|breath|seizure|emergency|911|999|can't breathe|cant breathe)/.test(lowerPrompt)) {
    return [
      `If ${name} may be seriously unwell, contact your pediatrician or emergency services now rather than waiting.`,
      'Watch for trouble breathing, blue lips, dehydration, a fever in a very young infant, or unusual lethargy.',
      disclaimer,
    ].join('\n\n');
  }

  if (/(vaccine|immuni|shot|jab)/.test(lowerPrompt)) {
    const parts: string[] = [];

    if (context.overdueVaccines > 0) {
      parts.push(
        `${name} has ${context.overdueVaccines} overdue vaccine${context.overdueVaccines === 1 ? '' : 's'} in Cradlyn. I'd prioritize catching those up with your pediatrician first.`,
      );
    } else if (context.pendingVaccines > 0 && context.upcomingVaccineNames.length > 0) {
      parts.push(
        `Coming up in your records: ${context.upcomingVaccineNames.join(', ')}. Confirm timing at your next visit—schedules can vary by country and health history.`,
      );
    } else {
      parts.push(
        `No upcoming vaccines are scheduled in Cradlyn for ${name} yet. Add your clinic's schedule under Vaccines, or ask at your next visit what's due based on age (${context.ageLabel}).`,
      );
    }

    if (dobHint) {
      parts.push(dobHint);
    }

    parts.push(
      'Bring your vaccine card to every visit so your doctor can confirm catch-up spacing if any doses were missed.',
      disclaimer,
    );

    return parts.join('\n\n');
  }

  if (/(fe(ed|eding)|hungry|bottle|breast|formula|feed today|how often)/.test(lowerPrompt)) {
    const parts = [
      sparseDataIntro(context, 'feeding') +
        `For ${name} (${context.ageLabel}), ${feedingGuidanceForAge(age.ageMonths, age.ageWeeks)}`,
    ];

    if (context.feedsCount === 0) {
      parts.push(
        `Log feeds in Cradlyn for a day or two—I can then comment on intervals and whether frequency looks typical for ${name}.`,
      );
    }

    if (dobHint) {
      parts.push(dobHint);
    }

    parts.push(disclaimer);
    return parts.join('\n\n');
  }

  if (/(sleep|nap|wake|night|bedtime|bed time)/.test(lowerPrompt)) {
    const parts = [
      sparseDataIntro(context, 'sleep') +
        `For ${name} (${context.ageLabel}), ${sleepGuidanceForAge(age.ageMonths, age.ageWeeks)}`,
    ];

    if (context.sleepsCount === 0) {
      parts.push(
        `Once you log a few nights of sleep, I can help spot whether ${name}'s schedule is shifting and if a bedtime tweak makes sense.`,
      );
    }

    if (dobHint) {
      parts.push(dobHint);
    }

    parts.push(disclaimer);
    return parts.join('\n\n');
  }

  if (/(growth|weight|height|percentile)/.test(lowerPrompt)) {
    const parts: string[] = [];

    if (context.growthCount === 0) {
      parts.push(
        `There aren't growth measurements logged for ${name} yet. Add weight and length from your last check-up to track trends over time.`,
      );
    } else {
      parts.push(
        `${name} has ${context.growthCount} growth entries on file. Keep logging at well-child visits—steady curves matter more than a single number.`,
      );
    }

    if (dobHint) {
      parts.push(dobHint);
    }

    parts.push(
      'Your pediatrician should interpret percentiles and any concerns about gain or length.',
      disclaimer,
    );
    return parts.join('\n\n');
  }

  const parts = [
    `Happy to help with ${name} (${context.ageLabel}).`,
    context.hasSparseData
      ? `You haven't logged much care data yet—try tracking feeds, sleep, and diapers for a few days so I can give sharper, personalized answers.`
      : `Ask me about sleep timing, feeding frequency, vaccines, or growth—I use what you've logged plus age-based guidance.`,
  ];

  if (dobHint) {
    parts.push(dobHint);
  }

  parts.push(disclaimer);
  return parts.join('\n\n');
};

export const CARE_COPILOT_SYSTEM_PROMPT = [
  'You are Cradlyn Care Copilot, a warm and concise assistant for parents and caregivers.',
  'Answer the specific question first in 2–4 short paragraphs or a brief bullet list.',
  'Use the baby profile context when relevant; if data is sparse, say so plainly and give safe age-based guidance.',
  'If date of birth looks wrong for an infant, mention updating the profile—do not dump raw context fields.',
  'Never diagnose. Escalate urgent symptoms to a pediatrician or emergency services.',
  'Do not repeat boilerplate like "Here is a practical care plan" or paste "Context used:" blocks.',
  'End with one sentence reminding that this is general guidance, not a substitute for a clinician.',
].join(' ');
