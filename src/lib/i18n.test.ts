import { describe, expect, it } from 'vitest';
import {
  FEATURED_LANGUAGE_CODES,
  getFeaturedLanguageOptions,
  getLanguageDisplayName,
  getTranslatedLanguageCodes,
  i18nInstance,
  isRtlLanguage,
} from './i18n';

describe('i18n locales', () => {
  it('includes translated bundles for featured languages', () => {
    const translated = new Set(getTranslatedLanguageCodes());

    for (const code of FEATURED_LANGUAGE_CODES) {
      expect(translated.has(code)).toBe(true);
    }
  });

  it('returns localized strings for supported languages', () => {
    i18nInstance.setLanguage('es');
    expect(i18nInstance.t('settings.language')).toBe('Idioma');

    i18nInstance.setLanguage('ja');
    expect(i18nInstance.t('screens.settings')).not.toBe('Settings');

    i18nInstance.setLanguage('ar');
    expect(isRtlLanguage('ar')).toBe(true);
    expect(i18nInstance.t('settings.language')).not.toBe('Language');

    i18nInstance.setLanguage('en');
  });

  it('falls back to English for missing keys', () => {
    i18nInstance.setLanguage('fr');
    expect(i18nInstance.t('settings.language')).toBe('Langue');
    expect(i18nInstance.t('common.refresh', 'Refresh')).toBe('Refresh');
  });

  it('lists featured language options with native names', () => {
    const options = getFeaturedLanguageOptions('hi');
    expect(options.some((option) => option.code === 'hi')).toBe(true);
    expect(getLanguageDisplayName('hi')).toBeTruthy();
  });
});
