import React, { useState, useEffect } from 'react';
import { ChevronLeft, Edit3, Camera, Plus, Trash2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { getJournalEntriesByBaby, addJournalEntry, deleteJournalEntry } from '../../lib/supabase-storage';
import { JournalEntry } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const PROMPTS = [
  "What made you smile today?",
  "What new thing did baby try?",
  "What's a challenge you overcame today?",
  "Describe a sweet moment you want to remember.",
  "How did baby surprise you today?",
];

interface BabyJournalProps {
  onBack: () => void;
}

export const BabyJournal: React.FC<BabyJournalProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(PROMPTS[0]);
  const [entryText, setEntryText] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('happy');

  useEffect(() => {
    loadEntries();
    setCurrentPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, [currentBaby]);

  const loadEntries = async () => {
    if (!currentBaby) return;
    try {
      const data = await getJournalEntriesByBaby(currentBaby.id);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load journal entries', err);
    }
  };

  const handleSave = async () => {
    if (!currentBaby || !entryText.trim()) return;
    try {
      const newEntry: JournalEntry = {
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        date: new Date().toISOString(),
        prompt: currentPrompt,
        text: entryText,
        mood,
        createdAt: new Date().toISOString(),
      };
      await addJournalEntry(newEntry);
      setEntries([newEntry, ...entries]);
      setShowAddModal(false);
      setEntryText('');
    } catch (err) {
      console.error('Failed to save entry', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteJournalEntry(id);
      setEntries(entries.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
  };

  const cyclePrompt = () => {
    const currentIndex = PROMPTS.indexOf(currentPrompt);
    const nextIndex = (currentIndex + 1) % PROMPTS.length;
    setCurrentPrompt(PROMPTS[nextIndex]);
  };

  const moods = [
    { value: 'happy', emoji: '😊' },
    { value: 'proud', emoji: '🌟' },
    { value: 'emotional', emoji: '🥹' },
    { value: 'tired', emoji: '🥱' },
    { value: 'grateful', emoji: '🙏' },
  ];

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Baby Journal</span>
        </div>
        <button onClick={() => setShowAddModal(true)} className="p-2 text-secondary hover:scale-110 active:scale-95 transition-all">
           <Plus size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-headline font-black text-foreground tracking-tight mb-2">
              Daily Reflections
            </h2>
            <p className="text-sm font-bold text-text-dim">
              A private space to capture the little moments and big feelings.
            </p>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full bg-secondary/10 dark:bg-secondary/20 border border-secondary/20 p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-secondary transition-all hover:bg-secondary/20"
          >
            <Edit3 size={24} />
            <span className="text-sm font-black uppercase tracking-widest">{currentPrompt}</span>
            <span className="text-xs font-bold opacity-80 mt-1">Tap to answer today's prompt</span>
          </button>

          <div className="space-y-4 mt-8">
            {entries.map((entry, idx) => (
              <MotionDiv 
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-surface rounded-[2.5rem] p-6 shadow-sm border border-border-gray dark:border-zinc-800 relative group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{moods.find(m => m.value === entry.mood)?.emoji}</span>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">
                      {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDelete(entry.id)} 
                    className="opacity-0 group-hover:opacity-100 p-2 text-text-light hover:text-red-500 transition-all -mt-2 -mr-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-xs font-bold text-secondary mb-2 italic">"{entry.prompt}"</p>
                <p className="text-sm font-bold text-foreground leading-relaxed whitespace-pre-wrap">{entry.text}</p>
              </MotionDiv>
            ))}
            {entries.length === 0 && (
              <p className="text-center text-text-dim text-sm italic mt-10">No journal entries yet. Start writing!</p>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAddModal && (
          <MotionDiv 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-background flex flex-col pt-12"
          >
            <div className="flex justify-between items-center px-6 mb-6">
              <button onClick={() => setShowAddModal(false)} className="text-text-dim font-bold">Cancel</button>
              <span className="text-sm font-black uppercase tracking-widest text-foreground">New Entry</span>
              <button onClick={handleSave} disabled={!entryText.trim()} className="text-secondary font-bold disabled:opacity-50">Save</button>
            </div>
            
            <div className="flex-1 px-6 space-y-6 overflow-y-auto pb-10">
              <div className="bg-surface-gray dark:bg-zinc-900 rounded-[2rem] p-5 relative group cursor-pointer" onClick={cyclePrompt}>
                <p className="text-xs font-black uppercase tracking-widest text-text-light mb-2">Prompt (Tap to change)</p>
                <p className="text-lg font-headline font-black text-secondary">{currentPrompt}</p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-text-light mb-3">How are you feeling?</p>
                <div className="flex justify-between">
                  {moods.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value as any)}
                      className={`text-3xl p-3 rounded-full transition-all ${mood === m.value ? 'bg-secondary/20 scale-125' : 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={entryText}
                onChange={e => setEntryText(e.target.value)}
                placeholder="Start writing..."
                className="w-full h-64 bg-transparent text-foreground font-bold text-lg leading-relaxed outline-none resize-none placeholder:text-text-dim"
                autoFocus
              />
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
