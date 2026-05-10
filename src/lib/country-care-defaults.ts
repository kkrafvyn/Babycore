import type { Unit } from './i18n';
import {
  resolveVaccinationSchedule,
  type ResolvedVaccinationSchedule,
} from './vaccination-schedule-resolver';

const DEFAULT_COUNTRY_CODE = 'US';
const IMPERIAL_COUNTRY_CODES = new Set(['US', 'LR', 'MM']);
type TemperatureScale = 'F' | 'C';

interface CountryCareGuidanceProfile {
  emergencyNumber: string;
  newbornVisitCadence: string;
  careGuidanceSummary: string;
}

const REGION_GUIDANCE_DEFAULTS: Record<
  ResolvedVaccinationSchedule['regionCode'],
  CountryCareGuidanceProfile
> = {
  AFRICA: {
    emergencyNumber: '112',
    newbornVisitCadence: 'Birth, 1 week, 6 weeks',
    careGuidanceSummary: 'Early growth checks and immunization catch-up visits are commonly prioritized.',
  },
  ASIA: {
    emergencyNumber: '112',
    newbornVisitCadence: 'Birth, 2 weeks, 6 weeks',
    careGuidanceSummary: 'Families often review weight gain, jaundice, and feeding rhythm in the first month.',
  },
  EUROPE: {
    emergencyNumber: '112',
    newbornVisitCadence: 'Birth, 10 days, 6 to 8 weeks',
    careGuidanceSummary: 'Post-discharge community follow-up and routine developmental screening are commonly emphasized.',
  },
  MIDDLE_EAST: {
    emergencyNumber: '112',
    newbornVisitCadence: 'Birth, 1 to 2 weeks, 6 weeks',
    careGuidanceSummary: 'Feeding support and early vaccine timing are commonly reviewed in the first six weeks.',
  },
  NORTH_AMERICA: {
    emergencyNumber: '911',
    newbornVisitCadence: '48 hours, 1 week, 1 month',
    careGuidanceSummary: 'Early pediatric follow-up often focuses on feeding, weight gain, and newborn screening results.',
  },
  SOUTH_AMERICA: {
    emergencyNumber: '911',
    newbornVisitCadence: 'Birth, 1 week, 1 month',
    careGuidanceSummary: 'Primary care visits often pair growth checks with vaccine and feeding review.',
  },
  OCEANIA: {
    emergencyNumber: '111',
    newbornVisitCadence: 'Birth, 1 to 2 weeks, 6 weeks',
    careGuidanceSummary: 'Community nursing follow-up and growth review are often part of the first-month plan.',
  },
  GLOBAL: {
    emergencyNumber: '112',
    newbornVisitCadence: 'Birth, 1 week, 1 month',
    careGuidanceSummary: 'Keep a pediatric follow-up cadence that covers feeding, weight gain, and immunization planning.',
  },
};

const COUNTRY_GUIDANCE_OVERRIDES: Partial<Record<string, Partial<CountryCareGuidanceProfile>>> = {
  AU: {
    emergencyNumber: '000',
    newbornVisitCadence: 'Birth, 1 to 2 weeks, 6 weeks',
  },
  BR: {
    emergencyNumber: '192',
    newbornVisitCadence: 'Birth, 1 week, 1 month',
  },
  CA: {
    emergencyNumber: '911',
    newbornVisitCadence: '48 hours, 1 week, 2 months',
  },
  DE: {
    emergencyNumber: '112',
    newbornVisitCadence: 'Birth, 3 to 10 days, 4 to 5 weeks',
  },
  FR: {
    emergencyNumber: '15 / 112',
    newbornVisitCadence: 'Birth, 8 days, 1 month',
  },
  GB: {
    emergencyNumber: '999 / 111',
    newbornVisitCadence: '5 days, 10 to 14 days, 6 to 8 weeks',
  },
  IN: {
    emergencyNumber: '102 / 108 / 112',
    newbornVisitCadence: 'Birth, 1 week, 6 weeks',
  },
  MX: {
    emergencyNumber: '911',
    newbornVisitCadence: 'Birth, 7 days, 1 month',
  },
  NG: {
    emergencyNumber: '112',
    newbornVisitCadence: 'Birth, 1 week, 6 weeks',
  },
  NZ: {
    emergencyNumber: '111',
    newbornVisitCadence: 'Birth, 1 to 2 weeks, 6 weeks',
  },
  PH: {
    emergencyNumber: '911',
    newbornVisitCadence: 'Birth, 1 week, 6 weeks',
  },
  US: {
    emergencyNumber: '911',
    newbornVisitCadence: '48 hours, 1 week, 1 month',
  },
  ZA: {
    emergencyNumber: '112 / 10177',
    newbornVisitCadence: 'Birth, 1 week, 6 weeks',
  },
};

const normalizeCountryCode = (countryCode?: string): string => {
  const normalized = (countryCode || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : DEFAULT_COUNTRY_CODE;
};

export interface CountryCareDefaults {
  countryCode: string;
  recommendedUnits: Unit;
  recommendedUnitsCompactLabel: string;
  temperatureScale: TemperatureScale;
  temperatureLabel: string;
  vaccinationRegionName: string;
  vaccinationScheduleName: string;
  vaccinationScheduleSource: ResolvedVaccinationSchedule['source'];
  emergencyNumber: string;
  newbornVisitCadence: string;
  careGuidanceSummary: string;
}

export const getDefaultUnitsForCountry = (countryCode?: string): Unit =>
  IMPERIAL_COUNTRY_CODES.has(normalizeCountryCode(countryCode)) ? 'imperial' : 'metric';

export const getCountryCareDefaults = (countryCode?: string): CountryCareDefaults => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const schedule = resolveVaccinationSchedule(normalizedCountryCode);
  const recommendedUnits = getDefaultUnitsForCountry(normalizedCountryCode);
  const temperatureScale: TemperatureScale = recommendedUnits === 'imperial' ? 'F' : 'C';
  const guidanceDefaults = REGION_GUIDANCE_DEFAULTS[schedule.regionCode];
  const countryOverrides = COUNTRY_GUIDANCE_OVERRIDES[normalizedCountryCode] || {};

  return {
    countryCode: normalizedCountryCode,
    recommendedUnits,
    recommendedUnitsCompactLabel:
      recommendedUnits === 'imperial' ? 'lb / in / oz' : 'kg / cm / ml',
    temperatureScale,
    temperatureLabel:
      temperatureScale === 'F' ? 'Fahrenheit (°F)' : 'Celsius (°C)',
    vaccinationRegionName: schedule.regionName,
    vaccinationScheduleName: schedule.scheduleName,
    vaccinationScheduleSource: schedule.source,
    emergencyNumber:
      countryOverrides.emergencyNumber || guidanceDefaults.emergencyNumber,
    newbornVisitCadence:
      countryOverrides.newbornVisitCadence || guidanceDefaults.newbornVisitCadence,
    careGuidanceSummary:
      countryOverrides.careGuidanceSummary || guidanceDefaults.careGuidanceSummary,
  };
};
