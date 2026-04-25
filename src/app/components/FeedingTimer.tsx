import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Droplets, ChevronRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimerSeconds } from '../../lib/baby-utils';

interface FeedingTimerProps {
  onComplete: (side: 'left' | 'right' | 'both', duration: number) => void;
  onCancel: () => void;
}

const MotionDiv = motion.div as any;

export const FeedingTimer: React.FC<FeedingTimerProps> = ({ onComplete, onCancel }) => {
  const [side, setSide] = useState<'left' | 'right'>('left');
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  const handleFinish = () => {
    onComplete(side, Math.floor(seconds / 60));
  };

  return (
    <MotionDiv 
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 200, opacity: 0 }}
      className="fixed bottom-32 left-6 right-6 z-[60] bg-[#1a1a1a] p-8 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-8"
    >
       <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-white shadow-glow">
                <Droplets size={24} fill="white" />
             </div>
             <div>
                <h3 className="text-xl font-headline font-black text-white tracking-tight">Active Feed</h3>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{side} side session</p>
             </div>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white transition-all"><Square size={18} /></button>
       </div>

       <div className="flex items-center justify-center gap-12">
          <button 
             onClick={() => setSide('left')}
             className={`w-20 h-20 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-1 ${side === 'left' ? 'border-secondary bg-secondary/10 text-white' : 'border-white/10 text-white/40'}`}
          >
             <span className="text-sm font-black">L</span>
             <span className="text-[8px] font-black uppercase tracking-widest">Left</span>
          </button>
          
          <div className="text-center">
             <p className="text-5xl font-headline font-black text-white tracking-tighter tabular-nums">{formatTimerSeconds(seconds)}</p>
          </div>

          <button 
             onClick={() => setSide('right')}
             className={`w-20 h-20 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-1 ${side === 'right' ? 'border-secondary bg-secondary/10 text-white' : 'border-white/10 text-white/40'}`}
          >
             <span className="text-sm font-black">R</span>
             <span className="text-[8px] font-black uppercase tracking-widest">Right</span>
          </button>
       </div>

       <div className="flex gap-4">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-6 rounded-[2rem] font-headline font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isRunning ? 'bg-zinc-800' : 'bg-secondary'}`}
          >
             {isRunning ? <><Pause size={24} /><span>Pause Session</span></> : <><Play size={24} /><span>Resume Session</span></>}
          </button>
          <button 
            onClick={handleFinish}
            className="px-8 bg-emerald-500 text-white rounded-[2rem] font-headline font-black flex items-center justify-center shadow-xl active:scale-95 transition-all"
          >
             <ChevronRight size={28} />
          </button>
       </div>

       <div className="flex items-center justify-center gap-2 text-white/30">
          <Zap size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Syncing to cloud in real-time</span>
       </div>
    </MotionDiv>
  );
};
