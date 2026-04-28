/**
 * WHO and US CDC Vaccination Schedule Data
 * Based on WHO immunization schedules and US CDC ACIP recommendations
 * Colors and ages in weeks/months
 */

export interface VaccineSchedule {
  id: string;
  name: string;
  shortName: string;
  descriptions: Record<string, string>;
  schedule: {
    ageWeeks?: number;
    ageMonths?: number;
    ageYears?: number;
    doses: number;
    doseNumber: number;
  }[];
  colors: string;
  country?: string;
}

export interface CountrySchedule {
  code: string;
  name: string;
  schedules: VaccineSchedule[];
}

// US CDC Recommended Vaccination Schedule (2024)
export const US_SCHEDULE: VaccineSchedule[] = [
  {
    id: 'hepb',
    name: 'Hepatitis B',
    shortName: 'HepB',
    descriptions: {
      en: 'Protects against hepatitis B infection',
      es: 'Protege contra la infección por hepatitis B',
    },
    schedule: [
      { ageWeeks: 0, ageMonths: 0, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 4, ageMonths: 1, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageMonths: 6, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-blue-500 dark:bg-blue-600',
  },
  {
    id: 'dtap',
    name: 'Diphtheria, Tetanus, Pertussis',
    shortName: 'DTaP',
    descriptions: {
      en: 'Protects against diphtheria, tetanus, and whooping cough',
      es: 'Protege contra la difteria, el tétanos y la tos ferina',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 5, doseNumber: 1 },
      { ageWeeks: 12, ageMonths: 3, ageYears: 0, doses: 5, doseNumber: 2 },
      { ageWeeks: 16, ageMonths: 4, ageYears: 0, doses: 5, doseNumber: 3 },
      { ageMonths: 15, ageYears: 1, doses: 5, doseNumber: 4 },
      { ageYears: 4, doses: 5, doseNumber: 5 },
    ],
    colors: 'bg-red-500 dark:bg-red-600',
  },
  {
    id: 'ipv',
    name: 'Polio',
    shortName: 'IPV',
    descriptions: {
      en: 'Protects against poliomyelitis',
      es: 'Protege contra la poliomielitis',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 4, doseNumber: 1 },
      { ageWeeks: 12, ageMonths: 3, ageYears: 0, doses: 4, doseNumber: 2 },
      { ageMonths: 6, ageYears: 0, doses: 4, doseNumber: 3 },
      { ageYears: 4, doses: 4, doseNumber: 4 },
    ],
    colors: 'bg-purple-500 dark:bg-purple-600',
  },
  {
    id: 'hib',
    name: 'Haemophilus influenzae type b',
    shortName: 'Hib',
    descriptions: {
      en: 'Protects against Haemophilus influenzae type b infections',
      es: 'Protege contra las infecciones por Haemophilus influenzae tipo b',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 4, doseNumber: 1 },
      { ageWeeks: 12, ageMonths: 3, ageYears: 0, doses: 4, doseNumber: 2 },
      { ageMonths: 6, ageYears: 0, doses: 4, doseNumber: 3 },
      { ageMonths: 15, ageYears: 1, doses: 4, doseNumber: 4 },
    ],
    colors: 'bg-green-500 dark:bg-green-600',
  },
  {
    id: 'pneumococcal',
    name: 'Pneumococcal',
    shortName: 'PCV',
    descriptions: {
      en: 'Protects against pneumococcal infections',
      es: 'Protege contra las infecciones neumocócicas',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 4, doseNumber: 1 },
      { ageWeeks: 12, ageMonths: 3, ageYears: 0, doses: 4, doseNumber: 2 },
      { ageMonths: 6, ageYears: 0, doses: 4, doseNumber: 3 },
      { ageMonths: 15, ageYears: 1, doses: 4, doseNumber: 4 },
    ],
    colors: 'bg-orange-500 dark:bg-orange-600',
  },
  {
    id: 'rotavirus',
    name: 'Rotavirus',
    shortName: 'RV',
    descriptions: {
      en: 'Protects against rotavirus infection',
      es: 'Protege contra la infección por rotavirus',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 12, ageMonths: 3, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageMonths: 6, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-yellow-500 dark:bg-yellow-600',
  },
  {
    id: 'flu',
    name: 'Influenza',
    shortName: 'Flu',
    descriptions: {
      en: 'Protects against seasonal influenza',
      es: 'Protege contra la gripe estacional',
    },
    schedule: [
      { ageMonths: 6, ageYears: 0, doses: 2, doseNumber: 1 },
      { ageMonths: 7, ageYears: 0, doses: 2, doseNumber: 2 },
      { ageYears: 1, doses: 1, doseNumber: 3 },
    ],
    colors: 'bg-teal-500 dark:bg-teal-600',
  },
  {
    id: 'mmr',
    name: 'Measles, Mumps, Rubella',
    shortName: 'MMR',
    descriptions: {
      en: 'Protects against measles, mumps, and rubella',
      es: 'Protege contra el sarampión, las paperas y la rubéola',
    },
    schedule: [
      { ageMonths: 12, ageYears: 1, doses: 2, doseNumber: 1 },
      { ageYears: 4, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-pink-500 dark:bg-pink-600',
  },
  {
    id: 'varicella',
    name: 'Chickenpox',
    shortName: 'Var',
    descriptions: {
      en: 'Protects against chickenpox (varicella)',
      es: 'Protege contra la varicela',
    },
    schedule: [
      { ageMonths: 12, ageYears: 1, doses: 2, doseNumber: 1 },
      { ageYears: 4, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-indigo-500 dark:bg-indigo-600',
  },
  {
    id: 'hepA',
    name: 'Hepatitis A',
    shortName: 'HepA',
    descriptions: {
      en: 'Protects against hepatitis A',
      es: 'Protege contra la hepatitis A',
    },
    schedule: [
      { ageMonths: 12, ageYears: 1, doses: 2, doseNumber: 1 },
      { ageMonths: 18, ageYears: 1, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-emerald-500 dark:bg-emerald-600',
  },
];

// WHO Global Immunization Schedule (Simplified)
export const WHO_SCHEDULE: VaccineSchedule[] = [
  {
    id: 'bcg',
    name: 'Bacillus Calmette-Guérin',
    shortName: 'BCG',
    descriptions: {
      en: 'Protects against tuberculosis',
      es: 'Protege contra la tuberculosis',
    },
    schedule: [
      { ageWeeks: 0, ageMonths: 0, ageYears: 0, doses: 1, doseNumber: 1 },
    ],
    colors: 'bg-slate-500 dark:bg-slate-600',
  },
  {
    id: 'hepb_who',
    name: 'Hepatitis B',
    shortName: 'HepB',
    descriptions: {
      en: 'Protects against hepatitis B infection',
      es: 'Protege contra la infección por hepatitis B',
    },
    schedule: [
      { ageWeeks: 0, ageMonths: 0, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageMonths: 1, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageMonths: 6, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-blue-500 dark:bg-blue-600',
  },
  {
    id: 'dpt_who',
    name: 'Diphtheria, Pertussis, Tetanus',
    shortName: 'DPT',
    descriptions: {
      en: 'Protects against diphtheria, pertussis, and tetanus',
      es: 'Protege contra la difteria, la tos ferina y el tétanos',
    },
    schedule: [
      { ageWeeks: 6, ageMonths: 1, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 10, ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageWeeks: 14, ageMonths: 3, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-red-500 dark:bg-red-600',
  },
  {
    id: 'ipv_who',
    name: 'Inactivated Polio Vaccine',
    shortName: 'IPV',
    descriptions: {
      en: 'Protects against poliomyelitis',
      es: 'Protege contra la poliomielitis',
    },
    schedule: [
      { ageWeeks: 6, ageMonths: 1, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 10, ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageWeeks: 14, ageMonths: 3, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-purple-500 dark:bg-purple-600',
  },
  {
    id: 'hib_who',
    name: 'Haemophilus influenzae type b',
    shortName: 'Hib',
    descriptions: {
      en: 'Protects against Haemophilus influenzae type b',
      es: 'Protege contra Haemophilus influenzae tipo b',
    },
    schedule: [
      { ageWeeks: 6, ageMonths: 1, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 10, ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageWeeks: 14, ageMonths: 3, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-green-500 dark:bg-green-600',
  },
  {
    id: 'pneumococcal_who',
    name: 'Pneumococcal Conjugate',
    shortName: 'PCV',
    descriptions: {
      en: 'Protects against pneumococcal diseases',
      es: 'Protege contra las enfermedades neumocócicas',
    },
    schedule: [
      { ageWeeks: 6, ageMonths: 1, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 10, ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageWeeks: 14, ageMonths: 3, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-orange-500 dark:bg-orange-600',
  },
  {
    id: 'rotavirus_who',
    name: 'Rotavirus',
    shortName: 'RV',
    descriptions: {
      en: 'Protects against rotavirus',
      es: 'Protege contra el rotavirus',
    },
    schedule: [
      { ageWeeks: 6, ageMonths: 1, ageYears: 0, doses: 2, doseNumber: 1 },
      { ageWeeks: 10, ageMonths: 2, ageYears: 0, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-yellow-500 dark:bg-yellow-600',
  },
  {
    id: 'mmr_who',
    name: 'Measles, Mumps, Rubella',
    shortName: 'MMR',
    descriptions: {
      en: 'Protects against measles, mumps, and rubella',
      es: 'Protege contra el sarampión, las paperas y la rubéola',
    },
    schedule: [
      { ageMonths: 9, ageYears: 0, doses: 1, doseNumber: 1 },
      { ageMonths: 15, ageYears: 1, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-pink-500 dark:bg-pink-600',
  },
  {
    id: 'yellow_fever',
    name: 'Yellow Fever',
    shortName: 'YF',
    descriptions: {
      en: 'Protects against yellow fever',
      es: 'Protege contra la fiebre amarilla',
    },
    schedule: [
      { ageMonths: 9, ageYears: 0, doses: 1, doseNumber: 1 },
    ],
    colors: 'bg-amber-500 dark:bg-amber-600',
  },
];

// UK/NHS-style infant schedule (reference implementation)
export const UK_NHS_SCHEDULE: VaccineSchedule[] = [
  {
    id: 'six_in_one_uk',
    name: '6-in-1 (DTaP/IPV/Hib/HepB)',
    shortName: '6-in-1',
    descriptions: {
      en: 'Protects against diphtheria, tetanus, pertussis, polio, Hib, and hepatitis B',
      es: 'Protege contra difteria, tetanos, tos ferina, polio, Hib y hepatitis B',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 12, ageMonths: 3, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageWeeks: 16, ageMonths: 4, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-indigo-500 dark:bg-indigo-600',
  },
  {
    id: 'rotavirus_uk',
    name: 'Rotavirus',
    shortName: 'Rota',
    descriptions: {
      en: 'Protects against rotavirus',
      es: 'Protege contra rotavirus',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 2, doseNumber: 1 },
      { ageWeeks: 12, ageMonths: 3, ageYears: 0, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-yellow-500 dark:bg-yellow-600',
  },
  {
    id: 'menb_uk',
    name: 'Meningococcal B',
    shortName: 'MenB',
    descriptions: {
      en: 'Protects against meningococcal group B disease',
      es: 'Protege contra la enfermedad meningococica grupo B',
    },
    schedule: [
      { ageWeeks: 8, ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageWeeks: 16, ageMonths: 4, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageMonths: 12, ageYears: 1, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-rose-500 dark:bg-rose-600',
  },
  {
    id: 'mmr_uk',
    name: 'Measles, Mumps, Rubella',
    shortName: 'MMR',
    descriptions: {
      en: 'Protects against measles, mumps, and rubella',
      es: 'Protege contra sarampion, paperas y rubeola',
    },
    schedule: [
      { ageMonths: 12, ageYears: 1, doses: 2, doseNumber: 1 },
      { ageYears: 3, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-pink-500 dark:bg-pink-600',
  },
];

// Australia/NIP-style infant schedule (reference implementation)
export const AU_NIP_SCHEDULE: VaccineSchedule[] = [
  {
    id: 'dtpa_ipv_hib_hepb_au',
    name: 'DTPa/IPV/Hib/HepB',
    shortName: 'DTPa combo',
    descriptions: {
      en: 'Protects against diphtheria, tetanus, pertussis, polio, Hib, and hepatitis B',
      es: 'Protege contra difteria, tetanos, tos ferina, polio, Hib y hepatitis B',
    },
    schedule: [
      { ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageMonths: 4, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageMonths: 6, ageYears: 0, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-blue-500 dark:bg-blue-600',
  },
  {
    id: 'pneumococcal_au',
    name: 'Pneumococcal',
    shortName: 'PCV',
    descriptions: {
      en: 'Protects against pneumococcal disease',
      es: 'Protege contra enfermedad neumococica',
    },
    schedule: [
      { ageMonths: 2, ageYears: 0, doses: 3, doseNumber: 1 },
      { ageMonths: 4, ageYears: 0, doses: 3, doseNumber: 2 },
      { ageMonths: 12, ageYears: 1, doses: 3, doseNumber: 3 },
    ],
    colors: 'bg-orange-500 dark:bg-orange-600',
  },
  {
    id: 'rotavirus_au',
    name: 'Rotavirus',
    shortName: 'Rota',
    descriptions: {
      en: 'Protects against rotavirus',
      es: 'Protege contra rotavirus',
    },
    schedule: [
      { ageMonths: 2, ageYears: 0, doses: 2, doseNumber: 1 },
      { ageMonths: 4, ageYears: 0, doses: 2, doseNumber: 2 },
    ],
    colors: 'bg-yellow-500 dark:bg-yellow-600',
  },
  {
    id: 'mmr_au',
    name: 'Measles, Mumps, Rubella',
    shortName: 'MMR',
    descriptions: {
      en: 'Protects against measles, mumps, and rubella',
      es: 'Protege contra sarampion, paperas y rubeola',
    },
    schedule: [{ ageMonths: 12, ageYears: 1, doses: 1, doseNumber: 1 }],
    colors: 'bg-pink-500 dark:bg-pink-600',
  },
];

export const VACCINATION_SCHEDULES: CountrySchedule[] = [
  { code: 'US', name: 'United States', schedules: US_SCHEDULE },
  { code: 'CA', name: 'Canada', schedules: US_SCHEDULE },
  { code: 'GB', name: 'United Kingdom', schedules: UK_NHS_SCHEDULE },
  { code: 'AU', name: 'Australia', schedules: AU_NIP_SCHEDULE },
  { code: 'NZ', name: 'New Zealand', schedules: AU_NIP_SCHEDULE },
  { code: 'WHO', name: 'WHO Global', schedules: WHO_SCHEDULE },
];

export function getScheduleByCountry(countryCode: string): VaccineSchedule[] {
  const normalizedCountryCode = (countryCode || '').toUpperCase();
  const schedule = VACCINATION_SCHEDULES.find((s) => s.code === normalizedCountryCode);
  return schedule?.schedules || WHO_SCHEDULE;
}

export function formatAge(weeks: number): string {
  if (weeks < 4) return `${weeks}w`;
  const months = Math.round(weeks / 4.33);
  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
}
