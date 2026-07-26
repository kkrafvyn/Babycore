import { describe, expect, it } from 'vitest';

import { isStaleChunkLoadError } from './chunk-reload';

describe('chunk-reload', () => {
  it('detects MIME type chunk failures', () => {
    expect(
      isStaleChunkLoadError(
        'Loading module from "https://www.cradlyn.com/assets/DiaperLog-CeRGk-iB.js" was blocked because of a disallowed MIME type ("text/plain").',
      ),
    ).toBe(true);
  });

  it('detects missing lazy export crashes', () => {
    expect(
      isStaleChunkLoadError(`can't access property "DiaperLogScreen" of undefined`),
    ).toBe(true);
  });
});
