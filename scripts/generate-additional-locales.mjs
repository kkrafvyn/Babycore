import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { locales as part1 } from './locale-data/translations-part1.mjs';
import { locales as part2 } from './locale-data/translations-part2.mjs';
import { locales as part3 } from './locale-data/translations-part3.mjs';
import { locales as part4 } from './locale-data/translations-part4.mjs';
import { locales as part5 } from './locale-data/translations-part5.mjs';
import { locales as part6 } from './locale-data/translations-part6.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(rootDir, 'src/lib/i18n/locales/additional.ts');

const schema = {
  common: [
    'appName',
    'loading',
    'error',
    'success',
    'cancel',
    'confirm',
    'delete',
    'edit',
    'add',
    'back',
    'next',
    'save',
    'update',
    'details',
    'payNow',
    'processing',
    'refresh',
    'selectLanguage',
    'languageSaved',
    'moreLanguages',
    'searchLanguages',
  ],
  screens: [
    'dashboard',
    'sleep',
    'feeding',
    'diaper',
    'growth',
    'vaccination',
    'settings',
    'journal',
    'milestones',
    'logs',
    'payment',
    'premium',
  ],
  dashboard: [
    'greeting',
    'greetingAfternoon',
    'greetingEvening',
    'latestVitals',
    'quickLog',
    'active',
    'sleeping',
    'noSession',
    'noFeed',
    'noChange',
  ],
  journal: ['memories', 'guides', 'newMoment', 'preserve', 'search', 'emptyState'],
  milestones: ['title', 'newArchive', 'recordFirst', 'narrative'],
  settings: [
    'units',
    'theme',
    'language',
    'notifications',
    'export',
    'premium',
    'logout',
    'family',
    'preferences',
    'editBaby',
    'pushEnabled',
    'pushDisabled',
    'quietHours',
    'subscribe',
  ],
  payment: ['title', 'payNow', 'processing', 'secure', 'secureNotice', 'fillRequired'],
  public: [
    'tagline',
    'badge',
    'heroBody',
    'nursingMoments',
    'nurtureFirst',
    'nurtureFirstBody',
    'beginJourney',
    'alreadyTracking',
    'beforeYouStart',
    'signIn',
    'privacyTermsPolicies',
    'privacyPolicy',
    'termsOfService',
    'highlightSleep',
    'highlightFeed',
    'highlightSecure',
    'highlightSynced',
    'highlightReady',
    'highlightPrivate',
  ],
  auth: [
    'welcomeBack',
    'joinApp',
    'identityVerification',
    'provisionAccess',
    'continueAfterSignIn',
    'registryEmail',
    'emailPlaceholder',
    'accessKey',
    'passwordPlaceholder',
    'authorizing',
    'signInAction',
    'createAccountAction',
    'accountCreated',
    'authFailed',
    'socialAuthFailed',
    'continueWith',
  ],
  onboarding: [
    'titleLineOne',
    'titleLineTwo',
    'subtitle',
    'stepCounter',
    'skipToLogin',
    'previous',
    'back',
    'next',
    'continue',
    'continueToLogin',
    'countryTitle',
    'countrySubtitle',
    'countrySearch',
    'countryDontSee',
    'countryContactSupport',
    'countryNoMatchTitle',
    'countryNoMatchBody',
    'editorialTagline',
    'editorialCopyright',
    'guidanceUnits',
    'guidanceVaccines',
    'guidanceCoverage',
    'guidanceCountrySource',
    'guidanceRegionSource',
    'guidanceGlobalSource',
    'welcomeFeatureSleepTitle',
    'welcomeFeatureSleepBody',
    'welcomeFeatureFeedingTitle',
    'welcomeFeatureFeedingBody',
    'welcomeFeatureGrowthTitle',
    'welcomeFeatureGrowthBody',
    'unitsTitle',
    'unitsSubtitle',
    'unitsMetric',
    'unitsImperial',
    'unitsCountryDefault',
    'unitsUseDefault',
    'notificationsTitle',
    'notificationsSubtitle',
    'notificationsCardTitle',
    'notificationsCardSubtitle',
    'remindersFeeding',
    'remindersSleep',
    'remindersHealth',
    'remindersGrowth',
    'completeTitle',
    'completeBaby',
    'completeDoctor',
    'completeCaregiver',
    'summaryCountry',
    'summaryUnits',
    'summaryAlerts',
    'summaryDoctor',
    'summaryCaregiver',
    'summaryBaby',
    'summarySpecialty',
    'summaryRelationship',
    'alertsEnabled',
    'alertsDisabled',
    'roleBaby',
    'roleDoctor',
    'roleCaregiver',
    'babyTitle',
    'babyDescription',
    'babyHelper',
    'babyNote',
    'doctorTitle',
    'doctorDescription',
    'doctorHelper',
    'doctorNote',
    'caregiverTitle',
    'caregiverDescription',
    'caregiverHelper',
    'caregiverNote',
    'tapToAddPhoto',
    'profilePreview',
    'babyName',
    'babyNamePlaceholder',
    'babyDob',
    'genderOptional',
    'genderGirl',
    'genderBoy',
    'genderSurprise',
    'doctorName',
    'doctorNamePlaceholder',
    'doctorSpecialty',
    'doctorSpecialtyPlaceholder',
    'caregiverName',
    'caregiverNamePlaceholder',
    'caregiverRelationship',
    'createProfile',
    'growthTrackingNote',
  ],
};

const locales = { ...part1, ...part2, ...part3, ...part4, ...part5, ...part6 };

const escape = (value) =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');

const formatNamespace = (keys, values, indent = 4) => {
  const pad = ' '.repeat(indent);
  const lines = keys.map((key, index) => `${pad}${key}: '${escape(values[index])}',`);
  return `{\n${lines.join('\n')}\n${' '.repeat(indent - 2)}}`;
};

const formatLocale = (code, data) => {
  const lines = Object.entries(schema).map(
    ([namespace, keys]) => `  ${namespace}: ${formatNamespace(keys, data[namespace], 4)},`,
  );
  return `export const ${code} = defineLocale({\n${lines.join('\n')}\n});`;
};

let content = "import { defineLocale } from './factory';\n\n";
for (const [code, data] of Object.entries(locales)) {
  for (const [namespace, keys] of Object.entries(schema)) {
    if (!data[namespace] || data[namespace].length !== keys.length) {
      throw new Error(`${code}.${namespace} expected ${keys.length} values, got ${data[namespace]?.length ?? 0}`);
    }
  }
  content += `${formatLocale(code, data)}\n\n`;
}

fs.writeFileSync(outPath, content, 'utf8');
console.log(`Wrote ${outPath} (${Object.keys(locales).length} locales)`);
