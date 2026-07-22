import type { LocaleBundle } from './types';
import { en } from './en';

export function cloneLocale(
  overrides: Partial<Record<string, Record<string, string>>>,
): LocaleBundle {
  const base = structuredClone(en) as LocaleBundle;

  for (const [namespace, keys] of Object.entries(overrides)) {
    base[namespace] = {
      ...(base[namespace] as Record<string, string>),
      ...keys,
    };
  }

  return base;
}

export function defineLocale(
  overrides: Partial<Record<string, Record<string, string>>>,
): LocaleBundle {
  return cloneLocale(overrides);
}
