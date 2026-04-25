import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Play, Pause, CloudRain, HeartPulse, Wind, Music } from 'lucide-react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface WhiteNoiseProps {
  onBack: () => void;
}

const SOUNDS = [
  { id: 'rain', label: 'Rain', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'womb', label: 'Womb', icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'shush', label: 'Shushing', icon: Wind, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' },
  { id: 'lullaby', label: 'Lullaby', icon: Music, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
];

export const WhiteNoise: React.FC<WhiteNoiseProps> = ({ onBack }) => {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  // In a real implementation this would hold AudioContext nodes or new Audio() instances
  // We'll use a mocked Audio object for safety in case media can't play in this environment
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Dummy audio constructor just to show the logic structure without requiring real assets
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleToggle = (soundId: string) => {
    if (activeSound === soundId && isPlaying) {
      setIsPlaying(false);
      // audioRef.current?.pause();
    } else {
      setActiveSound(soundId);
      setIsPlaying(true);
      // In a real app we'd load the correct source here
      // audioRef.current.src = `/sounds/${soundId}.mp3`;
      // audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Sleep Sounds</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full space-y-12">
          
          <div className="text-center relative">
            <div className={`w-40 h-40 mx-auto rounded-full bg-surface shadow-2xl border border-border-gray dark:border-zinc-800 flex items-center justify-center transition-all duration-1000 ${isPlaying ? 'scale-110' : 'scale-100'}`}>
              <MotionDiv
                 animate={{ scale: isPlaying ? [1, 1.2, 1] : 1, opacity: isPlaying ? [0.5, 0.2, 0.5] : 0 }}
                 transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                 className="absolute inset-0 rounded-full bg-secondary blur-3xl -z-10"
              />
              {activeSound ? (
                (() => {
                  const s = SOUNDS.find(x => x.id === activeSound)!;
                  return <s.icon size={64} className={`${s.color} transition-all duration-700 ${isPlaying ? 'animate-pulse' : ''}`} />;
                })()
              ) : (
                <Music size={64} className="text-border-gray dark:text-zinc-700" />
              )}
            </div>
            <h2 className="text-2xl font-headline font-black text-foreground mt-8">
               {isPlaying ? SOUNDS.find(s => s.id === activeSound)?.label : 'Select a Sound'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {SOUNDS.map(sound => (
              <button
                key={sound.id}
                onClick={() => handleToggle(sound.id)}
                className={`p-6 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all duration-300 border ${
                  activeSound === sound.id && isPlaying
                  ? `${sound.bg} border-${sound.color.split('-')[1]}-200 dark:border-${sound.color.split('-')[1]}-800 scale-[0.98]`
                  : 'bg-surface border-border-gray dark:border-zinc-800 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-inner ${
                  activeSound === sound.id && isPlaying ? 'bg-white/50 dark:bg-black/20' : 'bg-surface-gray dark:bg-zinc-900'
                }`}>
                  {activeSound === sound.id && isPlaying ? <Pause size={24} className={sound.color} fill="currentColor" /> : <Play size={24} className={sound.color} fill="currentColor" />}
                </div>
                <span className={`text-sm font-black uppercase tracking-widest ${activeSound === sound.id && isPlaying ? sound.color : 'text-foreground'}`}>
                  {sound.label}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Volume</span>
                <span className="text-[10px] font-black text-foreground">{Math.round(volume * 100)}%</span>
             </div>
             <input 
               type="range" 
               min="0" max="1" step="0.05"
               value={volume}
               onChange={(e) => setVolume(parseFloat(e.target.value))}
               className="w-full h-2 bg-border-gray dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-secondary"
             />
          </div>

        </div>
      </main>
    </div>
  );
};
