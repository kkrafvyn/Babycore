import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Download,
  Link2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import {
  createEmergencyShareLink,
  downloadEmergencyShareCardPdf,
  getEmergencyShareCard,
  getEmergencyShareLinks,
  revokeEmergencyShareLink,
  type EmergencyShareCardResponse,
  type EmergencyShareLinkResponse,
  type EmergencyShareLinkSummary,
  type EmergencyShareSection,
} from '@/lib/care-advanced-api';
import {
  EMERGENCY_SHARE_PRESETS,
  formatEmergencyGrowthSummary,
  type EmergencySharePresetKey,
  type EmergencyShareRiskLevel,
} from '@/lib/emergency-share-utils';
import {
  buildEmergencyHealthCard,
  formatEmergencyHealthCard,
  type EmergencyHealthCard,
} from '@/lib/emergency-health-card-service';
import {
  clearOfflineEmergencyCardSnapshot,
  getOfflineEmergencyCardSnapshot,
  saveOfflineEmergencyCardSnapshot,
  type OfflineEmergencyCardSnapshot,
} from '@/lib/offline-emergency-card';

interface EmergencyShareCardProps {
  babyId: string;
  babyName: string;
}

type ShareHistoryFilter = 'all' | 'active' | 'expired' | 'revoked' | 'view_limit_reached';

const EMERGENCY_SHARE_SECTIONS: Array<{ value: EmergencyShareSection; label: string }> = [
  { value: 'demographics', label: 'Identity' },
  { value: 'allergies', label: 'Allergies' },
  { value: 'medications', label: 'Medications' },
  { value: 'growth', label: 'Growth' },
  { value: 'vaccines', label: 'Vaccines' },
  { value: 'doctor_contacts', label: 'Doctors' },
];

const PRESET_OPTIONS = Object.values(EMERGENCY_SHARE_PRESETS);

function valueToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function formatTimestamp(value?: string | null): string {
  if (!value) return 'Not yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function formatDurationLabel(value?: number | null): string {
  if (!value || value <= 0) return 'Custom window';
  if (value % (24 * 60) === 0) return `${Math.round(value / (24 * 60))}d`;
  if (value % 60 === 0) return `${Math.round(value / 60)}h`;
  return `${value}m`;
}

function formatLinkStatus(status: EmergencyShareLinkSummary['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'revoked':
      return 'Revoked';
    case 'view_limit_reached':
      return 'Limit reached';
    default:
      return 'Unknown';
  }
}

function getLinkStatusClass(status: EmergencyShareLinkSummary['status']): string {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300';
    case 'revoked':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300';
    case 'expired':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300';
    default:
      return 'border-border-gray bg-surface-gray text-text-dim dark:border-zinc-700 dark:bg-zinc-900';
  }
}

function formatRiskLabel(level?: EmergencyShareRiskLevel | string | null): string {
  switch (level) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    default:
      return 'Info';
  }
}

function getRiskClass(level?: EmergencyShareRiskLevel | string | null): string {
  switch (level) {
    case 'critical':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300';
    default:
      return 'border-border-gray bg-surface-gray text-text-dim dark:border-zinc-700 dark:bg-zinc-900';
  }
}

export function EmergencyShareCard({ babyId, babyName }: EmergencyShareCardProps) {
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiCard, setApiCard] = useState<EmergencyShareCardResponse | null>(null);
  const [fallbackCard, setFallbackCard] = useState<EmergencyHealthCard | null>(null);
  const [shareLink, setShareLink] = useState<EmergencyShareLinkResponse | null>(null);
  const [shareLinks, setShareLinks] = useState<EmergencyShareLinkSummary[]>([]);
  const [shareLinksLoading, setShareLinksLoading] = useState(true);
  const [shareLinksError, setShareLinksError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<EmergencySharePresetKey>('clinic_visit');
  const [statusFilter, setStatusFilter] = useState<ShareHistoryFilter>('all');
  const [ttlMinutes, setTtlMinutes] = useState(EMERGENCY_SHARE_PRESETS.clinic_visit.ttlMinutes);
  const [maxViews, setMaxViews] = useState<number | null>(EMERGENCY_SHARE_PRESETS.clinic_visit.maxViews);
  const [requiresPin, setRequiresPin] = useState(EMERGENCY_SHARE_PRESETS.clinic_visit.requiresPin);
  const [accessPin, setAccessPin] = useState('');
  const [allowedSections, setAllowedSections] = useState<EmergencyShareSection[]>(
    [...EMERGENCY_SHARE_PRESETS.clinic_visit.allowedSections],
  );
  const [creatingLink, setCreatingLink] = useState(false);
  const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null);
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineEmergencyCardSnapshot | null>(null);
  const [savingOffline, setSavingOffline] = useState(false);
  const [clearingOffline, setClearingOffline] = useState(false);

  const loadCard = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const savedSnapshot = getOfflineEmergencyCardSnapshot(babyId);
      setOfflineSnapshot(savedSnapshot);

      const [apiResult, fallbackResult] = await Promise.all([
        getEmergencyShareCard(babyId).catch(() => null),
        buildEmergencyHealthCard(babyId, babyName).catch(() => null),
      ]);

      setApiCard(apiResult);
      setFallbackCard(fallbackResult);

      if (!apiResult && !fallbackResult) {
        if (!savedSnapshot) {
          setError('Unable to generate emergency card at the moment.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to generate emergency card.');
    } finally {
      setLoading(false);
    }
  }, [babyId, babyName]);

  const loadShareLinks = React.useCallback(async () => {
    setShareLinksLoading(true);
    setShareLinksError(null);

    try {
      const data = await getEmergencyShareLinks(babyId);
      setShareLinks(data);
    } catch (err: any) {
      setShareLinks([]);
      setShareLinksError(err?.message || 'Unable to load share link history.');
    } finally {
      setShareLinksLoading(false);
    }
  }, [babyId]);

  const handleRefresh = async () => {
    await Promise.all([loadCard(), loadShareLinks()]);
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!mounted) return;
      await Promise.all([loadCard(), loadShareLinks()]);
    })();
    return () => {
      mounted = false;
    };
  }, [loadCard, loadShareLinks]);

  const resolvedApiCard = apiCard || offlineSnapshot?.apiCard || null;
  const resolvedFallbackCard = fallbackCard || offlineSnapshot?.fallbackCard || null;
  const usingOfflineSnapshot = !apiCard && !fallbackCard && !!offlineSnapshot;
  const generatedAt =
    resolvedApiCard?.generatedAt || resolvedFallbackCard?.generatedAt || offlineSnapshot?.savedAt || null;

  const allergiesText = useMemo(() => {
    if (resolvedApiCard) {
      if (!resolvedApiCard.allergies.length) return 'None recorded';
      return resolvedApiCard.allergies
        .map((item) => {
          const allergen = valueToText(item.allergen) || 'Unknown';
          const severity = valueToText(item.severity) || 'n/a';
          return `${allergen} (${severity})`;
        })
        .join(', ');
    }
    if (resolvedFallbackCard) {
      return resolvedFallbackCard.knownAllergies.length
        ? resolvedFallbackCard.knownAllergies.join(', ')
        : 'None recorded';
    }
    return 'None recorded';
  }, [resolvedApiCard, resolvedFallbackCard]);

  const medicationsText = useMemo(() => {
    if (resolvedApiCard) {
      if (!resolvedApiCard.medications.length) return 'None recorded';
      return resolvedApiCard.medications
        .map((item) => {
          const name = valueToText(item.medication_name) || 'Medication';
          const dosage = valueToText(item.dosage);
          const frequency = valueToText(item.frequency);
          return `${name}${dosage ? ` ${dosage}` : ''}${frequency ? ` (${frequency})` : ''}`;
        })
        .join(', ');
    }
    if (resolvedFallbackCard) {
      return resolvedFallbackCard.activeMedications.length
        ? resolvedFallbackCard.activeMedications.join(', ')
        : 'None recorded';
    }
    return 'None recorded';
  }, [resolvedApiCard, resolvedFallbackCard]);

  const growthText = useMemo(() => {
    if (resolvedApiCard) {
      return formatEmergencyGrowthSummary(resolvedApiCard.latestGrowth);
    }
    if (resolvedFallbackCard?.latestGrowth) {
      return formatEmergencyGrowthSummary({
        date: resolvedFallbackCard.latestGrowth.date,
        weight: resolvedFallbackCard.latestGrowth.weight,
        height: resolvedFallbackCard.latestGrowth.height,
        headCircumference: resolvedFallbackCard.latestGrowth.headCircumference,
      });
    }
    return 'No recent growth or vitals recorded';
  }, [resolvedApiCard, resolvedFallbackCard]);

  const vaccinesText = useMemo(() => {
    if (resolvedApiCard) {
      if (!resolvedApiCard.vaccines.length) return 'None flagged';
      return resolvedApiCard.vaccines
        .map((item) => {
          const name = valueToText(item.vaccine_name) || 'Vaccine';
          const status = valueToText(item.status) || 'pending';
          return `${name} (${status})`;
        })
        .join(', ');
    }
    if (resolvedFallbackCard) {
      return resolvedFallbackCard.overdueVaccines.length
        ? resolvedFallbackCard.overdueVaccines.join(', ')
        : 'None flagged';
    }
    return 'None flagged';
  }, [resolvedApiCard, resolvedFallbackCard]);

  const emergencyText =
    resolvedApiCard?.text ||
    offlineSnapshot?.text ||
    (resolvedFallbackCard ? formatEmergencyHealthCard(resolvedFallbackCard) : '');
  const expiresSoon =
    shareLink?.expiresAt && new Date(shareLink.expiresAt).getTime() - Date.now() < 15 * 60 * 1000;
  const activeSections = shareLink?.allowedSections || allowedSections;

  const sectionSummary = useMemo(
    () =>
      EMERGENCY_SHARE_SECTIONS.filter((section) => activeSections.includes(section.value))
        .map((section) => section.label)
        .join(', '),
    [activeSections],
  );

  const shareLinkCounts = useMemo(
    () => ({
      all: shareLinks.length,
      active: shareLinks.filter((link) => link.status === 'active').length,
      expired: shareLinks.filter((link) => link.status === 'expired').length,
      revoked: shareLinks.filter((link) => link.status === 'revoked').length,
      view_limit_reached: shareLinks.filter((link) => link.status === 'view_limit_reached').length,
    }),
    [shareLinks],
  );

  const filteredShareLinks = useMemo(() => {
    if (statusFilter === 'all') return shareLinks;
    return shareLinks.filter((link) => link.status === statusFilter);
  }, [shareLinks, statusFilter]);

  const handleCopy = async () => {
    if (!emergencyText) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(emergencyText);
      alert('Emergency card copied.');
    } catch (err) {
      console.error('Failed to copy emergency card:', err);
      alert('Copy failed. Please try again.');
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadEmergencyShareCardPdf(babyId);
    } catch (err: any) {
      alert(err?.message || 'Failed to download emergency PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveOfflineSnapshot = async () => {
    if (!resolvedApiCard && !resolvedFallbackCard) {
      alert('Generate the emergency card first, then save it offline.');
      return;
    }

    setSavingOffline(true);
    try {
      const snapshot = saveOfflineEmergencyCardSnapshot({
        babyId,
        babyName,
        apiCard: resolvedApiCard,
        fallbackCard: resolvedFallbackCard,
      });
      setOfflineSnapshot(snapshot);
      alert('Offline emergency snapshot saved.');
    } catch (err: any) {
      alert(err?.message || 'Unable to save offline snapshot.');
    } finally {
      setSavingOffline(false);
    }
  };

  const handleClearOfflineSnapshot = async () => {
    setClearingOffline(true);
    try {
      clearOfflineEmergencyCardSnapshot(babyId);
      setOfflineSnapshot(null);
      alert('Saved offline snapshot removed.');
    } finally {
      setClearingOffline(false);
    }
  };

  const applyPreset = (presetKey: EmergencySharePresetKey) => {
    const preset = EMERGENCY_SHARE_PRESETS[presetKey];
    setShareLink(null);
    setSelectedPreset(presetKey);
    setTtlMinutes(preset.ttlMinutes);
    setMaxViews(preset.maxViews);
    setRequiresPin(preset.requiresPin);
    setAllowedSections([...preset.allowedSections]);
    if (!preset.requiresPin) {
      setAccessPin('');
    }
  };

  const handleCreateShareLink = async () => {
    if (!allowedSections.length) {
      alert('Select at least one section to share.');
      return;
    }

    if (requiresPin && !/^\d{4,8}$/.test(accessPin.trim())) {
      alert('Share PIN must be 4 to 8 digits.');
      return;
    }

    setCreatingLink(true);
    try {
      const result = await createEmergencyShareLink(babyId, {
        ttlMinutes,
        presetKey: selectedPreset,
        maxViews,
        requiresPin,
        accessPin,
        allowedSections,
      });
      setShareLink(result);
      await loadShareLinks();
    } catch (err: any) {
      alert(err?.message || 'Failed to create emergency share link.');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareLink.shareUrl);
      alert('Share link copied.');
    } catch {
      alert('Could not copy link.');
    }
  };

  const handleUseLinkSettings = (link: EmergencyShareLinkSummary) => {
    setShareLink(null);
    setSelectedPreset(link.presetKey || 'custom');
    setTtlMinutes(link.ttlMinutes || 60);
    setMaxViews(link.maxViews ?? null);
    setRequiresPin(link.requiresPin);
    setAllowedSections([...link.allowedSections]);
    if (!link.requiresPin) {
      setAccessPin('');
    } else {
      setAccessPin('');
      alert('PIN-protected links need a new PIN before you create the next share link.');
    }
  };

  const handleRevokeShareLink = async (link: EmergencyShareLinkSummary) => {
    if (link.status !== 'active') {
      return;
    }

    const confirmed = window.confirm(`Revoke link ${link.tokenPrefix || link.id.slice(0, 8)} now?`);
    if (!confirmed) {
      return;
    }

    setRevokingLinkId(link.id);
    try {
      await revokeEmergencyShareLink(babyId, link.id, 'revoked_by_owner');
      if (shareLink?.token.startsWith(link.tokenPrefix)) {
        setShareLink(null);
      }
      await loadShareLinks();
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke share link.');
    } finally {
      setRevokingLinkId(null);
    }
  };

  const toggleSection = (section: EmergencyShareSection) => {
    setShareLink(null);
    setSelectedPreset('custom');
    setAllowedSections((previous) =>
      previous.includes(section)
        ? previous.filter((value) => value !== section)
        : [...previous, section],
    );
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-24">
      <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Emergency Access</p>
        <h2 className="mt-1 text-2xl font-headline font-black tracking-tight text-foreground">
          Emergency Share Card
        </h2>
        <p className="mt-2 text-xs font-semibold text-text-dim">
          Build short-lived links for clinic check-ins, travel handoff, and backup caregivers without exposing
          more data than necessary.
        </p>
      </div>

      {loading && (
        <div className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
          <p className="text-sm font-semibold text-text-light">Generating emergency card...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && usingOfflineSnapshot && (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                Using saved offline snapshot
              </p>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Live data is unavailable right now. This card is using the local copy saved on{' '}
                {formatTimestamp(offlineSnapshot?.savedAt)}.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && (resolvedApiCard || resolvedFallbackCard) && (
        <>
          <div className="space-y-4 rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-text-light">Card Status</p>
              {generatedAt && (
                <p className="text-[10px] font-bold text-text-dim">
                  Updated {new Date(generatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Allergies: {allergiesText}</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Active meds: {medicationsText}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Growth: {growthText}</p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Vaccines to review: {vaccinesText}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Doctor contacts: {resolvedApiCard?.doctorContacts.length ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-border-gray bg-surface-gray p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-light">
                    Offline Snapshot
                  </p>
                  <p className="text-xs font-semibold text-text-dim">
                    {offlineSnapshot
                      ? `Saved ${formatTimestamp(offlineSnapshot.savedAt)} for offline triage, travel, and caregiver handoff.`
                      : 'Save a local copy so key emergency details stay available without signal.'}
                  </p>
                </div>
                <button
                  onClick={() => void handleSaveOfflineSnapshot()}
                  disabled={savingOffline}
                  className="shrink-0 rounded-full border border-border-gray bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {savingOffline ? 'Saving' : 'Save Offline'}
                </button>
              </div>
              {offlineSnapshot && (
                <button
                  onClick={() => void handleClearOfflineSnapshot()}
                  disabled={clearingOffline}
                  className="mt-3 text-[10px] font-black uppercase tracking-wider text-text-light underline underline-offset-2 disabled:opacity-50"
                >
                  {clearingOffline ? 'Removing' : 'Remove saved copy'}
                </button>
              )}
            </div>

            {(shareLink?.qrCodeDataUrl || resolvedApiCard?.qrCodeDataUrl) && (
              <div className="flex justify-center rounded-xl border border-border-gray bg-white p-3 dark:border-zinc-700">
                <img
                  src={shareLink?.qrCodeDataUrl || resolvedApiCard?.qrCodeDataUrl || ''}
                  alt={`Emergency QR code for ${babyName}`}
                  className="h-36 w-36"
                />
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Link Composer</p>
                <h3 className="mt-1 text-lg font-headline font-black text-foreground">Active Links</h3>
              </div>
              <div className="rounded-full border border-border-gray bg-surface-gray px-3 py-1 text-[10px] font-black uppercase tracking-wider text-text-dim dark:border-zinc-700 dark:bg-zinc-900">
                {shareLinkCounts.active} active
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-light">Presets</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRESET_OPTIONS.map((preset) => {
                  const active = selectedPreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => applyPreset(preset.key)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? 'border-secondary bg-secondary/10 text-foreground'
                          : 'border-border-gray bg-surface-gray text-foreground dark:border-zinc-700 dark:bg-zinc-900'
                      }`}
                    >
                      <p className="text-[11px] font-black uppercase tracking-wider">{preset.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-text-dim">{preset.description}</p>
                      <p className="mt-2 text-[10px] font-bold text-text-light">
                        {formatDurationLabel(preset.ttlMinutes)} |{' '}
                        {preset.maxViews ? `${preset.maxViews} views` : 'No cap'} |{' '}
                        {preset.requiresPin ? 'PIN' : 'Open'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border-gray bg-surface-gray p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light">Expiring Link</p>
                {shareLink?.expiresAt && (
                  <p
                    className={`text-[10px] font-bold ${
                      expiresSoon ? 'text-rose-600 dark:text-rose-400' : 'text-text-dim'
                    }`}
                  >
                    Expires {new Date(shareLink.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[15, 60, 180, 1440].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => {
                      setShareLink(null);
                      setSelectedPreset('custom');
                      setTtlMinutes(minutes);
                    }}
                    className={`h-9 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                      ttlMinutes === minutes
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-border-gray bg-white text-foreground dark:border-zinc-700 dark:bg-zinc-900'
                    }`}
                  >
                    {minutes >= 1440 ? '24h' : minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light">View Limit</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'No limit', value: null },
                    { label: '1', value: 1 },
                    { label: '3', value: 3 },
                    { label: '10', value: 10 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        setShareLink(null);
                        setSelectedPreset('custom');
                        setMaxViews(option.value);
                      }}
                      className={`h-9 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                        maxViews === option.value
                          ? 'border-secondary bg-secondary text-white'
                          : 'border-border-gray bg-white text-foreground dark:border-zinc-700 dark:bg-zinc-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border-gray bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="text-[10px] font-black uppercase tracking-wider text-foreground">PIN Protect</span>
                  <input
                    type="checkbox"
                    checked={requiresPin}
                    onChange={(event) => {
                      setShareLink(null);
                      setSelectedPreset('custom');
                      setRequiresPin(event.target.checked);
                      if (!event.target.checked) {
                        setAccessPin('');
                      }
                    }}
                  />
                </label>
                {requiresPin && (
                  <input
                    type="password"
                    value={accessPin}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    onChange={(event) => {
                      setShareLink(null);
                      setAccessPin(event.target.value.replace(/\D+/g, '').slice(0, 8));
                    }}
                    placeholder="4 to 8 digit share PIN"
                    className="w-full rounded-lg border border-border-gray bg-white px-3 py-2 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
                  />
                )}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light">Shared Sections</p>
                <div className="grid grid-cols-2 gap-2">
                  {EMERGENCY_SHARE_SECTIONS.map((section) => {
                    const active = allowedSections.includes(section.value);
                    return (
                      <button
                        key={section.value}
                        onClick={() => toggleSection(section.value)}
                        className={`h-9 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                          active
                            ? 'border-secondary bg-secondary text-white'
                            : 'border-border-gray bg-white text-foreground dark:border-zinc-700 dark:bg-zinc-900'
                        }`}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {shareLink?.shareUrl && (
                <div className="mt-4 space-y-3 rounded-lg border border-border-gray bg-white px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="break-all text-[11px] font-semibold text-text-dim">{shareLink.shareUrl}</div>
                  <div className="space-y-1 text-[10px] font-semibold text-text-dim">
                    <p>
                      {EMERGENCY_SHARE_PRESETS[shareLink.presetKey || 'custom']?.label || 'Custom'} |{' '}
                      {formatDurationLabel(shareLink.ttlMinutes)} |{' '}
                      {shareLink.requiresPin ? 'PIN protected' : 'No PIN'}
                    </p>
                    <p>
                      {shareLink.maxViews
                        ? `${shareLink.remainingViews ?? shareLink.maxViews} views left`
                        : 'Unlimited views'}
                    </p>
                    <p>Sections: {sectionSummary}</p>
                    <p>Copy this now. History keeps the prefix and audit trail, not the full token.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyShareLink}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border-gray bg-surface-gray text-[10px] font-black uppercase tracking-wider text-foreground dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </button>
                    <button
                      onClick={() => void handleCreateShareLink()}
                      disabled={creatingLink}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border-gray bg-surface-gray text-[10px] font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {creatingLink ? 'Creating' : 'Create Fresh'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={handleCopy}
                disabled={copying || !emergencyText}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <Copy className="h-4 w-4" />
                {copying ? 'Copying' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Preparing' : 'PDF'}
              </button>
              <button
                onClick={() => void handleCreateShareLink()}
                disabled={creatingLink}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <Link2 className="h-4 w-4" />
                {creatingLink ? 'Creating' : 'Create Link'}
              </button>
              <button
                onClick={() => void handleRefresh()}
                disabled={loading || shareLinksLoading}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Share History</p>
                <h3 className="mt-1 text-lg font-headline font-black text-foreground">Link Activity</h3>
              </div>
              <button
                onClick={() => void loadShareLinks()}
                disabled={shareLinksLoading}
                className="h-9 rounded-lg border border-border-gray bg-surface-gray px-3 text-[10px] font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              >
                Refresh
              </button>
            </div>

            <p className="text-xs font-semibold text-text-dim">
              Filter active, expired, revoked, or capped links and reuse any setup without exposing the original
              token again.
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { key: 'all' as const, label: 'All', count: shareLinkCounts.all },
                { key: 'active' as const, label: 'Active', count: shareLinkCounts.active },
                { key: 'expired' as const, label: 'Expired', count: shareLinkCounts.expired },
                { key: 'revoked' as const, label: 'Revoked', count: shareLinkCounts.revoked },
                { key: 'view_limit_reached' as const, label: 'Limited', count: shareLinkCounts.view_limit_reached },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={`rounded-xl border px-3 py-3 text-left ${
                    statusFilter === filter.key
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border-gray bg-surface-gray dark:border-zinc-700 dark:bg-zinc-900'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-foreground">{filter.label}</p>
                  <p className="mt-1 text-lg font-headline font-black text-foreground">{filter.count}</p>
                </button>
              ))}
            </div>

            {shareLinksLoading && <p className="text-sm font-semibold text-text-light">Loading share links...</p>}

            {!shareLinksLoading && shareLinksError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/20">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">{shareLinksError}</p>
              </div>
            )}

            {!shareLinksLoading && !shareLinksError && !filteredShareLinks.length && (
              <div className="rounded-xl border border-dashed border-border-gray px-4 py-5 dark:border-zinc-700">
                <p className="text-xs font-semibold text-text-dim">
                  No links match this filter yet. Create one above when you need an expiring emergency handoff.
                </p>
              </div>
            )}

            {!shareLinksLoading && filteredShareLinks.length > 0 && (
              <div className="space-y-3">
                {filteredShareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="space-y-3 rounded-2xl border border-border-gray bg-surface-gray p-4 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-foreground">
                          Link {link.tokenPrefix || link.id.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-text-dim">
                          {EMERGENCY_SHARE_PRESETS[link.presetKey || 'custom']?.label || 'Custom'} | Created{' '}
                          {formatTimestamp(link.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getLinkStatusClass(
                          link.status,
                        )}`}
                      >
                        {formatLinkStatus(link.status)}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] font-semibold text-text-dim">
                      <p>Window: {formatDurationLabel(link.ttlMinutes)} | Expires {formatTimestamp(link.expiresAt)}</p>
                      <p>
                        {link.requiresPin ? 'PIN protected' : 'No PIN'} |{' '}
                        {link.maxViews
                          ? `${link.remainingViews ?? 0} of ${link.maxViews} views left`
                          : 'No view cap'}
                      </p>
                      <p>
                        Sections:{' '}
                        {EMERGENCY_SHARE_SECTIONS.filter((section) => link.allowedSections.includes(section.value))
                          .map((section) => section.label)
                          .join(', ') || 'All sections'}
                      </p>
                      <p>
                        Last access: {link.lastAccessResult} at {formatTimestamp(link.lastAccessedAt)}
                      </p>
                      {link.revokedReason && <p>Reason: {link.revokedReason}</p>}
                    </div>

                    {link.accessLogs.length > 0 && (
                      <div className="space-y-2 rounded-xl border border-border-gray bg-white px-3 py-3 dark:border-zinc-700 dark:bg-zinc-950">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-amber-600" />
                          <p className="text-[10px] font-black uppercase tracking-wider text-text-light">
                            Recent Activity
                          </p>
                        </div>
                        {link.accessLogs.map((entry) => (
                          <div key={entry.id} className="rounded-lg border border-border-gray px-3 py-2 dark:border-zinc-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold text-text-dim">
                                {formatTimestamp(entry.accessedAt)}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getRiskClass(
                                  entry.riskLevel,
                                )}`}
                              >
                                {formatRiskLabel(entry.riskLevel)}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] font-semibold text-foreground">
                              {entry.result}
                              {entry.viewerLabel ? ` | ${entry.viewerLabel}` : ''}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-text-dim">
                              {entry.deviceSummary || 'Unknown device'} | {entry.locationSummary || 'Location unavailable'}
                            </p>
                            {entry.riskReason && (
                              <p className="mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                {entry.riskReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUseLinkSettings(link)}
                        className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border-gray bg-white px-3 text-[10px] font-black uppercase tracking-wider text-foreground dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Use Settings
                      </button>
                      <button
                        onClick={() => void handleRevokeShareLink(link)}
                        disabled={link.status !== 'active' || revokingLinkId === link.id}
                        className="h-9 rounded-lg border border-border-gray bg-white px-3 text-[10px] font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        {revokingLinkId === link.id ? 'Revoking' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600" />
              <p className="text-xs font-semibold leading-relaxed text-amber-800 dark:text-amber-200">
                Emergency reminder: this card supports triage and handoff but does not replace clinical judgment.
                For severe symptoms, call local emergency services immediately.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
