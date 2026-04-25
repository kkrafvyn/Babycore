import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Brain, Heart, Star } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface AgeTipsProps {
  onBack: () => void;
}

interface DevelopmentalTip {
  category: 'physical' | 'cognitive' | 'social' | 'growth';
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  title: string;
  body: string;
}

const getTipsByWeek = (weeks: number): DevelopmentalTip[] => {
  if (weeks < 4) return [
    { category: 'physical', icon: <Heart size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', title: 'Skin-to-Skin Contact', body: 'Hold your newborn skin-to-skin as much as possible. This regulates temperature, heart rate, and promotes bonding.' },
    { category: 'cognitive', icon: <Brain size={18} />, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', title: 'High Contrast Visuals', body: 'Newborns can only see 8–12 inches clearly. Show black-and-white patterns and your face to stimulate developing vision.' },
    { category: 'social', icon: <Sparkles size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', title: 'Talk & Sing', body: 'Your voice is baby\'s favorite sound. Narrate your day, sing softly — every word builds early language pathways.' },
    { category: 'growth', icon: <Star size={18} />, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', title: 'Feeding Every 2–3h', body: 'Newborns have tiny stomachs. Feed on demand (8–12 times/day) to support rapid growth and establish supply.' },
  ];
  if (weeks < 8) return [
    { category: 'physical', icon: <Heart size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', title: 'Tummy Time', body: 'Start 1–2 minutes of tummy time, 2–3 times daily. This strengthens neck and shoulder muscles for future rolling.' },
    { category: 'cognitive', icon: <Brain size={18} />, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', title: 'First Social Smiles', body: 'Around 6 weeks, watch for the first real smiles! Smile back immediately — you\'re teaching cause and effect.' },
    { category: 'social', icon: <Sparkles size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', title: 'Following Movement', body: 'Baby\'s eyes can now track slow-moving objects. Hold a colorful object 12 inches away and move it side to side.' },
    { category: 'growth', icon: <Star size={18} />, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', title: 'Growth Spurt at 6 Weeks', body: 'Expect a cluster-feeding surge. Baby is building calories for rapid growth — this is completely normal.' },
  ];
  if (weeks < 16) return [
    { category: 'physical', icon: <Heart size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', title: 'Rolling Practice', body: 'By 4 months many babies can roll tummy-to-back. Create a safe mat area for floor play and rolling attempts.' },
    { category: 'cognitive', icon: <Brain size={18} />, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', title: 'Object Permanence Starts', body: 'Baby begins understanding objects exist even when hidden. Play peekaboo! It\'s not just fun — it\'s a brain workout.' },
    { category: 'social', icon: <Sparkles size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', title: 'Laughing Out Loud', body: 'Genuine laughs emerge! Find your baby\'s "funny triggers" — funny faces, raspberries, unexpected sounds.' },
    { category: 'growth', icon: <Star size={18} />, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', title: 'Reaching & Grasping', body: 'Hands are opening! Offer safe rattles and soft toys. Grasping builds hand-eye coordination and fine motor skills.' },
  ];
  if (weeks < 26) return [
    { category: 'physical', icon: <Heart size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', title: 'Sitting With Support', body: 'Baby may sit briefly with support. Place them in a nursing pillow ring and let them explore the upright world.' },
    { category: 'cognitive', icon: <Brain size={18} />, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', title: 'Ready for Solids?', body: 'Signs of readiness: sits with support, lost tongue-thrust reflex, shows interest in food. Discuss with your pediatrician.' },
    { category: 'social', icon: <Sparkles size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', title: 'Stranger Anxiety Begins', body: 'Some wariness of strangers is healthy development. Let baby warm up at their own pace — don\'t force interactions.' },
    { category: 'growth', icon: <Star size={18} />, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', title: 'Consonant Sounds', body: 'Ba-ba, da-da, ma-ma! Respond enthusiastically to babbles — you\'re co-creating baby\'s first "conversations".' },
  ];
  if (weeks < 52) return [
    { category: 'physical', icon: <Heart size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', title: 'Cruising & Standing', body: 'Baby is pulling to stand and cruising along furniture. Create a safe environment and encourage these big motor milestones.' },
    { category: 'cognitive', icon: <Brain size={18} />, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', title: 'Pincer Grasp', body: 'Thumb and index finger picking up small objects. Offer soft pea-sized foods — this fine motor skill explodes now.' },
    { category: 'social', icon: <Sparkles size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', title: 'Separation Anxiety Peak', body: 'Most intense around 9–12 months. Consistent goodbye rituals help (don\'t sneak away) — baby learns you always return.' },
    { category: 'growth', icon: <Star size={18} />, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', title: 'First Words Approaching', body: 'By 12 months most babies say 1–3 words. Read board books daily — pointing to pictures and naming them accelerates language.' },
  ];
  return [
    { category: 'physical', icon: <Heart size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', title: 'Walking Milestone', body: 'Most babies take first steps between 9-18 months. Celebrate at their own pace — early/late walking is rarely a concern.' },
    { category: 'cognitive', icon: <Brain size={18} />, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', title: 'Pretend Play Begins', body: 'Feeding dollies, talking on toy phones — symbolic play shows a huge cognitive leap. Engage enthusiastically!' },
    { category: 'social', icon: <Sparkles size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', title: 'Parallel Play', body: 'Toddlers play alongside (not with) peers — this is developmentally normal. No forcing sharing yet; model it instead.' },
    { category: 'growth', icon: <Star size={18} />, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', title: 'Vocabulary Explosion', body: 'From ~10 words at 12m to 50+ at 18m. Point, name, and expand: "Ball!" → "Yes, big red ball! Roll?"' },
  ];
};

export const AgeTips: React.FC<AgeTipsProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [activeIdx, setActiveIdx] = useState(0);

  const { weeks, tips, ageLabel } = useMemo(() => {
    if (!currentBaby) return { weeks: 0, tips: [], ageLabel: '' };
    const days = Math.floor((Date.now() - new Date(currentBaby.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24));
    const w = Math.floor(days / 7);
    const m = Math.floor(days / 30);
    const label = m < 4 ? `${w} weeks old` : m < 24 ? `${m} months old` : `${Math.floor(m / 12)} years old`;
    return { weeks: w, tips: getTipsByWeek(w), ageLabel: label };
  }, [currentBaby]);

  if (!currentBaby) return null;

  const tip = tips[activeIdx];

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex items-center gap-4 border-b border-border-gray dark:border-zinc-800/50">
        <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
          <ChevronLeft size={24} />
        </button>
        <span className="text-xl font-headline font-black text-foreground tracking-tight">Developmental Tips</span>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Age badge */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest shadow-lg shadow-secondary/20">
              <Sparkles size={14} />
              {currentBaby.name} · {ageLabel}
            </div>
          </div>

          {/* Featured tip card */}
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className={`${tip.bgColor} rounded-[3rem] p-10 border border-border-gray dark:border-zinc-800`}
            >
              <div className={`w-14 h-14 ${tip.bgColor} ${tip.color} rounded-[1.5rem] flex items-center justify-center shadow-inner mb-6 border border-border-gray dark:border-zinc-800`}>
                {tip.icon}
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${tip.color}`}>
                {tip.category.charAt(0).toUpperCase() + tip.category.slice(1)} Development
              </p>
              <h2 className="text-2xl font-headline font-black text-foreground tracking-tight mb-4">{tip.title}</h2>
              <p className="text-base font-bold text-text-dim leading-relaxed">{tip.body}</p>
            </MotionDiv>
          </AnimatePresence>

          {/* Navigation dots + arrows */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              className="w-12 h-12 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center text-text-dim hover:scale-110 transition-all disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-2">
              {tips.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeIdx ? 'bg-secondary w-6' : 'bg-border-gray dark:bg-zinc-700'}`}
                />
              ))}
            </div>
            <button
              onClick={() => setActiveIdx(i => Math.min(tips.length - 1, i + 1))}
              disabled={activeIdx === tips.length - 1}
              className="w-12 h-12 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center text-text-dim hover:scale-110 transition-all disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* All tips list */}
          <div className="space-y-4">
            <h3 className="text-xl font-headline font-black text-foreground tracking-tight px-2">All Tips for This Stage</h3>
            {tips.map((t, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`w-full text-left bg-surface rounded-[2.5rem] p-6 shadow-sm border transition-all hover:shadow-md flex items-center gap-5 ${
                  i === activeIdx ? 'border-secondary/40' : 'border-border-gray dark:border-zinc-800'
                }`}
              >
                <div className={`w-12 h-12 ${t.bgColor} ${t.color} rounded-xl flex items-center justify-center shrink-0`}>{t.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-headline font-black text-foreground truncate">{t.title}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${t.color}`}>{t.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
