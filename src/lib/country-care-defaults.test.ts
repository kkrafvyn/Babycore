import { describe, expect, it } from 'vitest';
import { getCountryCareDefaults, getDefaultUnitsForCountry } from './country-care-defaults';

describe('country-care-defaults', () => {
  it('uses imperial defaults for the United States', () => {
    expect(getDefaultUnitsForCountry('US')).toBe('imperial');
    expect(getCountryCareDefaults('US')).toMatchObject({
      countryCode: 'US',
      recommendedUnits: 'imperial',
      recommendedUnitsCompactLabel: 'lb / in / oz',
    });
  });

  it('uses metric defaults for non-imperial countries', () => {
    expect(getDefaultUnitsForCountry('FR')).toBe('metric');
    expect(getCountryCareDefaults('FR')).toMatchObject({
      countryCode: 'FR',
      recommendedUnits: 'metric',
      recommendedUnitsCompactLabel: 'kg / cm / ml',
    });
  });

  it('normalizes invalid or missing country codes to the default country', () => {
    expect(getCountryCareDefaults('')).toMatchObject({
      countryCode: 'US',
      recommendedUnits: 'imperial',
    });
    expect(getCountryCareDefaults('??')).toMatchObject({
      countryCode: 'US',
      recommendedUnits: 'imperial',
    });
  });
});
