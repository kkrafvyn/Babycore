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
import {
  DAILY_JOURNAL_ARTICLES,
  DAILY_JOURNAL_CHANNELS,
  getDailyJournalArticle,
  getRelatedJournalArticles,
  type DailyJournalChannel,
} from '../../lib/daily-journal-articles';

const MotionDiv = motion.div as any;

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

const buildGuideSearchUrl = (query: string) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return '';
  }

  return `https://www.google.com/search?q=${encodeURIComponent(normalizedQuery)}`;
};

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatLocalDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const JournalScreen: React.FC = () => {
  const { currentBaby } = useAppContext();
  const [activeTab, setActiveTab] = useState<'memories' | 'guides'>('guides');
  const [memories, setMemories] = useState<MemoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<PediatricGuide | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryLog | null>(null);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [selectedJournalChannel, setSelectedJournalChannel] =
    useState<DailyJournalChannel>('Journal');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const [formText, setFormText] = useState('');
  const [formIsMilestone, setFormIsMilestone] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadMemories();
  }, [currentBaby]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTodayKey(getLocalDateKey());
    }, 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setSelectedArticleId(null);
  }, [selectedJournalChannel, todayKey]);

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
    const searchUrl = buildGuideSearchUrl(contextualQuery);
    if (!searchUrl) {
      return;
    }

    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredMemories = memories.filter((memory) =>
    memory.text.toLowerCase().includes(memorySearchQuery.toLowerCase()),
  );

  const dailyArticle = useMemo(
    () => getDailyJournalArticle(new Date(`${todayKey}T12:00:00`), selectedJournalChannel),
    [selectedJournalChannel, todayKey],
  );
  const displayedArticle = useMemo(
    () =>
      DAILY_JOURNAL_ARTICLES.find((article) => article.id === selectedArticleId) ||
      dailyArticle,
    [dailyArticle, selectedArticleId],
  );
  const relatedArticles = useMemo(
    () =>
      getRelatedJournalArticles(
        displayedArticle.id,
        3,
        selectedJournalChannel,
        new Date(`${todayKey}T12:00:00`),
      ),
    [displayedArticle.id, selectedJournalChannel, todayKey],
  );
  const categoryGuides = useMemo(
    () =>
      PEDIATRIC_GUIDES.filter((guide) =>
        guide.tag.toLowerCase() === displayedArticle.category.toLowerCase(),
      ).slice(0, 3),
    [displayedArticle.category],
  );

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
        <article className="overflow-hidden rounded-[2rem] border border-zinc-800 bg-[#07090b] text-white shadow-2xl">
          <header className="border-b border-white/10 px-4 py-4 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="whitespace-nowrap font-['Plus_Jakarta_Sans',sans-serif] text-[1.35rem] font-black leading-none tracking-[-0.04em] text-white lg:text-sm lg:tracking-normal">
                The Digital Midwife
              </div>
              <button
                type="button"
                title="Search baby care topics"
                onClick={() => openWebSearch(displayedArticle.title)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200 shadow-[0_14px_30px_rgba(0,0,0,0.35)] lg:hidden"
              >
                <Globe size={17} />
              </button>
            </div>

            <nav className="mt-4 flex w-full items-center gap-7 overflow-x-auto border-t border-white/10 pt-3 text-[12px] font-black text-zinc-300 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mt-0 lg:flex-1 lg:justify-center lg:gap-12 lg:border-t-0 lg:pt-0 lg:text-[11px] lg:font-bold">
              {DAILY_JOURNAL_CHANNELS.map((channel) => {
                const isActive = selectedJournalChannel === channel;
                return (
                  <button
                    key={channel}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedJournalChannel(channel)}
                    className={`shrink-0 border-b pb-1 transition ${
                      isActive
                        ? 'border-sky-300 text-white'
                        : 'border-transparent hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {channel}
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              title="Search baby care topics"
              onClick={() => openWebSearch(displayedArticle.title)}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200 lg:flex"
            >
              <Globe size={14} />
            </button>
          </header>

          <div className="px-4 py-6 sm:px-8 lg:px-10">
            <section className="relative min-h-[360px] overflow-hidden rounded-[1.8rem] sm:min-h-[520px]">
              <img
                src={displayedArticle.heroImage}
                alt={displayedArticle.heroAlt}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/88" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                <span className="inline-flex rounded-full bg-sky-300/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-100">
                  {selectedJournalChannel} daily pick
                </span>
                <h1 className="mt-4 max-w-4xl text-3xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {displayedArticle.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-200 sm:text-base">
                  {displayedArticle.dek}
                </p>
              </div>
            </section>

            <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <main className="min-w-0 space-y-10">
                <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-300/30 bg-sky-300/10 text-sky-100">
                    <Baby size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{displayedArticle.authorName}</p>
                    <p className="text-xs font-medium text-zinc-400">
                      {displayedArticle.authorRole} - {displayedArticle.readMinutes} min read - Updated {formatLocalDateKey(todayKey)} - Shuffles daily
                    </p>
                  </div>
                </div>

                <blockquote className="border-l-2 border-sky-300 pl-5 text-lg font-medium italic leading-relaxed text-zinc-200">
                  "{displayedArticle.quote}"
                </blockquote>

                {displayedArticle.sections.map((section) => (
                  <section key={section.heading} className="space-y-4">
                    <h2 className="text-2xl font-black tracking-tight text-white">{section.heading}</h2>
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="max-w-3xl text-sm leading-7 text-zinc-300">
                        {paragraph}
                      </p>
                    ))}
                  </section>
                ))}

                <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.06] p-5">
                  <p className="text-xs font-black text-white">{displayedArticle.callout.title}</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{displayedArticle.callout.body}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {displayedArticle.routineCards.map((card, index) => {
                    const Icon = index % 2 === 0 ? Sparkles : Moon;
                    return (
                      <div key={card.title} className="rounded-[1.7rem] border border-white/10 bg-sky-950/30 p-5">
                        <Icon size={18} className="text-sky-200" />
                        <p className="mt-4 text-sm font-black text-white">{card.title}</p>
                        <p className="mt-2 text-xs leading-5 text-zinc-300">{card.body}</p>
                      </div>
                    );
                  })}
                </div>

                <section className="space-y-5">
                  <h2 className="text-2xl font-black tracking-tight text-white">Expert Tips for Parents</h2>
                  <div className="space-y-4">
                    {displayedArticle.tips.map((tip) => (
                      <div key={tip} className="flex gap-3 text-sm leading-6 text-zinc-300">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-200 text-[#071016]">
                          <Check size={13} strokeWidth={4} />
                        </span>
                        <p>{tip}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.07] p-6 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-sky-200/30 bg-[#0d1a20] text-sky-100">
                      <Stethoscope size={34} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{displayedArticle.authorName}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{displayedArticle.authorBio}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-black text-sky-100">
                        <button type="button" onClick={() => openWebSearch(`${displayedArticle.category} infant care`)}>
                          Open Research Search
                        </button>
                        <button type="button" onClick={() => openWebSearch('HealthyChildren baby care')}>
                          Trusted Sources
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <h2 className="text-2xl font-black tracking-tight text-white">Related Articles</h2>
                  <div className="grid gap-5 md:grid-cols-3">
                    {relatedArticles.map((article) => (
                      <button
                        type="button"
                        key={article.id}
                        onClick={() => setSelectedArticleId(article.id)}
                        className="group text-left"
                      >
                        <div className="aspect-[1.65] overflow-hidden rounded-[1.4rem] bg-zinc-900">
                          <img
                            src={article.heroImage}
                            alt={article.heroAlt}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        </div>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {article.category}
                        </p>
                        <h3 className="mt-1 text-sm font-black leading-snug text-white">{article.title}</h3>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{article.dek}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </main>

              <aside className="space-y-8 lg:sticky lg:top-4 lg:self-start">
                <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6">
                  <p className="text-sm font-black text-white">The Journal Newsletter</p>
                  <p className="mt-4 text-xs leading-5 text-zinc-300">
                    Get concise baby-care notes for sleep, feeding, safety, and milestones.
                  </p>
                  <form
                    className="mt-5 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                    }}
                  >
                    <input
                      type="email"
                      placeholder="Email address"
                      className="h-11 w-full rounded-full border border-white/10 bg-black/20 px-4 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-sky-300"
                    />
                    <button
                      type="submit"
                      className="h-11 w-full rounded-full bg-sky-700 text-xs font-black text-white transition hover:bg-sky-600"
                    >
                      Subscribe
                    </button>
                  </form>
                </section>

                <section className="space-y-4">
                  <p className="text-sm font-black text-white">In This Category</p>
                  {(categoryGuides.length > 0 ? categoryGuides : PEDIATRIC_GUIDES.slice(0, 3)).map((guide, index) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => setSelectedGuide(guide)}
                      className={`w-full rounded-[1.5rem] p-4 text-left transition ${
                        index === 0 ? 'bg-white/10' : 'hover:bg-white/[0.06]'
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{guide.tag}</p>
                      <p className="mt-1 text-sm font-black leading-snug text-white">{guide.title}</p>
                    </button>
                  ))}
                </section>
              </aside>
            </div>
          </div>

          <footer className="grid gap-8 border-t border-white/10 px-6 py-10 text-xs text-zinc-400 sm:grid-cols-[1fr_auto_auto] sm:px-10">
            <div className="max-w-md">
              <p className="text-sm font-black text-white">The Digital Midwife</p>
              <p className="mt-4 leading-6">
                Educational baby-care guidance for everyday routines. This does not replace advice from your pediatric clinician.
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-black text-white">Resources</p>
              <button type="button" onClick={() => openWebSearch('baby sleep tracker')}>Sleep Tracker</button>
              <button type="button" onClick={() => openWebSearch('infant feeding log')}>Feeding Log</button>
              <button type="button" onClick={() => openWebSearch('infant health records')}>Health Records</button>
            </div>
            <div className="space-y-3">
              <p className="font-black text-white">Today</p>
              <p>{selectedJournalChannel}</p>
              <p>{todayKey}</p>
            </div>
          </footer>
        </article>
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

