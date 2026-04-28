import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Download, Phone, Printer, ShieldCheck } from 'lucide-react';
import {
  downloadPublicEmergencyShareCardPdf,
  getPublicEmergencyShareCard,
  type PublicEmergencyShareCardResponse,
} from '@/lib/care-advanced-api';
import { formatEmergencyGrowthSummary } from '@/lib/emergency-share-utils';

interface PublicEmergencyShareCardProps {
  token: string;
}

const VIEWER_LABEL_STORAGE_KEY = 'babycore_emergency_viewer_label';

function valueToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function buildPhoneHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, '');
  return normalized ? `tel:${normalized}` : '';
}

export function PublicEmergencyShareCard({ token }: PublicEmergencyShareCardProps) {
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [card, setCard] = useState<PublicEmergencyShareCardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState('');
  const [viewerLabel, setViewerLabel] = useState('');

  const loadCard = React.useCallback(async (sharePin?: string, viewerOverride?: string) => {
    setLoading(true);
    setError(null);

    try {
      const resolvedViewer = String(viewerOverride || '').trim();
      const data = await getPublicEmergencyShareCard(
        token,
        sharePin || resolvedViewer
          ? {
              ...(sharePin ? { pin: sharePin } : {}),
              ...(resolvedViewer ? { viewer: resolvedViewer } : {}),
            }
          : undefined,
      );
      setCard(data);
      setPinRequired(false);
    } catch (err: any) {
      setCard(null);
      setPinRequired(Boolean(err?.pinRequired));
      setError(err?.message || 'Unable to load emergency share card.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const storedViewerLabel =
      typeof window !== 'undefined' ? window.localStorage.getItem(VIEWER_LABEL_STORAGE_KEY) || '' : '';
    setViewerLabel(storedViewerLabel);
    void loadCard(undefined, storedViewerLabel);
  }, [loadCard, token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VIEWER_LABEL_STORAGE_KEY, viewerLabel.trim());
  }, [viewerLabel]);

  const allergiesText = useMemo(() => {
    if (!card?.allergies?.length) return 'None recorded';
    return card.allergies
      .map((item) => {
        const allergen = valueToText(item.allergen) || 'Unknown';
        const severity = valueToText(item.severity) || 'n/a';
        return `${allergen} (${severity})`;
      })
      .join(', ');
  }, [card]);

  const medicationsText = useMemo(() => {
    if (!card?.medications?.length) return 'None recorded';
    return card.medications
      .map((item) => {
        const name = valueToText(item.medication_name) || 'Medication';
        const dosage = valueToText(item.dosage);
        const frequency = valueToText(item.frequency);
        return `${name}${dosage ? ` ${dosage}` : ''}${frequency ? ` (${frequency})` : ''}`;
      })
      .join(', ');
  }, [card]);

  const vaccinesText = useMemo(() => {
    if (!card?.vaccines?.length) return 'None flagged';
    return card.vaccines
      .map((item) => {
        const name = valueToText(item.vaccine_name) || 'Vaccine';
        const status = valueToText(item.status) || 'pending';
        return `${name} (${status})`;
      })
      .join(', ');
  }, [card]);

  const growthText = useMemo(() => formatEmergencyGrowthSummary(card?.latestGrowth), [card]);

  const doctorContactEntries = useMemo(
    () =>
      (card?.doctorContacts || []).map((item, index) => {
        const name = valueToText(item.full_name) || valueToText(item.name) || `Doctor ${index + 1}`;
        const clinic = valueToText(item.clinic_name);
        const phone = valueToText(item.clinic_phone) || valueToText(item.phone);
        const specialty = valueToText(item.specialty);
        const email = valueToText(item.email);
        return {
          id: `${name}-${index}`,
          name,
          clinic,
          phone,
          specialty,
          email,
          phoneHref: phone ? buildPhoneHref(phone) : '',
        };
      }),
    [card],
  );

  const primaryDoctor = doctorContactEntries.find((entry) => entry.phoneHref) || doctorContactEntries[0] || null;

  const handleCopy = async () => {
    if (!card?.text) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(card.text);
    } catch {
      setError('Could not copy the emergency summary.');
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPublicEmergencyShareCardPdf(
        token,
        pin || viewerLabel.trim()
          ? {
              ...(pin ? { pin } : {}),
              ...(viewerLabel.trim() ? { viewer: viewerLabel.trim() } : {}),
            }
          : undefined,
      );
    } catch (err: any) {
      setPinRequired(Boolean(err?.pinRequired));
      setError(err?.message || 'Could not download the emergency PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      window.print();
    } finally {
      window.setTimeout(() => setPrinting(false), 300);
    }
  };

  const dobLabel = card?.baby?.date_of_birth ? new Date(card.baby.date_of_birth).toLocaleDateString() : 'Hidden';
  const countryLabel = card?.baby?.country || 'Hidden';

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[2rem] border border-border-gray bg-surface p-6 shadow-sm dark:border-zinc-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Emergency Access</p>
          <h1 className="mt-2 text-3xl font-headline font-black tracking-tight text-foreground">
            Shared Emergency Card
          </h1>
          <p className="mt-2 text-sm font-semibold text-text-dim">
            Quick-reference health details for urgent care, travel, and caregiver handoff.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Viewer Label</p>
          <p className="mt-2 text-xs font-semibold text-text-dim">
            Add your name or role so future downloads and protected access can be logged more clearly on this
            device.
          </p>
          <input
            type="text"
            value={viewerLabel}
            onChange={(event) => setViewerLabel(event.target.value.slice(0, 60))}
            placeholder="e.g. ER nurse, Nana, School trip lead"
            className="mt-3 w-full rounded-xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold text-foreground dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-border-gray bg-surface p-6 dark:border-zinc-800">
            <p className="text-sm font-semibold text-text-light">Loading emergency summary...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {!loading && pinRequired && !card && (
          <div className="rounded-[2rem] border border-border-gray bg-surface p-6 shadow-sm dark:border-zinc-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Protected Access</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              This emergency card is protected with a share PIN.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D+/g, '').slice(0, 8))}
                placeholder="Enter share PIN"
                className="w-full rounded-xl border border-border-gray bg-background px-4 py-3 text-sm font-semibold text-foreground dark:border-zinc-700"
              />
              <button
                onClick={() => void loadCard(pin, viewerLabel)}
                disabled={!pin.trim()}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              >
                Unlock Card
              </button>
            </div>
          </div>
        )}

        {!loading && card && (
          <>
            <div className="rounded-[2rem] border border-border-gray bg-surface p-6 shadow-sm dark:border-zinc-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Patient</p>
                  <h2 className="mt-1 text-2xl font-headline font-black text-foreground">{card.baby.name}</h2>
                  <p className="mt-1 text-xs font-semibold text-text-dim">
                    DOB {dobLabel} | {countryLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Expires</p>
                  <p className="mt-1 text-xs font-semibold text-text-dim">
                    {new Date(card.expiresAt).toLocaleString()}
                  </p>
                  {typeof card.remainingViews === 'number' && (
                    <p className="mt-1 text-[11px] font-semibold text-text-dim">
                      {card.remainingViews} views left
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={handleCopy}
                  disabled={copying}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <Copy className="h-4 w-4" />
                  {copying ? 'Copying' : 'Copy Summary'}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={printing}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <Printer className="h-4 w-4" />
                  {printing ? 'Printing' : 'Print Card'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-gray bg-surface-gray text-xs font-black uppercase tracking-wider text-foreground disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? 'Preparing' : 'Download PDF'}
                </button>
                {primaryDoctor?.phoneHref ? (
                  <a
                    href={primaryDoctor.phoneHref}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
                  >
                    <Phone className="h-4 w-4" />
                    Call Doctor
                  </a>
                ) : (
                  <div className="flex h-11 items-center justify-center rounded-xl border border-border-gray bg-surface-gray text-[10px] font-black uppercase tracking-wider text-text-dim dark:border-zinc-700 dark:bg-zinc-900">
                    No shared phone
                  </div>
                )}
              </div>

              {card.qrCodeDataUrl && (
                <div className="mt-5 flex justify-center rounded-2xl border border-border-gray bg-white p-4 dark:border-zinc-700">
                  <img
                    src={card.qrCodeDataUrl}
                    alt={`Emergency QR code for ${card.baby.name}`}
                    className="h-40 w-40"
                  />
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border-gray bg-surface-gray p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Allergies</p>
                  <p className="mt-2 text-xs font-semibold text-foreground">{allergiesText}</p>
                </div>
                <div className="rounded-2xl border border-border-gray bg-surface-gray p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Medications</p>
                  <p className="mt-2 text-xs font-semibold text-foreground">{medicationsText}</p>
                </div>
                <div className="rounded-2xl border border-border-gray bg-surface-gray p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Growth</p>
                  <p className="mt-2 text-xs font-semibold text-foreground">{growthText}</p>
                </div>
                <div className="rounded-2xl border border-border-gray bg-surface-gray p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Vaccines to Review</p>
                  <p className="mt-2 text-xs font-semibold text-foreground">{vaccinesText}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border-gray bg-surface p-6 shadow-sm dark:border-zinc-800">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Doctor Contacts</p>
                  <h3 className="mt-1 text-lg font-headline font-black text-foreground">Call-ready handoff</h3>
                </div>
              </div>

              {!doctorContactEntries.length ? (
                <p className="mt-3 text-xs font-semibold text-text-dim">No doctor contacts shared.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {doctorContactEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-border-gray bg-surface-gray p-4 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-foreground">{entry.name}</p>
                          <p className="mt-1 text-[11px] font-semibold text-text-dim">
                            {[entry.specialty, entry.clinic].filter(Boolean).join(' | ') || 'Shared contact'}
                          </p>
                          {entry.email && (
                            <p className="mt-1 text-[11px] font-semibold text-text-dim">{entry.email}</p>
                          )}
                        </div>
                        {entry.phoneHref ? (
                          <a
                            href={entry.phoneHref}
                            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
                          >
                            <Phone className="h-4 w-4" />
                            {entry.phone || 'Call'}
                          </a>
                        ) : (
                          <div className="text-[10px] font-semibold text-text-dim">No phone shared</div>
                        )}
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
                  This shared card supports triage and handoff, but it does not replace emergency services or
                  professional medical judgment.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
