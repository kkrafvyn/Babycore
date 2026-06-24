import React, { useState } from 'react';
import { ChevronLeft, Sparkles, BookOpen, Heart, Camera, Share2, Download, Wand2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { generateMonthlyScrapbookSummary, type ScrapbookSummary } from '../../lib/ml-insights-service';

const MotionDiv = motion.div as any;

interface AIScrapbookProps {
  onBack: () => void;
}

export const AIScrapbook: React.FC<AIScrapbookProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [scrapbookContent, setScrapbookContent] = useState<ScrapbookSummary | null>(null);

  const generateScrapbook = async () => {
    if (!currentBaby) return;
    setLoading(true);
    setNotice('');

    try {
      const now = new Date();
      const summary = await generateMonthlyScrapbookSummary(
        currentBaby.id,
        now.getMonth() + 1,
        now.getFullYear(),
      );

      if (!summary) {
        setNotice('Could not generate scrapbook yet. Please add more logs and try again.');
        setScrapbookContent(null);
        return;
      }

      setScrapbookContent(summary);
    } catch (err) {
      console.error('Failed to generate scrapbook', err);
      setNotice('Something went wrong while generating the scrapbook.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!scrapbookContent) return;

    const message = `${scrapbookContent.title}\n${scrapbookContent.summary}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: scrapbookContent.title,
          text: message,
        });
        setNotice('Scrapbook summary shared.');
        return;
      } catch (error) {
        console.warn('Web share canceled/unavailable:', error);
      }
    }

    await navigator.clipboard.writeText(message);
    setNotice('Scrapbook summary copied to clipboard.');
  };

  const handleDownload = () => {
    if (!scrapbookContent || !currentBaby) return;
    const blob = new Blob(
      [
        `${scrapbookContent.title}\n\n${scrapbookContent.summary}\n\nHighlights:\n${scrapbookContent.highlights
          .map((h) => `- ${h}`)
          .join('\n')}\n\nVibe: ${scrapbookContent.vibe}\n`,
      ],
      { type: 'text/plain;charset=utf-8' },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentBaby.name}-scrapbook-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Scrapbook summary downloaded.');
  };

  return (
    <div className="fit-screen bg-[#FDFCF8] dark:bg-zinc-950">
      <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-orange-100 dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-orange-600 dark:text-orange-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-orange-950 dark:text-orange-100 tracking-tight">AI Scrapbook</span>
        </div>
        <button onClick={generateScrapbook} disabled={loading} className="text-orange-600 dark:text-orange-400 p-2 hover:scale-110 active:scale-95 transition-all disabled:opacity-50">
          <Wand2 size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-24">
        <div className="max-w-md mx-auto w-full space-y-10">
          {!scrapbookContent && !loading && (
            <div className="py-20 text-center space-y-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-[2.5rem] flex items-center justify-center mx-auto text-orange-500 shadow-xl shadow-orange-500/10 border border-orange-100 dark:border-zinc-800">
                  <BookOpen size={40} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-zinc-900 rounded-full border border-orange-100 dark:border-zinc-800 flex items-center justify-center text-orange-500 shadow-md">
                  <Sparkles size={18} />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-headline font-black text-orange-950 dark:text-orange-50 tracking-tighter">Your Month in Review</h2>
                <p className="text-sm font-bold text-orange-900/60 dark:text-orange-100/40 leading-relaxed px-4">
                  Let Bloom AI transform your real logs and memories into a beautiful digital scrapbook page.
                </p>
              </div>
              <button
                onClick={generateScrapbook}
                className="w-full h-16 bg-orange-500 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Wand2 size={20} />
                <span>Generate {new Date().toLocaleString('default', { month: 'long' })} Collection</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="py-32 text-center space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                <MotionDiv
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 border-4 border-dashed border-orange-300 dark:border-orange-900 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-orange-500">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-headline font-black text-orange-900 dark:text-orange-50">Analyzing the Magic...</p>
                <p className="text-[10px] font-black text-orange-900/40 dark:text-orange-100/30 uppercase tracking-[0.2em]">Reading journals & memories</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {scrapbookContent && !loading && (
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-[3rem] p-1 shadow-2xl border-8 border-[#F5F1E9] dark:border-zinc-800 relative"
              >
                <div className="p-10 space-y-10">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-1 bg-orange-200 dark:bg-orange-900 mx-auto rounded-full" />
                    <h3 className="text-4xl font-headline font-black text-orange-950 dark:text-orange-50 tracking-tighter italic">
                      {scrapbookContent.title}
                    </h3>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-4 -top-4 w-12 h-12 bg-orange-100/50 dark:bg-orange-900/20 rounded-full blur-xl" />
                    <p className="relative text-xl font-headline font-black text-orange-900/80 dark:text-orange-100/70 leading-tight tracking-tight px-2">
                      &quot;{scrapbookContent.summary}&quot;
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] ml-2">Highlights of the Month</h4>
                    <div className="space-y-4">
                      {scrapbookContent.highlights.map((h, i) => (
                        <div key={`${h}-${i}`} className="flex gap-4 p-5 bg-[#FAF9F6] dark:bg-zinc-800/50 rounded-[2.5rem] border border-orange-50 dark:border-zinc-800">
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-orange-500 shadow-sm shrink-0">
                            <Heart size={14} fill="currentColor" />
                          </div>
                          <p className="text-sm font-bold text-orange-900/80 dark:text-orange-100/80 leading-relaxed">{h}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 flex items-center justify-between border-t border-orange-50 dark:border-zinc-800">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-orange-300 uppercase tracking-widest">Monthly Vibe</p>
                      <p className="text-xs font-bold text-orange-900 dark:text-orange-100">{scrapbookContent.vibe}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleDownload} className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center hover:scale-110 transition-all">
                        <Download size={18} />
                      </button>
                      <button onClick={handleShare} className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 hover:scale-110 transition-all">
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>

                  {notice && (
                    <div className="rounded-2xl border border-orange-100 dark:border-zinc-700 bg-[#FAF9F6] dark:bg-zinc-800 px-4 py-3 text-xs font-semibold text-orange-900/70 dark:text-orange-100/70">
                      {notice}
                    </div>
                  )}
                </div>

                <div className="absolute -top-12 -right-4 w-28 h-28 aspect-square bg-[#FDFCF8] p-2 pr-2 pb-6 shadow-xl border border-orange-100 dark:border-zinc-800 -rotate-12 group cursor-pointer hidden md:block">
                  <div className="w-full h-full bg-orange-50 dark:bg-zinc-800 flex items-center justify-center text-orange-200">
                    <Camera size={24} />
                  </div>
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
