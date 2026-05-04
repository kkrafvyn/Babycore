import { describe, expect, it } from 'vitest';

import { getPaystackLocationConfig } from './payment-manager';

describe('payment-manager location rules', () => {
  it('keeps Ghana checkouts in GHS with local payment channels', () => {
    expect(getPaystackLocationConfig('GH')).toEqual({
      currency: 'GHS',
      channels: ['card', 'mobile_money', 'bank'],
    });
  });

  it('uses USD and card-only checkout for countries outside Ghana', () => {
    for (const countryCode of ['US', 'NG', 'KE', 'ZA', 'UG']) {
      expect(getPaystackLocationConfig(countryCode)).toEqual({
        currency: 'USD',
        channels: ['card'],
      });
    }
  });
});
