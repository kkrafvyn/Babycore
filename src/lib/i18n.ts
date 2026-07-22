/**
 * i18n (Internationalization) Module
 * Handles multi-language support, locale-aware formatting, and directionality.
 */

import {
  FEATURED_LANGUAGE_CODES,
  getTranslatedLanguageCodes,
  translations,
} from './i18n/locales';

export { FEATURED_LANGUAGE_CODES, getTranslatedLanguageCodes } from './i18n/locales';

export type SupportedLanguage = string;
export type Unit = 'metric' | 'imperial';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  badge: string;
}

const DEFAULT_LANGUAGE = 'en';
const RTL_LANGUAGE_PREFIXES = new Set(['ar', 'dv', 'fa', 'he', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi']);
const COMMON_LANGUAGE_CODES = [
  'ar',
  'am',
  'bg',
  'bn',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'en-GB',
  'en-US',
  'es',
  'es-419',
  'et',
  'fa',
  'fi',
  'fil',
  'fr',
  'gu',
  'he',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'kn',
  'ko',
  'lt',
  'lv',
  'ml',
  'mr',
  'ms',
  'nl',
  'no',
  'pa',
  'pl',
  'pt',
  'pt-BR',
  'pt-PT',
  'ro',
  'ru',
  'sk',
  'sl',
  'sr',
  'sv',
  'sw',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'ur',
  'vi',
  'zh',
  'zh-CN',
  'zh-HK',
  'zh-TW',
] as const;


const normalizeLanguageCodeInternal = (language: string | null | undefined): string => {
  if (!language) {
    return DEFAULT_LANGUAGE;
  }

  const candidate = language.trim().replace(/_/g, '-');
  if (!candidate) {
    return DEFAULT_LANGUAGE;
  }

  try {
    return new Intl.Locale(candidate).toString();
  } catch {
    return candidate;
  }
};

const getBaseLanguage = (language: string): string =>
  normalizeLanguageCodeInternal(language).split('-')[0].toLowerCase();

const getLanguageLookupChain = (language: string): string[] => {
  const normalized = normalizeLanguageCodeInternal(language);
  const baseLanguage = getBaseLanguage(normalized);
  return [...new Set([normalized, normalized.toLowerCase(), baseLanguage, DEFAULT_LANGUAGE])];
};

const isValidLocaleCodeInternal = (language: string): boolean => {
  try {
    new Intl.Locale(language);
    return true;
  } catch {
    return false;
  }
};

const getSafeFormattingLocale = (language: string): string =>
  isValidLocaleCodeInternal(language) ? normalizeLanguageCodeInternal(language) : DEFAULT_LANGUAGE;

const getDisplayNameForLanguage = (language: string, displayLocale: string): string => {
  const normalized = normalizeLanguageCodeInternal(language);
  const baseLanguage = getBaseLanguage(normalized);

  try {
    const displayNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
    return displayNames.of(baseLanguage) || normalized;
  } catch {
    return normalized;
  }
};

const getLanguageBadge = (language: string): string => {
  const normalized = normalizeLanguageCodeInternal(language);
  const locale = new Intl.Locale(normalized);
  const region = locale.region;
  if (region) {
    return region.toUpperCase();
  }

  const baseLanguage = getBaseLanguage(normalized);
  return baseLanguage.slice(0, 2).toUpperCase();
};

const getBrowserLanguageInternal = (): string => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const candidates = [...(navigator.languages || []), navigator.language];
  for (const candidate of candidates) {
    const normalized = normalizeLanguageCodeInternal(candidate);
    if (isValidLocaleCodeInternal(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_LANGUAGE;
};

const applyDocumentLanguageAttributes = (language: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const normalized = getSafeFormattingLocale(language);
  document.documentElement.lang = normalized;
  document.documentElement.dir = RTL_LANGUAGE_PREFIXES.has(getBaseLanguage(normalized)) ? 'rtl' : 'ltr';
};

export const normalizeLanguageCode = (language: string | null | undefined): string =>
  normalizeLanguageCodeInternal(language);

export const isValidLocaleCode = (language: string): boolean => isValidLocaleCodeInternal(language);

export const isRtlLanguage = (language: string): boolean =>
  RTL_LANGUAGE_PREFIXES.has(getBaseLanguage(language));

export const getBrowserLanguage = (): string => getBrowserLanguageInternal();

export const getLanguageDisplayName = (
  language: string,
  displayLocale = DEFAULT_LANGUAGE,
): string => getDisplayNameForLanguage(language, getSafeFormattingLocale(displayLocale));

export const getLanguageNativeName = (language: string): string =>
  getDisplayNameForLanguage(language, getSafeFormattingLocale(language));

export const getLanguageOptions = (query = '', includeLanguage?: string): LanguageOption[] => {
  const queryValue = query.trim().toLowerCase();
  const current = includeLanguage || getBrowserLanguageInternal();
  const candidates = new Set<string>([
    ...FEATURED_LANGUAGE_CODES,
    ...getTranslatedLanguageCodes(),
    ...COMMON_LANGUAGE_CODES,
    current,
    ...(typeof navigator !== 'undefined' ? navigator.languages || [] : []),
  ]);

  return [...candidates]
    .map((code) => normalizeLanguageCodeInternal(code))
    .filter((code, index, array) => array.indexOf(code) === index)
    .map((code) => ({
      code,
      name: getLanguageDisplayName(code, DEFAULT_LANGUAGE),
      nativeName: getLanguageNativeName(code),
      badge: getLanguageBadge(code),
    }))
    .filter((option) => {
      if (!queryValue) {
        return true;
      }

      return [option.code, option.name, option.nativeName].some((value) =>
        value.toLowerCase().includes(queryValue),
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getFeaturedLanguageOptions = (includeLanguage?: string): LanguageOption[] => {
  const featured = new Set<string>([
    ...FEATURED_LANGUAGE_CODES,
    ...(includeLanguage ? [normalizeLanguageCodeInternal(includeLanguage)] : []),
  ]);

  return getLanguageOptions('', includeLanguage).filter((option) => featured.has(option.code));
};

class i18n {
  private currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
  private currentUnit: Unit = 'metric';

  constructor() {
    this.loadSettings();
    applyDocumentLanguageAttributes(this.currentLanguage);
  }

  private emit(eventName: string, detail: Record<string, unknown>): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  setLanguage(lang: SupportedLanguage): void {
    const normalized = normalizeLanguageCodeInternal(lang);
    this.currentLanguage = normalized;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('babylog_language', normalized);
    }

    applyDocumentLanguageAttributes(normalized);
    this.emit('languageChanged', { language: normalized });
  }

  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  setUnit(unit: Unit): void {
    this.currentUnit = unit;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('babylog_units', unit);
    }

    this.emit('unitsChanged', { unit });
  }

  getUnit(): Unit {
    return this.currentUnit;
  }

  t(key: string, defaultValue?: string): string {
    const [namespace, ...path] = key.split('.');

    for (const candidateLanguage of getLanguageLookupChain(this.currentLanguage)) {
      let value: unknown = translations[candidateLanguage]?.[namespace];

      for (const segment of path) {
        value = (value as Record<string, unknown> | undefined)?.[segment];
      }

      if (typeof value === 'string') {
        return value;
      }
    }

    return defaultValue || key;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat(getSafeFormattingLocale(this.currentLanguage), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat(getSafeFormattingLocale(this.currentLanguage), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatNumber(value: number, decimals = 0): string {
    return new Intl.NumberFormat(getSafeFormattingLocale(this.currentLanguage), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  convertWeight(kg: number): { value: number; unit: 'kg' | 'lb' } {
    if (this.currentUnit === 'imperial') {
      return { value: parseFloat((kg * 2.20462).toFixed(1)), unit: 'lb' };
    }

    return { value: parseFloat(kg.toFixed(1)), unit: 'kg' };
  }

  convertLength(cm: number): { value: number; unit: 'cm' | 'in' } {
    if (this.currentUnit === 'imperial') {
      return { value: parseFloat((cm / 2.54).toFixed(1)), unit: 'in' };
    }

    return { value: parseFloat(cm.toFixed(1)), unit: 'cm' };
  }

  convertVolume(ml: number): { value: number; unit: 'ml' | 'oz' } {
    if (this.currentUnit === 'imperial') {
      return { value: parseFloat((ml / 29.5735).toFixed(1)), unit: 'oz' };
    }

    return { value: parseFloat(ml.toFixed(0)), unit: 'ml' };
  }

  getUnitSystem(): Unit {
    return this.currentUnit;
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') {
      this.currentLanguage = DEFAULT_LANGUAGE;
      return;
    }

    const savedLang = localStorage.getItem('babylog_language');
    const savedUnit = localStorage.getItem('babylog_units') as Unit | null;

    this.currentLanguage = savedLang
      ? normalizeLanguageCodeInternal(savedLang)
      : getBrowserLanguageInternal();

    if (savedUnit) {
      this.currentUnit = savedUnit;
    }
  }
}

export const i18nInstance = new i18n();
export const i18nT = (key: string, defaultValue?: string) => i18nInstance.t(key, defaultValue);
