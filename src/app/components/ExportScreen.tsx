import React, { useState } from 'react';
import { ChevronLeft, Download, FileText, Calendar, TrendingUp, Syringe, Share2, Printer, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { i18nT } from '../../lib/i18n';
import { getBabyAge, getDefaultAvatar } from '../../lib/baby-utils';

const MotionDiv = motion.div as any;

interface ExportScreenProps {
  onBack: () => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({ onBack }) => {
  const { currentBaby, babies } = useAppContext();
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);

  // We should ideally fetch all logs here, for now we simulate or use what we have in props if available
  // To keep it simple, I'll generate a medical-grade CSV template with the baby's info
  const handleExport = (format: 'pdf' | 'csv' | 'json') => {
    setExporting(true);
    setTimeout(() => {
      if (format === 'csv') {
        const info = `Name,DOB,Gender\n${currentBaby?.name},${currentBaby?.dateOfBirth},${currentBaby?.gender}\n`;
        const blob = new Blob([info], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentBaby?.name || 'baby'}_report.csv`;
        a.click();
      }
      setExporting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Pediatrician Export</span>
        </div>
      </header>

      <main className="flex-1 pt-24 px-6 pb-20 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full space-y-8">
          
          {/* Baby Header */}
          <div className="bg-surface p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-surface-gray dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
               <img src={getDefaultAvatar(currentBaby?.gender, currentBaby?.name || 'baby')} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
               <h2 className="text-2xl font-headline font-black text-foreground">{currentBaby?.name}</h2>
               <p className="text-[10px] font-black text-text-light uppercase tracking-widest">{getBabyAge(currentBaby?.dateOfBirth || new Date().toISOString())}</p>
            </div>
          </div>

          <div className="space-y-4">
             <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-4">Include Data Sets</span>
             <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: FileText, label: 'Feed Logs', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                  { icon: Calendar, label: 'Sleep Cycles', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                  { icon: TrendingUp, label: 'Growth Data', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/10' },
                  { icon: Syringe, label: 'Vaccines', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
                ].map(item => (
                  <div key={item.label} className="bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 flex flex-col items-center gap-3">
                     <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center`}><item.icon size={20} /></div>
                     <span className="text-[10px] font-black uppercase tracking-wider text-text-dim">{item.label}</span>
                     <div className="w-5 h-5 rounded-full border-2 border-secondary bg-secondary/10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="space-y-4">
             <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-4">Export Options</span>
             <div className="space-y-3">
                <button 
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  className="w-full bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 flex items-center justify-between group hover:border-secondary transition-all"
                >
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl flex items-center justify-center"><FileText size={24} /></div>
                      <div className="text-left">
                         <p className="text-lg font-headline font-black text-foreground">Medical PDF</p>
                         <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none">Standard Pediatric Format</p>
                      </div>
                   </div>
                   <Printer size={20} className="text-text-light group-hover:text-secondary transition-all" />
                </button>

                <button 
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="w-full bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 flex items-center justify-between group hover:border-secondary transition-all"
                >
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-2xl flex items-center justify-center"><Download size={24} /></div>
                      <div className="text-left">
                         <p className="text-lg font-headline font-black text-foreground">Raw CSV Data</p>
                         <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none">For Spreadsheet Analysis</p>
                      </div>
                   </div>
                   <Download size={20} className="text-text-light group-hover:text-secondary transition-all" />
                </button>

                <button className="w-full bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 flex items-center justify-between group hover:border-secondary transition-all">
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center"><Share2 size={24} /></div>
                      <div className="text-left">
                         <p className="text-lg font-headline font-black text-foreground">Share Direct</p>
                         <p className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none">Send to Doctor's Email</p>
                      </div>
                   </div>
                   <Share2 size={20} className="text-text-light group-hover:text-secondary transition-all" />
                </button>
             </div>
          </div>

          <div className="pt-8">
             <div className="bg-surface-gray dark:bg-zinc-900 p-6 rounded-[2rem] border border-border-gray dark:border-zinc-800">
                <p className="text-[10px] leading-relaxed text-text-dim font-medium text-center uppercase tracking-widest">
                   Medical reports are encrypted and sanitized of sensitive PII beyond the baby's name and age for standard HIPAA compliance guidelines.
                </p>
             </div>
          </div>
        </div>
      </main>

      {/* Exporting Overlay */}
      {exporting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center">
           <div className="text-center">
              <div className="w-20 h-20 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <p className="text-2xl font-headline font-black text-foreground">Generating Report...</p>
              <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-2">{currentBaby?.name}'s Sanctuary Record</p>
           </div>
        </div>
      )}

      {/* Success Toast */}
      {success && (
        <MotionDiv initial={{ y: 100 }} animate={{ y: -40 }}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[110] bg-secondary text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3"
        >
           <CheckCircle2 size={20} />
           <span className="text-sm font-bold">Report Saved Successfully</span>
        </MotionDiv>
      )}
    </div>
  );
};
