import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, Calendar, Check, X, Camera, Sparkles, Milestone as MilestoneIcon } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { getMilestonesByBaby, addMilestone, updateMilestone, deleteMilestone } from '../../lib/supabase-storage';
import { Milestone } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface MilestonesTrackerProps {
  onBack: () => void;
}

const MILESTONE_TYPES = [
  { value: 'first-smile', label: '😊 First Smile', emoji: '😊' },
  { value: 'rolling', label: '🔄 Rolling Over', emoji: '🔄' },
  { value: 'sitting', label: '🪑 Sitting Up', emoji: '🪑' },
  { value: 'crawling', label: '🚼 Crawling', emoji: '🚼' },
  { value: 'walking', label: '🚶 Walking', emoji: '🚶' },
  { value: 'first-words', label: '🗣️ First Words', emoji: '🗣️' },
  { value: 'first-tooth', label: '🦷 First Tooth', emoji: '🦷' },
  { value: 'other', label: '⭐ Other', emoji: '⭐' },
];

export const MilestonesTracker: React.FC<MilestonesTrackerProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  
  const [formType, setFormType] = useState('first-smile');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDesc, setFormDesc] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadMilestones();
  }, [currentBaby]);

  const loadMilestones = async () => {
    if (!currentBaby) return;
    setLoading(true);
    try {
      const data = await getMilestonesByBaby(currentBaby.id);
      setMilestones(data);
    } catch (err) {
      console.error('Failed to load milestones', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentBaby || !formDesc.trim()) return;

    try {
      const payload: Milestone = {
        id: editingMilestone?.id || crypto.randomUUID(),
        babyId: currentBaby.id,
        date: new Date(formDate).toISOString(),
        type: formType as any,
        description: formDesc,
        photoUrl: formPhoto || undefined,
        notes: formNotes,
        createdAt: editingMilestone?.createdAt || new Date().toISOString(),
      };

      if (editingMilestone) {
        await updateMilestone(payload);
        setMilestones(prev => prev.map(m => m.id === payload.id ? payload : m));
      } else {
        await addMilestone(payload);
        setMilestones(prev => [payload, ...prev]);
      }
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save milestone', err);
    }
  };

  const resetForm = () => {
    setFormType('first-smile');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDesc('');
    setFormPhoto('');
    setFormNotes('');
    setEditingMilestone(null);
  };

  const openEdit = (m: Milestone) => {
    setEditingMilestone(m);
    setFormType(m.type);
    setFormDate(m.date.split('T')[0]);
    setFormDesc(m.description);
    setFormPhoto(m.photoUrl || '');
    setFormNotes(m.notes || '');
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Archive this milestone forever?')) return;
    try {
      await deleteMilestone(id);
      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete milestone', err);
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-gray-50 dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Milestones</span>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-20">
        <div className="max-w-md mx-auto w-full">
           {loading ? (
             <div className="py-20 text-center text-text-light text-sm font-black uppercase tracking-widest">Loading History…</div>
           ) : milestones.length === 0 ? (
             <div className="py-20 text-center px-8">
                <div className="w-24 h-24 bg-surface-gray dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-text-light border border-dashed border-border-gray dark:border-zinc-800">
                   <Sparkles size={40} />
                </div>
                <h2 className="text-2xl font-headline font-black text-foreground tracking-tight">Preserve the Magic</h2>
                <p className="text-sm text-text-dim mt-4 leading-relaxed">From the first smile to the first step, document every developmental victory.</p>
                <button 
                   onClick={() => setShowAddModal(true)}
                   className="mt-10 bg-secondary text-white px-10 py-5 rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl shadow-secondary/20 active:scale-95 transition-all"
                >
                   Record First Milestone
                </button>
             </div>
           ) : (
             <div className="space-y-12 relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-10 bottom-10 w-px bg-border-gray dark:bg-zinc-800" />
                
                {milestones.map((m, idx) => {
                  const type = MILESTONE_TYPES.find(t => t.value === m.type);
                  return (
                    <MotionDiv 
                      key={m.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative pl-16 group"
                    >
                      <div className="absolute left-2 top-2 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border-4 border-surface-gray dark:border-zinc-800 z-10 flex items-center justify-center text-[14px]">
                         {type?.emoji?.split(' ')[0] || '⭐'}
                      </div>
                      
                      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-sm border border-border-gray dark:border-zinc-800 transition-all hover:shadow-xl hover:border-text-light/20">
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <p className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1">
                                 {new Date(m.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                               </p>
                               <h3 className="text-xl font-headline font-black text-foreground tracking-tight">{type?.label || 'Other'}</h3>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                               <button onClick={() => openEdit(m)} className="w-9 h-9 rounded-full flex items-center justify-center text-text-light hover:text-secondary"><Edit2 size={14} /></button>
                               <button onClick={() => handleDelete(m.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-text-light hover:text-error"><Trash2 size={14} /></button>
                            </div>
                         </div>
                         
                         <p className="text-sm font-bold text-text-dim leading-relaxed mb-6 italic">"{m.description}"</p>
                         
                         {m.photoUrl && (
                           <div className="rounded-[1.5rem] overflow-hidden mb-6 border border-border-gray dark:border-zinc-800">
                              <img src={m.photoUrl} alt="Milestone" className="w-full aspect-[16/9] object-cover" />
                           </div>
                         )}
                         
                         {m.notes && (
                           <div className="bg-surface-gray dark:bg-zinc-800/50 p-6 rounded-2xl border border-white dark:border-zinc-800">
                             <p className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2">Detailed Chronicle</p>
                             <p className="text-[13px] font-bold text-text-dim leading-relaxed">{m.notes}</p>
                           </div>
                         )}
                      </div>
                     </MotionDiv>
                  );
                })}
             </div>
           )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
             onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          >
            <MotionDiv initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
               transition={{ type: 'spring', damping: 25 }}
               className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[3rem] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
               <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-headline font-black text-foreground tracking-tight">
                     {editingMilestone ? 'Refine Entry' : 'New Archive'}
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-full bg-surface-gray flex items-center justify-center text-text-light">
                     <X size={20} />
                  </button>
               </div>

               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">Milestone Type</label>
                    <div className="grid grid-cols-2 gap-2">
                       {MILESTONE_TYPES.map(t => (
                         <button 
                           key={t.value} 
                           onClick={() => setFormType(t.value)}
                           className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                             formType === t.value ? 'bg-secondary text-white shadow-lg' : 'bg-surface-gray dark:bg-zinc-800 text-text-dim hover:bg-border-gray'
                           }`}
                         >
                           {t.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">Chronicle Date</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="input-onboarding" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">Core Description</label>
                    <textarea 
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      placeholder="What was the achievement?"
                      className="w-full h-24 bg-surface-gray dark:bg-zinc-800 rounded-[2rem] p-6 text-sm font-bold text-foreground outline-none resize-none placeholder:text-text-light transition-all focus:ring-2 focus:ring-secondary/10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">Visual (Optional URL)</label>
                    <div className="relative group">
                       <Camera className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-secondary" size={18} />
                       <input 
                         value={formPhoto}
                         onChange={e => setFormPhoto(e.target.value)}
                         placeholder="Paste image link..."
                         className="w-full h-14 bg-surface-gray dark:bg-zinc-800 rounded-2xl pl-16 pr-8 text-sm font-bold text-foreground outline-none transition-all focus:ring-2 focus:ring-secondary/10"
                       />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">Extended Narrative</label>
                    <textarea 
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="Environmental factors, reactions..."
                      className="w-full h-24 bg-surface-gray dark:bg-zinc-800 rounded-[2rem] p-6 text-sm font-bold text-foreground outline-none resize-none placeholder:text-text-light transition-all focus:ring-2 focus:ring-secondary/10"
                    />
                  </div>
               </div>

               <button 
                 onClick={handleSave}
                 disabled={!formDesc.trim()}
                 className="btn-primary disabled:opacity-40"
               >
                  <Check size={24} />
                  <span>{editingMilestone ? 'Sync Update' : 'Initialize Sync'}</span>
               </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
