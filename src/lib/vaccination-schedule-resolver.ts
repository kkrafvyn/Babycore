import { getScheduleByCountry, VACCINATION_SCHEDULES, type VaccineSchedule } from './vaccination-data';

export type VaccinationRegionCode =
  | 'AFRICA'
  | 'ASIA'
  | 'EUROPE'
  | 'MIDDLE_EAST'
  | 'NORTH_AMERICA'
  | 'SOUTH_AMERICA'
  | 'OCEANIA'
  | 'GLOBAL';

export interface ResolvedVaccinationSchedule {
  countryCode: string;
  regionCode: VaccinationRegionCode;
  regionName: string;
  scheduleCode: string;
  scheduleName: string;
  schedules: VaccineSchedule[];
  source: 'country' | 'region' | 'global';
}

export const VACCINATION_REGION_NAMES: Record<VaccinationRegionCode, string> = {
  AFRICA: 'Africa',
  ASIA: 'Asia',
  EUROPE: 'Europe',
  MIDDLE_EAST: 'Middle East',
  NORTH_AMERICA: 'North America',
  SOUTH_AMERICA: 'South America',
  OCEANIA: 'Oceania',
  GLOBAL: 'Global',
};

const REGION_COUNTRIES: Record<VaccinationRegionCode, Set<string>> = {
  AFRICA: new Set([
    'DZ',
    'AO',
    'BJ',
    'BW',
    'BF',
    'BI',
    'CM',
    'CV',
    'CF',
    'TD',
    'KM',
    'CG',
    'CD',
    'CI',
    'DJ',
    'EG',
    'GQ',
    'ER',
    'SZ',
    'ET',
    'GA',
    'GM',
    'GH',
    'GN',
    'GW',
    'KE',
    'LS',
    'LR',
    'LY',
    'MG',
    'MW',
    'ML',
    'MR',
    'MU',
    'YT',
    'MA',
    'MZ',
    'NA',
    'NE',
    'NG',
    'RW',
    'RE',
    'SH',
    'SN',
    'SC',
    'SL',
    'SO',
    'ST',
    'ZA',
    'SS',
    'SD',
    'TZ',
    'TG',
    'TN',
    'UG',
    'EH',
    'ZM',
    'ZW',
  ]),
  ASIA: new Set([
    'AF',
    'AM',
    'AZ',
    'BD',
    'BT',
    'BN',
    'KH',
    'CN',
    'HK',
    'MO',
    'GE',
    'IN',
    'ID',
    'JP',
    'KZ',
    'KG',
    'LA',
    'MY',
    'MV',
    'MN',
    'MM',
    'NP',
    'KP',
    'KR',
    'PK',
    'PH',
    'SG',
    'LK',
    'TW',
    'TJ',
    'TH',
    'TL',
    'TM',
    'UZ',
    'VN',
    'IO',
  ]),
  EUROPE: new Set([
    'AL',
    'AD',
    'AT',
    'BY',
    'BE',
    'BA',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FO',
    'FI',
    'FR',
    'DE',
    'GI',
    'GR',
    'VA',
    'HU',
    'IS',
    'IE',
    'IM',
    'IT',
    'JE',
    'LV',
    'LI',
    'LT',
    'LU',
    'MT',
    'MD',
    'MC',
    'ME',
    'NL',
    'MK',
    'NO',
    'PL',
    'PT',
    'RO',
    'RU',
    'SM',
    'RS',
    'SK',
    'SI',
    'ES',
    'SJ',
    'SE',
    'CH',
    'UA',
    'GB',
    'GG',
    'AX',
  ]),
  MIDDLE_EAST: new Set([
    'BH',
    'IR',
    'IQ',
    'IL',
    'JO',
    'KW',
    'LB',
    'OM',
    'PS',
    'QA',
    'SA',
    'SY',
    'TR',
    'AE',
    'YE',
  ]),
  NORTH_AMERICA: new Set([
    'AG',
    'BS',
    'BB',
    'BZ',
    'BM',
    'CA',
    'CR',
    'CU',
    'DM',
    'DO',
    'SV',
    'GL',
    'GD',
    'GP',
    'GT',
    'HT',
    'HN',
    'JM',
    'MQ',
    'MX',
    'NI',
    'PA',
    'PR',
    'KN',
    'LC',
    'VC',
    'TT',
    'TC',
    'US',
    'VG',
    'VI',
    'KY',
    'CW',
    'SX',
    'AW',
    'AI',
    'MS',
    'BL',
    'MF',
    'PM',
    'BQ',
  ]),
  SOUTH_AMERICA: new Set([
    'AR',
    'BO',
    'BR',
    'CL',
    'CO',
    'EC',
    'FK',
    'GF',
    'GY',
    'PY',
    'PE',
    'SR',
    'UY',
    'VE',
    'GS',
  ]),
  OCEANIA: new Set([
    'AS',
    'AU',
    'CK',
    'FJ',
    'PF',
    'GU',
    'KI',
    'MH',
    'FM',
    'NR',
    'NC',
    'NZ',
    'NU',
    'NF',
    'MP',
    'PW',
    'PG',
    'PN',
    'WS',
    'SB',
    'TK',
    'TO',
    'TV',
    'UM',
    'VU',
    'WF',
    'CX',
    'CC',
    'HM',
  ]),
  GLOBAL: new Set(),
};

const REGION_DEFAULT_SCHEDULE: Record<VaccinationRegionCode, string> = {
  AFRICA: 'WHO',
  ASIA: 'WHO',
  EUROPE: 'GB',
  MIDDLE_EAST: 'WHO',
  NORTH_AMERICA: 'US',
  SOUTH_AMERICA: 'WHO',
  OCEANIA: 'AU',
  GLOBAL: 'WHO',
};

export const normalizeCountryCode = (value?: string): string => {
  const cleaned = (value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cleaned) ? cleaned : 'WHO';
};

export const resolveRegionByCountry = (countryCode?: string): VaccinationRegionCode => {
  const normalized = normalizeCountryCode(countryCode);

  const region = (Object.keys(REGION_COUNTRIES) as VaccinationRegionCode[]).find(
    (key) => key !== 'GLOBAL' && REGION_COUNTRIES[key].has(normalized),
  );

  return region || 'GLOBAL';
};

export const resolveVaccinationSchedule = (countryCode?: string): ResolvedVaccinationSchedule => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const regionCode = resolveRegionByCountry(normalizedCountryCode);
  const countrySchedule = VACCINATION_SCHEDULES.find((schedule) => schedule.code === normalizedCountryCode);

  if (countrySchedule) {
    return {
      countryCode: normalizedCountryCode,
      regionCode,
      regionName: VACCINATION_REGION_NAMES[regionCode],
      scheduleCode: countrySchedule.code,
      scheduleName: countrySchedule.name,
      schedules: countrySchedule.schedules,
      source: 'country',
    };
  }

  const regionFallbackCode = REGION_DEFAULT_SCHEDULE[regionCode];
  const regionFallbackSchedule = VACCINATION_SCHEDULES.find((schedule) => schedule.code === regionFallbackCode);

  if (regionFallbackSchedule) {
    return {
      countryCode: normalizedCountryCode,
      regionCode,
      regionName: VACCINATION_REGION_NAMES[regionCode],
      scheduleCode: regionFallbackSchedule.code,
      scheduleName: regionFallbackSchedule.name,
      schedules: regionFallbackSchedule.schedules,
      source: regionCode === 'GLOBAL' ? 'global' : 'region',
    };
  }

  const defaultSchedule = getScheduleByCountry('WHO');
  return {
    countryCode: normalizedCountryCode,
    regionCode,
    regionName: VACCINATION_REGION_NAMES[regionCode],
    scheduleCode: 'WHO',
    scheduleName: 'WHO Global',
    schedules: defaultSchedule,
    source: 'global',
  };
};

export const getVaccinationRegionForCountry = (
  countryCode?: string,
): { regionCode: VaccinationRegionCode; regionName: string } => {
  const regionCode = resolveRegionByCountry(countryCode);
  return {
    regionCode,
    regionName: VACCINATION_REGION_NAMES[regionCode],
  };
};
