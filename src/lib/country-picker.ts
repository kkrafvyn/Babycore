import { COUNTRIES } from './countries';
import {
  getVaccinationRegionForCountry,
  VACCINATION_REGION_NAMES,
  type VaccinationRegionCode,
} from './vaccination-schedule-resolver';

export interface CountryPickerOption {
  code: string;
  flagUrl: string | null;
  name: string;
  regionCode: VaccinationRegionCode;
  regionName: string;
}

export const POPULAR_COUNTRY_CODES = [
  'US',
  'GB',
  'CA',
  'AU',
  'DE',
  'FR',
  'NG',
  'IN',
  'BR',
  'MX',
  'ZA',
  'KE',
  'PH',
  'AE',
  'ES',
  'IT',
  'GH',
  'IE',
  'NZ',
] as const;

export const COUNTRY_REGION_TAB_ORDER: VaccinationRegionCode[] = [
  'NORTH_AMERICA',
  'SOUTH_AMERICA',
  'EUROPE',
  'AFRICA',
  'ASIA',
  'MIDDLE_EAST',
  'OCEANIA',
];

const countryCodeSet = new Set(COUNTRIES.map((country) => country.code));

export const decodeLegacyUtf8 = (value: string): string => {
  if (!/[\u00C3\u00E2]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return value;
  }
};

export const getCountryFlagUrl = (countryCode: string): string | null => {
  const normalizedCode = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return null;
  }

  return `https://flagcdn.com/${normalizedCode.toLowerCase()}.svg`;
};

export const buildCountryPickerOptions = (): CountryPickerOption[] =>
  (COUNTRIES as Array<{ code: string; name: string }>)
    .map((country) => {
      const { regionCode, regionName } = getVaccinationRegionForCountry(country.code);
      return {
        code: country.code,
        flagUrl: getCountryFlagUrl(country.code),
        name: decodeLegacyUtf8(country.name),
        regionCode,
        regionName,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

export const guessUserCountryCode = (): string | null => {
  try {
    const locales = navigator.languages?.length ? navigator.languages : [navigator.language];

    for (const locale of locales) {
      if (!locale) continue;

      const parts = locale.split('-');
      const region = parts[parts.length - 1]?.toUpperCase();

      if (region && /^[A-Z]{2}$/.test(region) && countryCodeSet.has(region)) {
        return region;
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const getRegionTabLabel = (regionCode: VaccinationRegionCode): string =>
  VACCINATION_REGION_NAMES[regionCode];

export const sortCountriesForDisplay = (
  countries: CountryPickerOption[],
  options?: { searchQuery?: string; prioritizeCodes?: readonly string[] },
): CountryPickerOption[] => {
  const query = options?.searchQuery?.trim().toLowerCase() ?? '';

  if (query) {
    return countries
      .filter(
        (country) =>
          country.name.toLowerCase().includes(query) ||
          country.code.toLowerCase().includes(query) ||
          country.regionName.toLowerCase().includes(query),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  const prioritize = options?.prioritizeCodes ?? POPULAR_COUNTRY_CODES;
  const prioritized = prioritize
    .map((code) => countries.find((country) => country.code === code))
    .filter((country): country is CountryPickerOption => Boolean(country));
  const prioritizedCodes = new Set(prioritized.map((country) => country.code));
  const rest = countries
    .filter((country) => !prioritizedCodes.has(country.code))
    .sort((left, right) => left.name.localeCompare(right.name));

  return [...prioritized, ...rest];
};
