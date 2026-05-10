import type { Unit } from './i18n';
import {
  resolveVaccinationSchedule,
  type ResolvedVaccinationSchedule,
} from './vaccination-schedule-resolver';

const DEFAULT_COUNTRY_CODE = 'US';
const IMPERIAL_COUNTRY_CODES = new Set(['US', 'LR', 'MM']);

const normalizeCountryCode = (countryCode?: string): string => {
  const normalized = (countryCode || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : DEFAULT_COUNTRY_CODE;
};

export interface CountryCareDefaults {
  countryCode: string;
  recommendedUnits: Unit;
  recommendedUnitsCompactLabel: string;
  vaccinationRegionName: string;
  vaccinationScheduleName: string;
  vaccinationScheduleSource: ResolvedVaccinationSchedule['source'];
}

export const getDefaultUnitsForCountry = (countryCode?: string): Unit =>
  IMPERIAL_COUNTRY_CODES.has(normalizeCountryCode(countryCode)) ? 'imperial' : 'metric';

export const getCountryCareDefaults = (countryCode?: string): CountryCareDefaults => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const schedule = resolveVaccinationSchedule(normalizedCountryCode);
  const recommendedUnits = getDefaultUnitsForCountry(normalizedCountryCode);

  return {
    countryCode: normalizedCountryCode,
    recommendedUnits,
    recommendedUnitsCompactLabel:
      recommendedUnits === 'imperial' ? 'lb / in / oz' : 'kg / cm / ml',
    vaccinationRegionName: schedule.regionName,
    vaccinationScheduleName: schedule.scheduleName,
    vaccinationScheduleSource: schedule.source,
  };
};
