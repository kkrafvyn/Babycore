import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  downloadEmergencyShareCardPdf,
  getEmergencyShareCard,
  type EmergencyShareCardResponse,
} from '@/lib/care-advanced-api';
import {
  buildEmergencyHealthCard,
  formatEmergencyHealthCard,
  type EmergencyHealthCard,
} from '@/lib/emergency-health-card-service';

interface EmergencyShareCardProps {
  babyId: string;
  babyName: string;
}

function valueToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

export function EmergencyShareCard({ babyId, babyName }: EmergencyShareCardProps) {
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiCard, setApiCard] = useState<EmergencyShareCardResponse | null>(null);
  const [fallbackCard, setFallbackCard] = useState<EmergencyHealthCard | null>(null);

  const loadCard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [apiResult, fallbackResult] = await Promise.all([
        getEmergencyShareCard(babyId).catch(() => null),
        buildEmergencyHealthCard(babyId, babyName).catch(() => null),
      ]);

      setApiCard(apiResult);
      setFallbackCard(fallbackResult);

      if (!apiResult && !fallbackResult) {
        setError('Unable to generate emergency card at the moment.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to generate emergency card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadCard();
    })();
    return () => {
      mounted = false;
    };
  }, [babyId, babyName]);

  const generatedAt = apiCard?.generatedAt || fallbackCard?.generatedAt || null;

  const allergiesText = useMemo(() => {
    if (apiCard) {
      if (!apiCard.allergies.length) return 'None recorded';
      return apiCard.allergies
        .map((item) => {
          const allergen = valueToText(item.allergen) || 'Unknown';
          const severity = valueToText(item.severity) || 'n/a';
          return `${allergen} (${severity})`;
        })
        .join(', ');
    }
    if (fallbackCard) {
      return fallbackCard.knownAllergies.length ? fallbackCard.knownAllergies.join(', ') : 'None recorded';
    }
    return 'None recorded';
  }, [apiCard, fallbackCard]);

  const medicationsText = useMemo(() => {
    if (apiCard) {
      if (!apiCard.medications.length) return 'None recorded';
      return apiCard.medications
        .map((item) => {
          const name = valueToText(item.medication_name) || 'Medication';
          const dosage = valueToText(item.dosage);
          const frequency = valueToText(item.frequency);
          return `${name}${dosage ? ` ${dosage}` : ''}${frequency ? ` (${frequency})` : ''}`;
        })
        .join(', ');
    }
    if (fallbackCard) {
      return fallbackCard.activeMedications.length ? fallbackCard.activeMedications.join(', ') : 'None recorded';
    }
    return 'None recorded';
  }, [apiCard, fallbackCard]);

  const vaccinesText = useMemo(() => {
    if (apiCard) {
      if (!apiCard.vaccines.length) return 'None flagged';
      return apiCard.vaccines
        .map((item) => {
          const name = valueToText(item.vaccine_name) || 'Vaccine';
          const status = valueToText(item.status) || 'pending';
          return `${name} (${status})`;
        })
        .join(', ');
    }
    if (fallbackCard) {
      return fallbackCard.overdueVaccines.length ? fallbackCard.overdueVaccines.join(', ') : 'None flagged';
    }
    return 'None flagged';
  }, [apiCard, fallbackCard]);

  const emergencyText = apiCard?.text || (fallbackCard ? formatEmergencyHealthCard(fallbackCard) : '');

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

  return (
    <div className="max-w-md mx-auto w-full space-y-4 pb-24">
      <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Emergency Access</p>
        <h2 className="text-2xl font-headline font-black text-foreground tracking-tight mt-1">
          Emergency Share Card
        </h2>
        <p className="text-xs font-semibold text-text-dim mt-2">
          One-tap summary for urgent care, clinic visits, and caregiver handoff.
        </p>
      </div>

      {loading && (
        <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5">
          <p className="text-sm font-semibold text-text-light">Generating emergency card...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 dark:bg-red-950/20 rounded-[2rem] border border-red-200 dark:border-red-800 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {!loading && (apiCard || fallbackCard) && (
        <>
          <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-text-light">Card Status</p>
              {generatedAt && (
                <p className="text-[10px] font-bold text-text-dim">
                  Updated {new Date(generatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Allergies: {allergiesText}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Active meds: {medicationsText}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Vaccines to review: {vaccinesText}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Doctor contacts: {apiCard?.doctorContacts.length ?? 0}
              </p>
            </div>

            {apiCard?.qrCodeDataUrl && (
              <div className="rounded-xl border border-border-gray dark:border-zinc-700 bg-white p-3 flex justify-center">
                <img
                  src={apiCard.qrCodeDataUrl}
                  alt={`Emergency QR code for ${babyName}`}
                  className="w-36 h-36"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handleCopy}
                disabled={copying || !emergencyText}
                className="h-10 rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copying ? 'Copying' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="h-10 rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Preparing' : 'PDF'}
              </button>
              <button
                onClick={loadCard}
                disabled={loading}
                className="h-10 rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-200 dark:border-amber-800 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" />
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 leading-relaxed">
                Emergency reminder: this card supports triage but does not replace clinical judgment. For severe
                symptoms, call local emergency services immediately.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

