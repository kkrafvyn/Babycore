import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay to not annoy the user immediately
      const hasBeenDismissed = localStorage.getItem('babylog_install_dismissed');
      if (!hasBeenDismissed) {
        setTimeout(() => setShow(true), 10000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('babylog_install_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <MotionDiv 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-6 right-6 z-[60] bg-surface p-6 rounded-[3rem] border border-secondary/30 shadow-glow flex items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
             <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center shrink-0">
                <Smartphone size={32} />
             </div>
             <div>
                <h3 className="text-lg font-headline font-black text-foreground leading-tight flex items-center gap-2">
                   Bud & Bloom Mobile <Sparkles size={14} className="text-amber-500" />
                </h3>
                <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-1">Install App for Full Experience</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={handleInstall}
                className="bg-secondary text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all"
             >
                <Download size={20} />
             </button>
             <button 
                onClick={handleDismiss}
                className="text-text-light p-4 rounded-2xl hover:bg-surface-gray transition-all"
             >
                <X size={20} />
             </button>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};
