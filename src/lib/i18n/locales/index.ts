import type { LocaleCatalog } from './types';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import {
  ar,
  bn,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ru,
  sv,
  sw,
  th,
  tr,
  ur,
  vi,
  zh,
} from './additional';

export const translations: LocaleCatalog = {
  en,
  es,
  fr,
  de,
  it,
  pt,
  'pt-BR': pt,
  ja,
  zh,
  'zh-CN': zh,
  'zh-TW': zh,
  ar,
  hi,
  ko,
  ru,
  tr,
  nl,
  pl,
  sv,
  id,
  vi,
  th,
  bn,
  ur,
  sw,
};

export const FEATURED_LANGUAGE_CODES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'pt-BR',
  'ja',
  'zh',
  'zh-CN',
  'zh-TW',
  'ar',
  'hi',
  'ko',
  'ru',
  'tr',
  'nl',
  'pl',
  'sv',
  'id',
  'vi',
  'th',
  'bn',
  'ur',
  'sw',
] as const;

export function getTranslatedLanguageCodes(): string[] {
  return Object.keys(translations);
}
