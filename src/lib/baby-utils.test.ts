import { describe, expect, it } from 'vitest';

import {
  WHO_WEIGHT_BOYS,
  getGrowthStandardData,
  getPercentile,
} from './baby-utils';

describe('baby-utils growth standards', () => {
  it('uses WHO data for infant CDC requests', () => {
    expect(getGrowthStandardData('weight', 'boy', 'CDC')).toEqual(WHO_WEIGHT_BOYS);
  });

  it('returns the same percentile band for WHO and CDC in the infant chart range', () => {
    const whoPercentile = getPercentile(7.9, 6, 'weight', 'boy', 'WHO');
    const cdcPercentile = getPercentile(7.9, 6, 'weight', 'boy', 'CDC');

    expect(cdcPercentile).toBe(whoPercentile);
  });
});
