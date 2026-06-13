import {
  renderMilestoneEmail,
  renderMonthlyNewsletterEmail,
  renderWeeklyDigestEmail,
} from './email-templates.js';

type BabyRecord = {
  name?: string | null;
};

const averagePerDay = (count: number, days: number): number => count / days;

export const buildWeeklyDigestContent = (
  baby: BabyRecord,
  feeding: unknown[],
  sleep: Array<{ duration?: number | string | null }>,
  diapers: unknown[],
  vaccinations: unknown[],
  dashboardUrl?: string,
) => {
  const babyName = baby.name || 'Baby';
  const stats = {
    feedings: averagePerDay(feeding.length, 7),
    sleep: sleep.reduce((sum, entry) => sum + Number(entry.duration || 0), 0) / 60,
    diapers: averagePerDay(diapers.length, 7),
    vaccinations: vaccinations.length,
  };

  const email = renderWeeklyDigestEmail({
    babyName,
    stats,
    dashboardUrl,
  });

  return {
    subject: `Weekly Update: ${babyName}'s Progress`,
    html: email.html,
    text: email.text,
    stats,
  };
};

export const buildMonthlyNewsletterContent = (
  baby: BabyRecord,
  feeding: unknown[],
  sleep: Array<{ duration?: number | string | null }>,
  diapers: unknown[],
  vaccinations: unknown[],
  dashboardUrl?: string,
) => {
  const babyName = baby.name || 'Baby';
  const stats = {
    feedings: averagePerDay(feeding.length, 30),
    sleep: sleep.reduce((sum, entry) => sum + Number(entry.duration || 0), 0) / 60,
    diapers: averagePerDay(diapers.length, 30),
    vaccinations: vaccinations.length,
  };

  const email = renderMonthlyNewsletterEmail({
    babyName,
    stats,
    dashboardUrl,
  });

  return {
    subject: `Monthly Roundup: ${babyName}`,
    html: email.html,
    text: email.text,
    stats,
  };
};

export const buildMilestoneEmailContent = (
  baby: BabyRecord,
  milestone: string,
  details: { date?: string; notes?: string } | null | undefined,
  dashboardUrl?: string,
) => {
  const milestoneNames: Record<string, string> = {
    rolling: 'Started Rolling Over',
    sitting: 'Started Sitting Up',
    crawling: 'Started Crawling',
    walking: 'First Steps',
    talking: 'First Words',
    smiling: 'First Smile',
  };

  const babyName = baby.name || 'Baby';
  const email = renderMilestoneEmail({
    babyName,
    milestoneName: milestoneNames[milestone] || milestone,
    date: details?.date,
    notes: details?.notes,
    dashboardUrl,
  });

  return {
    subject: `${babyName} reached a milestone`,
    html: email.html,
    text: email.text,
  };
};
