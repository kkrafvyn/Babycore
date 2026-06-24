import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import {
  deriveSettingsFromCareProfile,
  getCareProfileBadges,
  getCareProfileSummary,
  normalizeCareProfile,
  type CareProfileRole,
} from '../../lib/care-profile';
import { i18nT } from '../../lib/i18n';
import type {
  CareProfileFeedingStyle,
  CareProfileHealthConsideration,
  CareProfilePreferences,
  CareProfilePriority,
  CareProfileStage,
  CareProfileSupportFocus,
} from '../../types';

interface CareProfileEditorModalProps {
  isOpen: boolean;
  role: CareProfileRole;
  initialProfile?: CareProfilePreferences | null;
  babyName?: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (profile: CareProfilePreferences) => Promise<void> | void;
}

const CARE_PROFILE_STAGE_OPTIONS: CareProfileStage[] = ['newborn', 'infant', 'toddler', 'preschool'];
const CARE_PROFILE_FEEDING_OPTIONS: CareProfileFeedingStyle[] = ['breastfeeding', 'bottle', 'mixed', 'solids'];
const CARE_PROFILE_PRIORITY_OPTIONS: CareProfilePriority[] = [
  'feeding',
  'sleep',
  'routine',
  'growth',
  'milestones',
  'medical',
];
const CARE_PROFILE_HEALTH_OPTIONS: CareProfileHealthConsideration[] = [
  'premature',
  'reflux',
  'allergies',
  'nicu',
  'multiple-birth',
];
const CARE_PROFILE_SUPPORT_OPTIONS: CareProfileSupportFocus[] = [
  'daily-logs',
  'handoff-updates',
  'medical-followups',
  'growth-review',
];

const toggleValue = <T extends string>(current: T[] | undefined, value: T): T[] => {
  const values = current || [];
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
};

export const CareProfileEditorModal: React.FC<CareProfileEditorModalProps> = ({
  isOpen,
  role,
  initialProfile,
  babyName,
  saving = false,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = React.useState<CareProfilePreferences>(() =>
    normalizeCareProfile(role, initialProfile),
  );

  React.useEffect(() => {
    if (isOpen) {
      setDraft(normalizeCareProfile(role, initialProfile));
    }
  }, [initialProfile, isOpen, role]);

  const normalizedProfile = React.useMemo(
    () => normalizeCareProfile(role, draft),
    [draft, role],
  );
  const careProfileSummary = React.useMemo(
    () => getCareProfileSummary(role, normalizedProfile),
    [normalizedProfile, role],
  );
  const careProfileBadges = React.useMemo(
    () => getCareProfileBadges(role, normalizedProfile),
    [normalizedProfile, role],
  );
  const personalizedDefaults = React.useMemo(
    () => deriveSettingsFromCareProfile(role, normalizedProfile),
    [normalizedProfile, role],
  );

  const stageOptions = CARE_PROFILE_STAGE_OPTIONS.map((stage) => ({
    value: stage,
    label:
      stage === 'newborn'
        ? i18nT('onboarding.stageNewborn', 'Newborn')
        : stage === 'infant'
          ? i18nT('onboarding.stageInfant', 'Infant')
          : stage === 'toddler'
            ? i18nT('onboarding.stageToddler', 'Toddler')
            : i18nT('onboarding.stagePreschool', 'Preschool'),
  }));

  const feedingOptions = CARE_PROFILE_FEEDING_OPTIONS.map((style) => ({
    value: style,
    label:
      style === 'breastfeeding'
        ? i18nT('onboarding.feedingBreast', 'Breastfeeding')
        : style === 'bottle'
          ? i18nT('onboarding.feedingBottle', 'Bottle feeding')
          : style === 'mixed'
            ? i18nT('onboarding.feedingMixed', 'Mixed feeding')
            : i18nT('onboarding.feedingSolids', 'Solids focus'),
  }));

  const priorityOptions = CARE_PROFILE_PRIORITY_OPTIONS.map((priority) => ({
    value: priority,
    label:
      priority === 'feeding'
        ? i18nT('onboarding.priorityFeeding', 'Feeding')
        : priority === 'sleep'
          ? i18nT('onboarding.prioritySleep', 'Sleep')
          : priority === 'routine'
            ? i18nT('onboarding.priorityRoutine', 'Routine')
            : priority === 'growth'
              ? i18nT('onboarding.priorityGrowth', 'Growth')
              : priority === 'milestones'
                ? i18nT('onboarding.priorityMilestones', 'Milestones')
                : i18nT('onboarding.priorityMedical', 'Medical'),
  }));

  const healthOptions = CARE_PROFILE_HEALTH_OPTIONS.map((item) => ({
    value: item,
    label:
      item === 'premature'
        ? i18nT('onboarding.healthPremature', 'Premature')
        : item === 'reflux'
          ? i18nT('onboarding.healthReflux', 'Reflux')
          : item === 'allergies'
            ? i18nT('onboarding.healthAllergies', 'Allergies')
            : item === 'nicu'
              ? i18nT('onboarding.healthNicu', 'NICU history')
              : i18nT('onboarding.healthMultipleBirth', 'Multiple birth'),
  }));

  const supportOptions = CARE_PROFILE_SUPPORT_OPTIONS.map((focus) => ({
    value: focus,
    label:
      focus === 'daily-logs'
        ? i18nT('onboarding.supportDailyLogs', 'Daily logs')
        : focus === 'handoff-updates'
          ? i18nT('onboarding.supportHandoffs', 'Handoff updates')
          : focus === 'medical-followups'
            ? i18nT('onboarding.supportMedical', 'Medical follow-ups')
            : i18nT('onboarding.supportGrowth', 'Growth review'),
  }));

  const title =
    role === 'doctor'
      ? 'Adjust doctor care focus'
      : role === 'caregiver'
        ? 'Adjust caregiver care focus'
        : `Adjust ${babyName || 'your baby'} care plan`;

  const subtitle =
    role === 'baby'
      ? 'Update the stage, feeding style, and priorities so Bud & Bloom can keep the daily rhythm aligned.'
      : 'Update the priorities and support areas that should stay at the center of this shared workflow.';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 80, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0.9 }}
            className="w-full max-w-4xl rounded-[2.4rem] border border-border-gray bg-surface p-5 shadow-2xl dark:border-zinc-800 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-light">
                  Care plan editor
                </p>
                <h3 className="mt-2 text-2xl font-headline font-black tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-text-dim">
                  {subtitle}
                </p>
              </div>
              <button
                onClick={onClose}
                title="Close care plan editor"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border-gray bg-surface-gray text-text-dim transition-colors hover:text-foreground dark:border-zinc-700 dark:bg-zinc-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
              <div className="space-y-5 rounded-[2rem] border border-border-gray bg-background/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 sm:p-5">
                {role === 'baby' && (
                  <>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                        {i18nT('onboarding.personalizeStage', 'Child Stage')}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        {stageOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                childStage: option.value,
                              }))
                            }
                            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                              normalizedProfile.childStage === option.value
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-border-gray bg-surface hover:border-secondary/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500/60'
                            }`}
                          >
                            <span className="block text-sm font-black text-foreground">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                        {i18nT('onboarding.personalizeFeedingStyle', 'Feeding Style')}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        {feedingOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                feedingStyle: option.value,
                              }))
                            }
                            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                              normalizedProfile.feedingStyle === option.value
                                ? 'border-secondary bg-secondary/10 shadow-sm'
                                : 'border-border-gray bg-surface hover:border-secondary/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500/60'
                            }`}
                          >
                            <span className="block text-sm font-black text-foreground">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                      {i18nT('onboarding.personalizePriorities', 'Top Priorities')}
                    </p>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
                      {(normalizedProfile.carePriorities || []).length} selected
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {priorityOptions.map((option) => {
                      const active = (normalizedProfile.carePriorities || []).includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              carePriorities: toggleValue(prev.carePriorities, option.value),
                            }))
                          }
                          className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                            active
                              ? 'border-secondary bg-secondary text-white shadow-sm'
                              : 'border-border-gray bg-surface text-text-dim hover:border-secondary hover:text-secondary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500 dark:hover:text-blue-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {role === 'baby' ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                        {i18nT('onboarding.personalizeHealthNotes', 'Health Notes')}
                      </p>
                      <span className="text-[10px] font-bold text-text-light">
                        {i18nT('onboarding.personalizeHealthOptional', 'Optional')}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {healthOptions.map((option) => {
                        const active = (normalizedProfile.healthConsiderations || []).includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                healthConsiderations: toggleValue(prev.healthConsiderations, option.value),
                              }))
                            }
                            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                              active
                                ? 'border-rose-300 bg-rose-50 text-rose-600 shadow-sm dark:border-rose-500/60 dark:bg-rose-900/20 dark:text-rose-200'
                                : 'border-border-gray bg-surface text-text-dim hover:border-rose-300 hover:text-rose-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-rose-500 dark:hover:text-rose-200'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                        {i18nT('onboarding.personalizeSupportFocus', 'Support Focus')}
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
                        {(normalizedProfile.supportFocus || []).length} selected
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {supportOptions.map((option) => {
                        const active = (normalizedProfile.supportFocus || []).includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                supportFocus: toggleValue(prev.supportFocus, option.value),
                              }))
                            }
                            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                              active
                                ? 'border-secondary bg-cyan-50 text-secondary shadow-sm dark:border-blue-500/60 dark:bg-cyan-900/20 dark:text-cyan-200'
                                : 'border-border-gray bg-surface text-text-dim hover:border-secondary hover:text-secondary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500 dark:hover:text-blue-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-[2rem] border border-border-gray bg-background/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 sm:p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
                    {i18nT('onboarding.personalizePreview', 'Your starter plan')}
                  </p>
                  <h4 className="mt-2 text-2xl font-headline font-black tracking-tight text-foreground">
                    {role === 'baby' ? 'Updated daily rhythm' : 'Updated care workflow'}
                  </h4>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-text-dim">
                    {careProfileSummary}
                  </p>
                </div>

                {careProfileBadges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {careProfileBadges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-surface-gray px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-text-dim dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid gap-3">
                  <div className="rounded-2xl bg-surface-gray/60 px-4 py-3 dark:bg-zinc-900">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                      {i18nT('onboarding.personalizeFeedInterval', 'Starter reminder rhythm')}
                    </p>
                    <p className="mt-1 text-base font-black text-foreground">
                      {personalizedDefaults.feedingInterval}h{' '}
                      {i18nT('onboarding.personalizeFeedIntervalSuffix', 'feeding interval')}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-surface-gray/60 px-4 py-3 dark:bg-zinc-900">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-light">
                      {i18nT('onboarding.personalizeEnabledAlerts', 'Enabled alerts')}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-text-dim">
                      {[
                        personalizedDefaults.reminderPreferences?.feeding
                          ? i18nT('onboarding.priorityFeeding', 'Feeding')
                          : null,
                        personalizedDefaults.reminderPreferences?.sleep
                          ? i18nT('onboarding.prioritySleep', 'Sleep')
                          : null,
                        personalizedDefaults.reminderPreferences?.growth
                          ? i18nT('onboarding.priorityGrowth', 'Growth')
                          : null,
                        personalizedDefaults.reminderPreferences?.medication
                          ? i18nT('onboarding.priorityMedical', 'Medical')
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' / ')}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-border-gray px-4 py-3 dark:border-zinc-700">
                  <p className="text-xs font-semibold leading-relaxed text-text-dim">
                    Saving this plan refreshes your recommended reminder defaults so the dashboard matches the new care focus.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border-gray px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-text-dim transition-colors hover:text-foreground dark:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void onSave(normalizedProfile)}
                className="rounded-full bg-secondary px-6 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Care Plan'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
