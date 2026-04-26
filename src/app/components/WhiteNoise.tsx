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
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const stopPlaybackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (stopPlaybackRef.current) {
        stopPlaybackRef.current();
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  const createNoiseBuffer = (context: AudioContext, seconds = 2): AudioBuffer => {
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }

    return buffer;
  };

  const stopPlayback = () => {
    if (stopPlaybackRef.current) {
      stopPlaybackRef.current();
      stopPlaybackRef.current = null;
    }

    setIsPlaying(false);
  };

  const startPlayback = async (soundId: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        await context.resume();
      }

      stopPlayback();

      const master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
      masterGainRef.current = master;

      const cleanupCallbacks: Array<() => void> = [];

      const attachNoise = (filterType: BiquadFilterType, frequency: number, q: number, gainValue: number) => {
        const source = context.createBufferSource();
        source.buffer = createNoiseBuffer(context, 2);
        source.loop = true;

        const filter = context.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = frequency;
        filter.Q.value = q;

        const gain = context.createGain();
        gain.gain.value = gainValue;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        source.start();

        cleanupCallbacks.push(() => source.stop());
      };

      const attachOscillator = (type: OscillatorType, frequency: number, gainValue: number) => {
        const oscillator = context.createOscillator();
        oscillator.type = type;
        oscillator.frequency.value = frequency;

        const gain = context.createGain();
        gain.gain.value = gainValue;

        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start();

        cleanupCallbacks.push(() => oscillator.stop());
      };

      if (soundId === 'rain') {
        attachNoise('lowpass', 1400, 0.7, 0.38);
      } else if (soundId === 'shush') {
        attachNoise('bandpass', 2000, 0.9, 0.45);
      } else if (soundId === 'womb') {
        attachNoise('lowpass', 500, 0.6, 0.14);
        attachOscillator('sine', 110, 0.08);
        attachOscillator('sine', 55, 0.05);
      } else {
        attachOscillator('triangle', 523.25, 0.05);
        attachOscillator('triangle', 659.25, 0.03);
        attachNoise('lowpass', 1200, 0.5, 0.05);
      }

      stopPlaybackRef.current = () => {
        cleanupCallbacks.forEach((stop) => {
          try {
            stop();
          } catch {
            // No-op: oscillator/source may already be stopped.
          }
        });
      };

      setIsPlaying(true);
    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
    }
  };

  const handleToggle = async (soundId: string) => {
    if (activeSound === soundId && isPlaying) {
      stopPlayback();
      return;
    }

    setActiveSound(soundId);
    await startPlayback(soundId);
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
                  ? `${sound.bg} border-white/20 dark:border-zinc-700 scale-[0.98]`
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
