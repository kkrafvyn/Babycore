import React, { useState, useEffect, useMemo } from 'react';
import {
  Book,
  Plus,
  Search,
  Calendar,
  Heart,
  Share2,
  Trash2,
  Edit2,
  X,
  Check,
  Sparkles,
  Zap,
  Shield,
  Droplets,
  Moon,
  ExternalLink,
  Globe,
  Stethoscope,
  Brain,
  ShieldCheck,
  Baby,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { getMemoryLogsByBaby, addMemoryLog, deleteMemoryLog, updateMemoryLog } from '../../lib/supabase-storage';
import { MemoryLog } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { i18nT } from '../../lib/i18n';

const MotionDiv = motion.div as any;

type GuideSearchSource = 'all' | 'who' | 'cdc' | 'aap';

interface PediatricGuide {
  id: string;
  title: string;
  desc: string;
  tag: string;
  icon: LucideIcon;
  color: string;
  searchHint: string;
  trustedSourceUrl: string;
  keyPoints: string[];
  redFlags: string[];
}

const GUIDE_SEARCH_SOURCES: Array<{ value: GuideSearchSource; label: string }> = [
  { value: 'all', label: 'All Web' },
  { value: 'who', label: 'WHO' },
  { value: 'cdc', label: 'CDC' },
  { value: 'aap', label: 'AAP' },
];

const PEDIATRIC_GUIDES: PediatricGuide[] = [
  {
    id: 'sleep-regression',
    title: 'Sleep Regression Survival',
    desc: 'A practical plan for 4, 8, and 12-month sleep shifts with gentle routines.',
    tag: 'Sleep',
    icon: Moon,
    color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    searchHint: 'baby sleep regression 4 months routine',
    trustedSourceUrl: 'https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/default.aspx',
    keyPoints: [
      'Keep bedtime and wake-up times consistent for 7-10 days before changing strategy.',
      'Prioritize daytime naps and enough feeding to reduce false night waking.',
      'Use one soothing response method and apply it consistently each night.',
    ],
    redFlags: [
      'Loud snoring, gasping, or breathing pauses during sleep.',
      'Persistent poor feeding and weight concerns with sleep disruption.',
    ],
  },
  {
    id: 'solids-roadmap',
    title: 'The Solids Roadmap',
    desc: 'How to introduce solids safely, including allergen timing and texture progression.',
    tag: 'Feeding',
    icon: Droplets,
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    searchHint: 'how to introduce solids baby allergens',
    trustedSourceUrl: 'https://www.cdc.gov/nutrition/infantandtoddlernutrition/index.html',
    keyPoints: [
      'Start when baby shows readiness signs: sitting with support, good head control, interest in food.',
      'Introduce one new food at a time and monitor for reaction over the next 24-48 hours.',
      'Include iron-rich foods early and rotate textures from smooth to mashed to soft finger foods.',
    ],
    redFlags: [
      'Wheezing, facial swelling, repeated vomiting, or widespread rash after a new food.',
      'Frequent choking episodes or persistent gagging with age-appropriate textures.',
    ],
  },
  {
    id: 'baby-proofing',
    title: 'Baby-Proofing Home Checklist',
    desc: 'Room-by-room actions for preventing common household injuries.',
    tag: 'Safety',
    icon: Shield,
    color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    searchHint: 'baby proofing checklist home safety',
    trustedSourceUrl: 'https://www.healthychildren.org/English/safety-prevention/at-home/Pages/default.aspx',
    keyPoints: [
      'Anchor furniture and TVs, and install outlet covers and stair gates.',
      'Store medicine, cleaners, and sharp items in high locked cabinets.',
      'Set water heater to safer temperature and never leave baby unsupervised near water.',
    ],
    redFlags: [
      'Any suspected ingestion of medication or cleaning products.',
      'Falls with vomiting, unusual sleepiness, or behavior changes.',
    ],
  },
  {
    id: 'milestone-map',
    title: 'Developmental Milestones by Month',
    desc: 'Track movement, communication, and social milestones with realistic expectations.',
    tag: 'Growth',
    icon: Zap,
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    searchHint: 'baby developmental milestones by month',
    trustedSourceUrl: 'https://www.cdc.gov/ncbddd/actearly/milestones/index.html',
    keyPoints: [
      'Use trends over time rather than one single day to assess progress.',
      'Encourage development through play, talking, and responsive interaction.',
      'Share milestone logs with pediatric visits for better context.',
    ],
    redFlags: [
      'Loss of previously gained skills at any age.',
      'No social smile by 3 months or no babbling by 9 months.',
    ],
  },
  {
    id: 'fever-basics',
    title: 'Fever Management Basics',
    desc: 'What temperature means, comfort care, and when urgent care is needed.',
    tag: 'Medical',
    icon: Heart,
    color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    searchHint: 'infant fever when to seek emergency care',
    trustedSourceUrl: 'https://www.healthychildren.org/English/health-issues/conditions/fever/Pages/default.aspx',
    keyPoints: [
      'Focus on hydration, comfort, and behavior changes, not thermometer number alone.',
      'Use pediatrician-recommended dosing tools if medicine is advised.',
      'Track fever timing, highest reading, and associated symptoms.',
    ],
    redFlags: [
      'Fever in a baby under 3 months or persistent high fever with lethargy.',
      'Trouble breathing, dehydration signs, seizure, or non-blanching rash.',
    ],
  },
  {
    id: 'tummy-time',
    title: 'Tummy Time Playbook',
    desc: 'Daily routines that build neck, shoulder, and core strength in short sessions.',
    tag: 'Play',
    icon: Sparkles,
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    searchHint: 'tummy time activities by age',
    trustedSourceUrl: 'https://www.cdc.gov/ncbddd/actearly/pdf/checklists/all_checklists.pdf',
    keyPoints: [
      'Start with short frequent sessions and increase gradually as tolerance improves.',
      'Use face-to-face interaction and toys to make sessions engaging.',
      'Alternate floor play and chest-to-chest tummy time.',
    ],
    redFlags: [
      'Strong persistent asymmetry or consistent head preference to one side.',
      'No tolerance improvement over several weeks despite gentle progression.',
    ],
  },
  {
    id: 'vaccine-conversation',
    title: 'Vaccine Conversation Starter',
    desc: 'Questions to ask your clinic and how to prepare for appointment day.',
    tag: 'Vaccines',
    icon: Stethoscope,
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    searchHint: 'childhood vaccine schedule by country',
    trustedSourceUrl: 'https://www.who.int/teams/immunization-vaccines-and-biologicals',
    keyPoints: [
      'Bring your record card and list of previous reactions or allergies.',
      'Ask about expected side effects and home comfort measures.',
      'Set reminders for upcoming doses immediately after each visit.',
    ],
    redFlags: [
      'Severe allergic reaction signs after vaccination.',
      'Persistent inconsolable crying with high fever beyond expected timeframe.',
    ],
  },
  {
    id: 'colic-fussiness',
    title: 'Colic and Fussiness Guide',
    desc: 'Structured soothing ideas for long crying windows and evening clusters.',
    tag: 'Comfort',
    icon: Baby,
    color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    searchHint: 'newborn colic soothing strategies',
    trustedSourceUrl: 'https://www.healthychildren.org/English/ages-stages/baby/crying-colic/Pages/default.aspx',
    keyPoints: [
      'Use a repeatable soothing sequence: hold, sway, sound, and feed check.',
      'Track patterns to identify timing and possible triggers.',
      'Rotate caregiver support to reduce burnout during hard stretches.',
    ],
    redFlags: [
      'Weak cry, poor feeding, fever, or vomiting with crying episodes.',
      'Sudden change from baseline behavior that feels unusual for your baby.',
    ],
  },
  {
    id: 'brain-language',
    title: 'Early Brain & Language Growth',
    desc: 'Simple daily habits that strengthen communication and bonding.',
    tag: 'Learning',
    icon: Brain,
    color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    searchHint: 'early language development activities for babies',
    trustedSourceUrl: 'https://www.who.int/teams/maternal-newborn-child-adolescent-health-and-ageing/child-health/early-childhood-development',
    keyPoints: [
      'Narrate routines, make eye contact, and pause for baby response cues.',
      'Read aloud daily with expressive tone and repetition.',
      'Use songs and gestures to reinforce language rhythm.',
    ],
    redFlags: [
      'No response to sounds or voices over time.',
      'No babbling progression by expected age windows.',
    ],
  },
  {
    id: 'infection-prevention',
    title: 'Infection Prevention at Home',
    desc: 'Hygiene and visitor protocols for cold, flu, and seasonal outbreaks.',
    tag: 'Prevention',
    icon: ShieldCheck,
    color: 'bg-lime-50 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400',
    searchHint: 'prevent infections in infants at home',
    trustedSourceUrl: 'https://www.cdc.gov/childrenshealth/index.html',
    keyPoints: [
      'Enforce hand hygiene before handling baby and after outings.',
      'Avoid close contact with sick visitors and shared utensils.',
      'Keep sleeping and feeding items cleaned on a reliable routine.',
    ],
    redFlags: [
      'Rapid breathing, persistent vomiting, or signs of dehydration.',
      'Fever plus poor responsiveness or unusual breathing sounds.',
    ],
  },
];

const buildGuideSearchUrl = (query: string, source: GuideSearchSource) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return '';
  }

  const scopedQuery =
    source === 'who'
      ? `${normalizedQuery} site:who.int`
      : source === 'cdc'
        ? `${normalizedQuery} site:cdc.gov`
        : source === 'aap'
          ? `${normalizedQuery} site:healthychildren.org`
          : normalizedQuery;

  return `https://www.google.com/search?q=${encodeURIComponent(scopedQuery)}`;
};

export const JournalScreen: React.FC = () => {
  const { currentBaby } = useAppContext();
  const [activeTab, setActiveTab] = useState<'memories' | 'guides'>('memories');
  const [memories, setMemories] = useState<MemoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [guideSearchQuery, setGuideSearchQuery] = useState('');
  const [guideSearchSource, setGuideSearchSource] = useState<GuideSearchSource>('all');
  const [selectedGuide, setSelectedGuide] = useState<PediatricGuide | null>(null);
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
      } catch {
        // no-op
      }
    }
  };

  const openWebSearch = (query: string) => {
    const contextualQuery = `${query} baby health parenting`.trim();
    const searchUrl = buildGuideSearchUrl(contextualQuery, guideSearchSource);
    if (!searchUrl) {
      return;
    }

    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredMemories = memories.filter((memory) =>
    memory.text.toLowerCase().includes(memorySearchQuery.toLowerCase()),
  );

  const filteredGuides = useMemo(() => {
    const query = guideSearchQuery.trim().toLowerCase();
    if (!query) {
      return PEDIATRIC_GUIDES;
    }

    return PEDIATRIC_GUIDES.filter((guide) =>
      [guide.title, guide.desc, guide.tag, guide.searchHint].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [guideSearchQuery]);

  return (
    <div className="pb-40">
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
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter leading-none">
                {i18nT('journal.preserve')}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingMemory(null);
                  setFormText('');
                }}
                className="w-12 h-12 bg-secondary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="relative group">
              <Search
                className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-secondary transition-colors"
                size={20}
              />
              <input
                type="text"
                placeholder={i18nT('journal.search')}
                value={memorySearchQuery}
                onChange={(e) => setMemorySearchQuery(e.target.value)}
                className="w-full h-16 bg-surface rounded-full pl-16 pr-8 text-sm font-bold text-foreground outline-none border border-border-gray dark:border-zinc-800 focus:ring-2 focus:ring-secondary/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-6">
            {loading && (
              <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-text-light">
                Loading memories...
              </div>
            )}

            {!loading &&
              filteredMemories.map((memory) => (
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
                      {new Date(memory.timestamp).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-xl font-headline font-black text-foreground leading-tight tracking-tight mb-8">
                    {memory.text}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-border-gray dark:border-zinc-800/50">
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleShare(memory)}
                        className="text-text-light hover:text-secondary transition-colors"
                      >
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingMemory(memory);
                          setFormText(memory.text);
                          setFormIsMilestone(!!memory.isMilestone);
                          setFormDate(memory.timestamp.split('T')[0]);
                          setShowAddForm(true);
                        }}
                        className="text-text-light hover:text-foreground transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(memory.id)}
                        className="text-text-light hover:text-error transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {memory.isMilestone && (
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                        Core Memory
                      </span>
                    )}
                  </div>
                </MotionDiv>
              ))}

            {!loading && filteredMemories.length === 0 && (
              <div className="py-24 text-center space-y-4 bg-surface-gray dark:bg-zinc-900/30 rounded-[3.5rem] border border-dashed border-border-gray dark:border-zinc-800">
                <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-text-light opacity-20">
                  <Book size={40} />
                </div>
                <p className="text-sm font-black text-text-light uppercase tracking-widest">
                  {i18nT('journal.emptyState')}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="px-2">
            <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter leading-none mb-3">
              Expert Guides
            </h2>
            <p className="text-sm font-bold text-text-dim">
              Curated pediatric guidance for {currentBaby?.name || 'your baby'} plus custom internet search.
            </p>
          </div>

          <div className="bg-surface p-5 sm:p-6 rounded-[2.4rem] border border-border-gray dark:border-zinc-800 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" size={18} />
              <input
                type="text"
                value={guideSearchQuery}
                onChange={(event) => setGuideSearchQuery(event.target.value)}
                placeholder="Search guide topics or type a custom question..."
                className="w-full h-12 rounded-2xl bg-surface-gray dark:bg-zinc-800 border border-border-gray dark:border-zinc-700 pl-11 pr-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-secondary/10 transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={guideSearchSource}
                onChange={(event) => setGuideSearchSource(event.target.value as GuideSearchSource)}
                className="h-11 rounded-2xl bg-surface-gray dark:bg-zinc-800 border border-border-gray dark:border-zinc-700 px-4 text-xs font-black uppercase tracking-widest text-foreground outline-none"
              >
                {GUIDE_SEARCH_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => openWebSearch(guideSearchQuery || 'baby care guide')}
                className="h-11 px-4 rounded-2xl bg-secondary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-95 transition-all"
              >
                <Globe size={14} />
                Search Internet
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            {filteredGuides.map((guide, index) => (
              <MotionDiv
                key={guide.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => setSelectedGuide(guide)}
                className="bg-surface p-6 sm:p-8 rounded-[2.4rem] border border-border-gray dark:border-zinc-800 shadow-sm flex items-center gap-5 group cursor-pointer hover:shadow-xl transition-all"
              >
                <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner ${guide.color}`}>
                  <guide.icon size={24} />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{guide.tag}</span>
                    <ExternalLink size={14} className="text-text-light opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <h4 className="text-xl font-headline font-black text-foreground leading-tight tracking-tight">
                    {guide.title}
                  </h4>
                  <p className="text-xs font-bold text-text-dim leading-relaxed">{guide.desc}</p>
                </div>
              </MotionDiv>
            ))}

            {filteredGuides.length === 0 && (
              <div className="py-14 text-center bg-surface-gray dark:bg-zinc-900/30 rounded-[2.8rem] border border-dashed border-border-gray dark:border-zinc-800">
                <p className="text-xs font-black uppercase tracking-widest text-text-light">
                  No matching guides. Try internet search above.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedGuide && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end justify-center p-4"
          >
            <MotionDiv
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-surface rounded-[2.8rem] p-6 sm:p-10 space-y-8 shadow-2xl border border-border-gray dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-light">
                    {selectedGuide.tag}
                  </span>
                  <h3 className="text-3xl font-headline font-black text-foreground tracking-tighter leading-tight">
                    {selectedGuide.title}
                  </h3>
                  <p className="text-sm font-bold text-text-dim">{selectedGuide.desc}</p>
                </div>
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="w-10 h-10 rounded-full bg-surface-gray dark:bg-zinc-800 text-text-light flex items-center justify-center shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase tracking-widest text-foreground">What to do</h4>
                {selectedGuide.keyPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl bg-surface-gray dark:bg-zinc-800 border border-border-gray dark:border-zinc-700 p-4 text-sm font-bold text-foreground"
                  >
                    {point}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase tracking-widest text-error">Call your pediatrician if</h4>
                {selectedGuide.redFlags.map((flag) => (
                  <div
                    key={flag}
                    className="rounded-2xl bg-error/10 border border-error/20 p-4 text-sm font-bold text-error"
                  >
                    {flag}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => window.open(selectedGuide.trustedSourceUrl, '_blank', 'noopener,noreferrer')}
                  className="h-12 rounded-2xl bg-secondary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  Open Trusted Source
                </button>
                <button
                  onClick={() => openWebSearch(selectedGuide.searchHint)}
                  className="h-12 rounded-2xl border border-border-gray dark:border-zinc-700 text-foreground text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-surface-gray dark:bg-zinc-800"
                >
                  <Globe size={14} />
                  Search Internet
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center p-4"
          >
            <MotionDiv
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="w-full max-w-md bg-surface rounded-[3.5rem] p-10 space-y-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-headline font-black text-foreground tracking-tighter">
                  {editingMemory ? 'Edit Memory' : i18nT('journal.newMoment')}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="w-12 h-12 rounded-full bg-surface-gray flex items-center justify-center text-text-light"
                >
                  <X size={24} />
                </button>
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
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="bg-transparent text-sm font-bold text-foreground outline-none"
                  />
                </div>

                <button
                  onClick={() => setFormIsMilestone(!formIsMilestone)}
                  className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all ${
                    formIsMilestone
                      ? 'bg-amber-500 border-amber-500 text-white shadow-lg'
                      : 'border-border-gray dark:border-zinc-800 text-text-dim'
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

