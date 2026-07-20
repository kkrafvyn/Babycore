import React, { useMemo, useState } from 'react';
import { ChevronLeft, FileText, Download, Share, Activity, Heart, Copy } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { formatDuration } from '../../lib/baby-utils';
import {
  buildDoctorVisitBrief,
  downloadCSV,
  generateCSV,
  generateDoctorVisitPacketHTML,
  generatePDFHTML,
  openPDFInNewWindow,
} from '../../lib/export';

const MotionDiv = motion.div as any;

interface PediatricianReportProps {
  onBack: () => void;
}

export const PediatricianReport: React.FC<PediatricianReportProps> = ({ onBack }) => {
  const { currentBaby, growthMeasurements, vaccinationRecords, feedLogs, sleepLogs, diaperLogs, milestones, memories } =
    useAppContext();
  const [reportPeriod, setReportPeriod] = useState<7 | 14 | 30>(7);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  const reportPayload = useMemo(() => {
    if (!currentBaby) return null;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - reportPeriod);

    const periodFeeds = feedLogs.filter((l) => new Date(l.timestamp) >= startDate);
    const periodSleeps = sleepLogs.filter((l) => new Date(l.startTime) >= startDate);
    const periodDiapers = diaperLogs.filter((l) => new Date(l.timestamp) >= startDate);
    const periodGrowth = growthMeasurements.filter((l) => new Date(l.date) >= startDate);
    const periodMilestones = milestones.filter((l) => new Date(l.date) >= startDate);
    const periodMemories = memories.filter((l) => new Date(l.timestamp) >= startDate);

    const avgFeedsPerDay = periodFeeds.length / reportPeriod;
    const avgSleepPerDay = periodSleeps.reduce((sum, l) => sum + l.duration, 0) / reportPeriod;
    const avgDiapersPerDay = periodDiapers.length / reportPeriod;

    const latestGrowth = [...growthMeasurements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

    const upcomingVax = [...vaccinationRecords]
      .filter((v) => ['scheduled', 'overdue'].includes(v.status))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const exportData = {
      baby: currentBaby,
      sleepLogs: periodSleeps,
      feedLogs: periodFeeds,
      diaperLogs: periodDiapers,
      growthMeasurements: periodGrowth,
      vaccinationRecords,
      milestones: periodMilestones,
      memories: periodMemories,
      dateRange: { start: startDate, end: now },
    };

    return {
      avgFeedsPerDay: avgFeedsPerDay.toFixed(1),
      avgSleepPerDay: formatDuration(Math.round(avgSleepPerDay)),
      avgDiapersPerDay: avgDiapersPerDay.toFixed(1),
      latestGrowth,
      upcomingVax: upcomingVax.slice(0, 3),
      exportData,
      reportSummary: `Last ${reportPeriod} days: ${periodFeeds.length} feed logs, ${periodSleeps.length} sleep logs, ${periodDiapers.length} diaper logs.`,
    };
  }, [currentBaby, reportPeriod, feedLogs, sleepLogs, diaperLogs, growthMeasurements, vaccinationRecords, milestones, memories]);

  const visitBrief = useMemo(
    () => (reportPayload ? buildDoctorVisitBrief(reportPayload.exportData as any) : ''),
    [reportPayload],
  );

  const handleDownloadPdf = async () => {
    if (!reportPayload || !currentBaby) return;
    setExporting(true);
    setNotice('');
    try {
      const html = generatePDFHTML(reportPayload.exportData as any);
      openPDFInNewWindow(html);
      setNotice('PDF report generated in a new tab.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!reportPayload || !currentBaby) return;
    setExporting(true);
    setNotice('');
    try {
      const csv = generateCSV(reportPayload.exportData as any);
      const filename = `${currentBaby.name}-pediatric-report-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csv, filename);
      setNotice('CSV export downloaded.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadVisitPacket = async () => {
    if (!reportPayload || !currentBaby) return;
    setExporting(true);
    setNotice('');
    try {
      const html = generateDoctorVisitPacketHTML(reportPayload.exportData as any);
      openPDFInNewWindow(html);
      setNotice('Visit packet generated in a new tab.');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!reportPayload || !currentBaby) return;
    setNotice('');

    const text = `${currentBaby.name} pediatric summary\n${reportPayload.reportSummary}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentBaby.name} Pediatric Summary`,
          text,
        });
        setNotice('Summary shared.');
        return;
      } catch (error) {
        console.warn('Web share canceled/unavailable:', error);
      }
    }

    await navigator.clipboard.writeText(text);
    setNotice('Summary copied to clipboard.');
  };

  const handleCopyVisitBrief = async () => {
    if (!visitBrief) return;
    await navigator.clipboard.writeText(visitBrief);
    setNotice('Visit brief copied to clipboard.');
  };

  if (!currentBaby || !reportPayload) return null;

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Doctor Report</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-32">
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="flex justify-between items-center bg-surface-gray dark:bg-zinc-900 rounded-[2rem] p-2">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setReportPeriod(days as any)}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  reportPeriod === days ? 'bg-secondary text-white shadow-md' : 'text-text-dim hover:text-foreground'
                }`}
              >
                Last {days} Days
              </button>
            ))}
          </div>

          <div id="report-content" className="bg-white dark:bg-black rounded-[3rem] p-8 space-y-8 shadow-sm border border-border-gray dark:border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-secondary to-purple-500" />

            <div className="text-center pt-4 border-b border-border-gray dark:border-zinc-800 pb-6">
              <div className="w-16 h-16 bg-surface-gray dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary">
                <FileText size={28} />
              </div>
              <h2 className="text-2xl font-headline font-black text-foreground mb-1">{currentBaby.name}</h2>
              <p className="text-sm font-bold text-text-dim">Pediatric Summary • {new Date().toLocaleDateString()}</p>
            </div>

            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light mb-4 flex items-center gap-2">
                <Activity size={14} /> Routine Averages (Last {reportPeriod} Days)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl text-center">
                  <p className="text-xl font-headline font-black text-rose-500">{reportPayload.avgFeedsPerDay}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-dim mt-1">Feeds/Day</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl text-center">
                  <p className="text-lg font-headline font-black text-indigo-500 tracking-tighter">{reportPayload.avgSleepPerDay}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-dim mt-1">Sleep/Day</p>
                </div>
                <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-2xl text-center">
                  <p className="text-xl font-headline font-black text-sky-500">{reportPayload.avgDiapersPerDay}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-dim mt-1">Diapers/Day</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light mb-4 flex items-center gap-2">
                <Heart size={14} /> Latest Metrics
              </h3>
              {reportPayload.latestGrowth ? (
                <div className="bg-surface-gray dark:bg-zinc-900 p-5 rounded-[2rem] flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-text-light">Weight</p>
                    <p className="text-base font-headline font-black">{reportPayload.latestGrowth.weight || '-'} kg</p>
                  </div>
                  <div className="w-px h-8 bg-border-gray dark:bg-zinc-800" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-text-light">Length</p>
                    <p className="text-base font-headline font-black">{reportPayload.latestGrowth.height || '-'} cm</p>
                  </div>
                  <div className="w-px h-8 bg-border-gray dark:bg-zinc-800" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-text-light">Head</p>
                    <p className="text-base font-headline font-black">{reportPayload.latestGrowth.headCircumference || '-'} cm</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-text-dim">No growth data recorded.</p>
              )}
            </div>

            {reportPayload.upcomingVax.length > 0 && (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light mb-4">Upcoming Vaccinations</h3>
                <div className="space-y-2">
                  {reportPayload.upcomingVax.map((v) => (
                    <div key={v.id} className="flex justify-between items-center bg-surface-gray dark:bg-zinc-900 p-4 rounded-2xl">
                      <p className="text-sm font-bold text-foreground">{v.name}</p>
                      <p className="text-xs font-bold text-red-500">
                        {new Date(v.dueDate) < new Date() ? 'Overdue' : `Due: ${new Date(v.dueDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-light mb-4">
                Visit Packet Brief
              </h3>
              <div className="rounded-[2rem] border border-border-gray bg-surface-gray p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-2">
                  {visitBrief.split('\n').map((line, index) => (
                    <p key={`${index}-${line}`} className="text-sm font-semibold leading-relaxed text-text-dim">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {notice && (
              <div className="rounded-2xl border border-border-gray dark:border-zinc-700 bg-surface px-4 py-3 text-xs font-semibold text-text-dim">
                {notice}
              </div>
            )}

            <div className="pt-4 border-t border-border-gray dark:border-zinc-800 flex justify-between items-center text-[10px] font-bold text-text-dim">
              <span>Prepared specifically for pediatrician review.</span>
              <span className="font-headline font-black text-secondary">Cradlyn</span>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-background/90 backdrop-blur-md p-6 border-t border-border-gray dark:border-zinc-800 z-40">
        <div className="max-w-md mx-auto grid grid-cols-[minmax(0,1fr)_56px_56px_56px] gap-3">
          <button
            onClick={handleDownloadVisitPacket}
            disabled={exporting}
            className="flex-1 bg-secondary text-white py-4 rounded-[2rem] flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest shadow-xl shadow-secondary/20 active:scale-95 transition-all disabled:opacity-60"
          >
            <Download size={18} /> Visit Packet
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={exporting}
            title="Open doctor summary PDF"
            className="w-14 h-14 rounded-full bg-surface-gray dark:bg-zinc-800 text-foreground flex items-center justify-center active:scale-90 transition-all border border-border-gray dark:border-zinc-700 disabled:opacity-60"
          >
            <FileText size={20} />
          </button>
          <button
            onClick={handleShare}
            title="Share summary"
            className="w-14 h-14 rounded-full bg-surface-gray dark:bg-zinc-800 text-foreground flex items-center justify-center active:scale-90 transition-all border border-border-gray dark:border-zinc-700"
          >
            <Share size={20} />
          </button>
          <button
            onClick={handleCopyVisitBrief}
            title="Copy visit brief"
            className="w-14 h-14 rounded-full bg-surface-gray dark:bg-zinc-800 text-foreground flex items-center justify-center active:scale-90 transition-all border border-border-gray dark:border-zinc-700"
          >
            <Copy size={20} />
          </button>
        </div>
        <div className="max-w-md mx-auto mt-3">
          <button
            onClick={handleDownloadCsv}
            disabled={exporting}
            className="w-full rounded-[1.4rem] border border-border-gray bg-surface px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-text-dim transition-all hover:text-foreground dark:border-zinc-700 dark:bg-zinc-900 disabled:opacity-60"
          >
            Download CSV Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
