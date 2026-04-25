import React, { useState, useEffect } from 'react';
import { Book, Plus, Search, Calendar, Heart, Share2, Trash2, Edit2, ChevronRight, X, Check, Image as ImageIcon, Sparkles, Zap, Shield, Droplets, Moon, ExternalLink } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { getMemoryLogsByBaby, addMemoryLog, deleteMemoryLog, updateMemoryLog } from '../../lib/supabase-storage';
import { MemoryLog } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { i18nT } from '../../lib/i18n';

const MotionDiv = motion.div as any;

export const JournalScreen: React.FC = () => {
  const { currentBaby } = useAppContext();
  const [activeTab, setActiveTab] = useState<'memories' | 'guides'>('memories');
  const [memories, setMemories] = useState<MemoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryLog | null>(null);

  const [formText, setFormText] = useState('');
  const [formIsMilestone, setFormIsMilestone] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadMemories();
  }, [currentBaby]);

  const loadMemories = async () => {
    if (!currentBaby) return;
    setLoading(true);
    try {
      const data = await getMemoryLogsByBaby(currentBaby.id);
      setMemories(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
    setLoading(false);
  };

  const handleSaveMemory = async () => {
    if (!currentBaby || !formText.trim()) return;
    try {
      if (editingMemory) {
        await updateMemoryLog({
          ...editingMemory,
          text: formText,
          isMilestone: formIsMilestone,
          timestamp: new Date(formDate).toISOString(),
        });
      } else {
        await addMemoryLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          text: formText,
          isMilestone: formIsMilestone,
          timestamp: new Date(formDate).toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      setFormText('');
      setFormIsMilestone(false);
      setShowAddForm(false);
      setEditingMemory(null);
      await loadMemories();
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this memory?')) {
      await deleteMemoryLog(id);
      await loadMemories();
    }
  };

  const handleShare = async (memory: MemoryLog) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Memory of ${currentBaby?.name}`,
          text: memory.text,
          url: window.location.href,
        });
      } catch (err) { /* ignore */ }
    }
  };

  const filteredMemories = memories.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

  const articles: any[] = [];

  const PEDIATRIC_GUIDES = [
    {
      id: 'sleep-101',
      title: 'Sleep Regression Survival',
      desc: 'Navigating the 4, 8, and 12-month sleep transitions with gentle methods.',
      icon: Moon,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      tag: 'Sleep'
    },
    {
      id: 'solids-start',
      title: 'The Solids Roadmap',
      desc: 'When and how to introduce purees vs baby-led weaning for the first time.',
      icon: Droplets,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      tag: 'Feeding'
    },
    {
      id: 'safety-home',
      title: 'Baby-Proofing 101',
      desc: 'A room-by-room safety checklist to keep your explorer safe and sound.',
      icon: Shield,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
      tag: 'Safety'
    },
    {
      id: 'growth-spark',
      title: 'Developmental Milestones',
      desc: 'What to look for in motor skills, language, and social growth this month.',
      icon: Zap,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      tag: 'Growth'
    },
    {
      id: 'health-fever',
      title: 'Fever Management',
      desc: 'Understanding temperatures and when to call your pediatrician immediately.',
      icon: Heart,
      color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
      tag: 'Medical'
    },
    {
      id: 'tummy-time',
      title: 'Tummy Time Tips',
      desc: 'Fun ways to strengthen neck and core muscles while keeping it engaging.',
      icon: Sparkles,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      tag: 'Play'
    }
  ];

  return (
    <div className="pb-40">
      {/* Tabs */}
      <div className="flex bg-surface-gray dark:bg-zinc-900/50 p-1.5 rounded-[2rem] mb-10 border border-border-gray dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('memories')}
          className={`flex-1 py-4 rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'memories' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-lg' : 'text-text-light'
          }`}
        >
          {i18nT('journal.memories')}
        </button>
        <button
          onClick={() => setActiveTab('guides')}
          className={`flex-1 py-4 rounded-[1.75rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'guides' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-lg' : 'text-text-light'
          }`}
        >
          {i18nT('journal.guides')}
        </button>
      </div>

      {activeTab === 'memories' ? (
        <div className="space-y-8">
          {/* Header & Search */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter leading-none">{i18nT('journal.preserve')}</h2>
              <button
                onClick={() => { setShowAddForm(true); setEditingMemory(null); setFormText(''); }}
                className="w-12 h-12 bg-secondary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-secondary transition-colors" size={20} />
              <input
                type="text"
                placeholder={i18nT('journal.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 bg-surface rounded-full pl-16 pr-8 text-sm font-bold text-foreground outline-none border border-border-gray dark:border-zinc-800 focus:ring-2 focus:ring-secondary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {filteredMemories.map((memory) => (
              <MotionDiv
                layout
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-sm relative overflow-hidden group"
              >
                {memory.isMilestone && (
                  <div className="absolute top-0 right-0 p-6">
                    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                      <Sparkles size={16} />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span className="text-[10px] font-black text-text-light uppercase tracking-widest">
                    {new Date(memory.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-xl font-headline font-black text-foreground leading-tight tracking-tight mb-8">
                  {memory.text}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-border-gray dark:border-zinc-800/50">
                  <div className="flex gap-4">
                    <button onClick={() => handleShare(memory)} className="text-text-light hover:text-secondary transition-colors"><Share2 size={18} /></button>
                    <button onClick={() => { setEditingMemory(memory); setFormText(memory.text); setFormIsMilestone(!!memory.isMilestone); setFormDate(memory.timestamp.split('T')[0]); setShowAddForm(true); }} className="text-text-light hover:text-foreground transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(memory.id)} className="text-text-light hover:text-error transition-colors"><Trash2 size={18} /></button>
                  </div>
                  {memory.isMilestone && (
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Core Memory</span>
                  )}
                </div>
              </MotionDiv>
            ))}

            {filteredMemories.length === 0 && (
              <div className="py-24 text-center space-y-4 bg-surface-gray dark:bg-zinc-900/30 rounded-[3.5rem] border border-dashed border-border-gray dark:border-zinc-800">
                 <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-text-light opacity-20">
                    <Book size={40} />
                 </div>
                 <p className="text-sm font-black text-text-light uppercase tracking-widest">{i18nT('journal.emptyState')}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
           <div className="px-2">
              <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter leading-none mb-3">Expert Guides</h2>
              <p className="text-sm font-bold text-text-dim max-w-[280px]">Curated pediatric wisdom tailored for {currentBaby?.name}.</p>
           </div>

           <div className="grid gap-6">
              {PEDIATRIC_GUIDES.map((guide, i) => (
                <MotionDiv
                  key={guide.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => alert(`Opening Guide: ${guide.title}\n\nIn the full version, this would open a deep-dive article with interactive checklists and videos.`)}
                  className="bg-surface p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-sm flex items-center gap-6 group cursor-pointer hover:shadow-xl transition-all"
                >
                   <div className={`w-16 h-16 rounded-[1.75rem] flex items-center justify-center shrink-0 shadow-inner ${guide.color}`}>
                      <guide.icon size={28} />
                   </div>
                   <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{guide.tag}</span>
                         <ExternalLink size={14} className="text-text-light opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="text-xl font-headline font-black text-foreground leading-tight tracking-tight">{guide.title}</h4>
                      <p className="text-xs font-bold text-text-dim leading-relaxed">{guide.desc}</p>
                   </div>
                </MotionDiv>
              ))}
           </div>

           <div className="bg-secondary/5 dark:bg-zinc-900/50 p-10 rounded-[3rem] border border-secondary/10 text-center space-y-6">
              <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-secondary shadow-lg">
                 <Book size={24} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-xl font-headline font-black text-foreground tracking-tight">Need specific advice?</h4>
                 <p className="text-xs font-bold text-text-dim px-4">Our pediatric library is updated weekly with the latest research.</p>
              </div>
              <button className="text-[10px] font-black uppercase tracking-widest text-secondary hover:underline">Request a Topic</button>
           </div>
        </div>
      )}

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddForm && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center p-4">
            <MotionDiv initial={{ y: 100 }} animate={{ y: 0 }} className="w-full max-w-md bg-surface rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
               <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-headline font-black text-foreground tracking-tighter">
                    {editingMemory ? 'Edit Memory' : i18nT('journal.newMoment')}
                  </h3>
                  <button onClick={() => setShowAddForm(false)} className="w-12 h-12 rounded-full bg-surface-gray flex items-center justify-center text-text-light"><X size={24} /></button>
               </div>

               <div className="space-y-6">
                  <textarea
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="What happened today?"
                    className="w-full h-40 bg-surface-gray dark:bg-zinc-800 rounded-[2.5rem] p-8 text-lg font-bold text-foreground outline-none border border-transparent focus:border-secondary transition-all resize-none shadow-inner"
                  />

                  <div className="flex items-center justify-between px-2">
                     <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-text-light" />
                        <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Date</span>
                     </div>
                     <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="bg-transparent text-sm font-bold text-foreground outline-none" />
                  </div>

                  <button
                    onClick={() => setFormIsMilestone(!formIsMilestone)}
                    className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all ${
                      formIsMilestone ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'border-border-gray dark:border-zinc-800 text-text-dim'
                    }`}
                  >
                    <Sparkles size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Mark as Milestone</span>
                  </button>
               </div>

               <button onClick={handleSaveMemory} className="btn-primary">
                  <Check size={28} />
                  <span>{editingMemory ? i18nT('common.save') : i18nT('journal.preserve')}</span>
               </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
