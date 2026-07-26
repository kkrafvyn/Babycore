import React from 'react';

import { isStaleChunkLoadError, reloadAfterStaleChunk } from './chunk-reload';

export const lazyNamed = <TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) =>
  React.lazy(async () => {
    try {
      const module = await loader();
      const component = module[exportName];

      if (!component) {
        throw new Error(`Missing export "${String(exportName)}" in lazy-loaded module`);
      }

      return { default: component as React.ComponentType<any> };
    } catch (error) {
      if (isStaleChunkLoadError(error)) {
        reloadAfterStaleChunk();
      }

      throw error;
    }
  });
