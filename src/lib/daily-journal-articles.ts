export interface DailyJournalSection {
  heading: string;
  body: string[];
}

export interface DailyJournalCard {
  title: string;
  body: string;
}

export const DAILY_JOURNAL_CHANNELS = ['Sleep', 'Feeding', 'Health', 'Journal'] as const;
export type DailyJournalChannel = (typeof DAILY_JOURNAL_CHANNELS)[number];

export interface DailyJournalArticle {
  id: string;
  category: DailyJournalChannel;
  title: string;
  dek: string;
  heroImage: string;
  heroAlt: string;
  readMinutes: number;
  quote: string;
  sections: DailyJournalSection[];
  callout: DailyJournalCard;
  routineCards: DailyJournalCard[];
  tips: string[];
  authorName: string;
  authorRole: string;
  authorBio: string;
}

export const DAILY_JOURNAL_ARTICLES: DailyJournalArticle[] = [
  {
    id: 'baby-sleep-first-six-months',
    category: 'Sleep',
    title: 'The Science of Baby Sleep: Navigating the First 6 Months',
    dek: 'How newborn sleep cycles mature, why night waking is normal, and how steady routines help without chasing perfection.',
    heroImage: 'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Sleeping baby resting peacefully in soft light',
    readMinutes: 8,
    quote:
      'Sleep is not a performance metric. In the early months it is a developing rhythm, and parents do best with steady cues rather than pressure.',
    sections: [
      {
        heading: 'Understanding Sleep Cycles',
        body: [
          'Newborns do not begin life with an adult circadian rhythm. Their sleep is distributed across day and night, and waking often reflects hunger, comfort, digestion, or simple brain development.',
          'In the first months, many babies spend a large share of sleep in active sleep. That can look noisy: grunts, wiggles, facial movements, and brief stirring before settling again.',
        ],
      },
      {
        heading: 'The Importance of Routine',
        body: [
          'Predictability is the foundation of security. A repeatable pre-sleep rhythm, even a short one, helps the baby learn what is coming next.',
          'A warm bath, gentle massage, dimmer light, a quiet feed, and the same lullaby can become a familiar pathway into rest.',
        ],
      },
    ],
    callout: {
      title: 'Did You Know?',
      body: 'Infant sleep cycles are often shorter than adult cycles. Brief stirring between cycles can be normal, especially if the baby settles again without distress.',
    },
    routineCards: [
      {
        title: 'Daylight Exposure',
        body: 'Morning light and normal daytime sounds help anchor day-night rhythm as the nervous system matures.',
      },
      {
        title: 'Dark Environment',
        body: 'Lower light at night and keep care calm. The goal is not silence, but a clear difference between night and day.',
      },
    ],
    tips: [
      'Pause before responding if your baby is simply shifting or softly fussing; they may be moving between cycles.',
      'Put baby down drowsy when it is safe and realistic, but do not treat contact sleep or soothing as failure.',
      'Use a firm, flat sleep surface and keep loose bedding, pillows, and soft objects out of the sleep space.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Pediatric education team',
    authorBio:
      'Daily guidance compiled for parents from pediatric public-health principles, safe-sleep standards, and practical newborn care routines.',
  },
  {
    id: 'feeding-cues-first-year',
    category: 'Feeding',
    title: 'Reading Baby Feeding Cues Before the Cry',
    dek: 'A calm guide to early hunger signals, fullness cues, cluster feeding, and when feeding patterns deserve extra attention.',
    heroImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Parent holding a baby during a quiet feeding moment',
    readMinutes: 6,
    quote:
      'Crying can be a late hunger cue. The quieter signals often give parents a gentler window to respond.',
    sections: [
      {
        heading: 'Early Cues Are Small',
        body: [
          'Rooting, lip smacking, bringing hands to mouth, and turning toward a caregiver can all appear before crying. Watching these patterns helps feeding feel less urgent.',
          'Fullness cues matter too. Turning away, relaxing hands, slower sucking, or losing interest can mean baby has had enough for now.',
        ],
      },
      {
        heading: 'Cluster Feeding Has a Pattern',
        body: [
          'Many babies bunch feeds together during growth spurts or evening windows. It can be exhausting, but it is often temporary.',
          'Track wet diapers, stool changes, weight checks, and baby behavior. Patterns tell a richer story than one difficult evening.',
        ],
      },
    ],
    callout: {
      title: 'Tiny Signal',
      body: 'Relaxed hands are often a fullness clue. Tight fists can soften as feeding needs are met.',
    },
    routineCards: [
      {
        title: 'Prep the Station',
        body: 'Keep water, burp cloths, a dim light, and your log screen nearby before longer feeds begin.',
      },
      {
        title: 'Burp Breaks',
        body: 'Short pauses can reduce swallowed air and give baby a chance to show whether they want more.',
      },
    ],
    tips: [
      'Call your pediatrician for poor feeding, fewer wet diapers, persistent vomiting, or unusual sleepiness.',
      'Use paced bottle feeding when bottle feeding so baby can coordinate breathing, sucking, and fullness.',
      'If breastfeeding hurts beyond initial latch discomfort, ask for lactation support early.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Infant feeding notes',
    authorBio:
      'Practical feeding education focused on cue-based care, hydration awareness, and calmer parent-baby rhythms.',
  },
  {
    id: 'solids-readiness-first-tastes',
    category: 'Feeding',
    title: 'Solids Readiness: Gentle First Tastes',
    dek: 'How to notice readiness cues, choose soft starter foods, and keep early meals relaxed instead of rushed.',
    heroImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Baby sitting with a caregiver during a calm feeding moment',
    readMinutes: 7,
    quote:
      'Early solids are practice, not a replacement for milk feeds. Curiosity matters more than a clean bowl.',
    sections: [
      {
        heading: 'Watch for Readiness',
        body: [
          'Many babies show readiness around the middle of the first year: steady head control, interest in food, and the ability to sit with support.',
          'Tongue-thrust reflexes, fatigue, or turning away can mean baby needs more time. Waiting a little longer is often calmer than pushing through.',
        ],
      },
      {
        heading: 'Start Simple',
        body: [
          'Soft textures, small portions, and one calm meal window help caregivers see how baby responds.',
          'Keep choking hazards out of reach, supervise every bite, and learn the difference between gagging and choking before solids begin.',
        ],
      },
    ],
    callout: {
      title: 'First Meals Are Tiny',
      body: 'A few tastes can be a complete early solids session. The learning is sensory, social, and gradual.',
    },
    routineCards: [
      {
        title: 'Same Seat',
        body: 'Use a safe, supported feeding position so baby can focus on tasting and practicing.',
      },
      {
        title: 'Allergy Notes',
        body: 'Log new foods and reactions so patterns are easier to discuss with your clinician.',
      },
    ],
    tips: [
      'Avoid honey before 12 months and avoid round, hard, sticky choking hazards.',
      'Offer water in small amounts with solids if your pediatrician says it is appropriate for your baby.',
      'Talk with your clinician about allergies, eczema, prematurity, or feeding concerns before starting.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Solids readiness briefing',
    authorBio:
      'Parent-friendly feeding notes built around safety, cue-based care, and realistic first-food routines.',
  },
  {
    id: 'tummy-time-play',
    category: 'Health',
    title: 'Tummy Time 101: Small Sessions, Big Gains',
    dek: 'How tiny, playful floor sessions support head control, shoulder strength, rolling readiness, and visual engagement.',
    heroImage: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Baby lying awake and alert on a soft surface',
    readMinutes: 7,
    quote:
      'Tummy time works best when it feels like connection, not a workout. Short, frequent moments add up.',
    sections: [
      {
        heading: 'Start Where Baby Is',
        body: [
          'Some babies love tummy time immediately. Others protest after a minute. Both responses are common, and the answer is usually shorter sessions more often.',
          'Chest-to-chest time counts. A caregiver reclining with baby on their chest can make early practice warmer and less startling.',
        ],
      },
      {
        heading: 'Make the Floor Interesting',
        body: [
          'Get down face-to-face, place a high-contrast toy to one side, and alternate sides to encourage turning both ways.',
          'A rolled towel under the chest can help some babies lift and look around, as long as they are awake and supervised.',
        ],
      },
    ],
    callout: {
      title: 'Micro Sessions Count',
      body: 'One or two minutes after several diaper changes can be more successful than one long session.',
    },
    routineCards: [
      {
        title: 'After Diapers',
        body: 'Pair tummy time with diaper changes so it becomes a predictable part of the day.',
      },
      {
        title: 'Side Switching',
        body: 'Move toys and your face from left to right to invite balanced head turning.',
      },
    ],
    tips: [
      'Always supervise awake tummy time and return baby to their back for sleep.',
      'Mention strong head preference, flattening, or poor tolerance at routine visits.',
      'Use songs, mirrors, and caregiver faces before buying extra equipment.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Developmental play briefing',
    authorBio:
      'Daily baby-care education centered on safe play, development, and realistic routines for busy households.',
  },
  {
    id: 'nursery-temperature',
    category: 'Sleep',
    title: 'Safe Nursery Temperatures Without Overthinking It',
    dek: 'A practical look at room comfort, clothing layers, overheating signs, and why a simple hand check beats guesswork.',
    heroImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Calm nursery with crib and soft natural light',
    readMinutes: 5,
    quote:
      'The goal is a comfortable baby, not a perfect number. Layers and body cues matter as much as the thermostat.',
    sections: [
      {
        heading: 'Check the Chest, Not the Hands',
        body: [
          'Baby hands and feet can feel cool even when the core body temperature is comfortable. The chest or upper back gives a better clue.',
          'Sweating, damp hair, flushed skin, or heat rash can suggest baby is too warm and needs fewer layers.',
        ],
      },
      {
        heading: 'Think in Layers',
        body: [
          'A sleep sack can replace loose blankets. Choose fabric weight based on season, room conditions, and how your baby usually runs.',
          'Avoid hats for routine indoor sleep unless your clinician has given specific instructions.',
        ],
      },
    ],
    callout: {
      title: 'Simple Rule',
      body: 'Dress baby in roughly one more light layer than an adult would wear comfortably in the same room.',
    },
    routineCards: [
      {
        title: 'Room Scan',
        body: 'Check drafts, direct sun, heater vents, and monitor placement before assuming the thermostat tells the whole story.',
      },
      {
        title: 'Sleep Sack Fit',
        body: 'Use the correct size so fabric cannot ride up around the face.',
      },
    ],
    tips: [
      'Keep loose blankets, pillows, bumpers, and plush toys out of the sleep space.',
      "Adjust layers gradually so you can learn your baby's comfort pattern.",
      'Ask your pediatrician about temperature care during fever or illness.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Safe sleep briefing',
    authorBio:
      'Concise nursery and sleep education for parents building calm, safe routines in real homes.',
  },
  {
    id: 'diaper-patterns',
    category: 'Health',
    title: 'What Diaper Patterns Can Tell You',
    dek: 'A parent-friendly guide to wet diapers, stool shifts, hydration clues, and what changes are worth logging.',
    heroImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Parent caring for a baby in soft window light',
    readMinutes: 6,
    quote:
      'Diaper logs are less about perfection and more about noticing the trend before worry has to guess.',
    sections: [
      {
        heading: 'Wet Diapers Are Hydration Clues',
        body: [
          'For many babies, wet diaper patterns help caregivers understand whether intake is staying steady. The expected number changes with age and feeding stage.',
          'A sudden drop in wet diapers, especially with poor feeding or unusual sleepiness, deserves a call to your clinician.',
        ],
      },
      {
        heading: 'Stool Changes Are Common',
        body: [
          'Color, frequency, and texture can shift with age, feeding method, illness, and the start of solids.',
          'Blood, black stool after the newborn period, pale/white stool, or repeated diarrhea should be discussed promptly.',
        ],
      },
    ],
    callout: {
      title: 'Log the Context',
      body: 'The most useful diaper note often includes feeding changes, fever, new foods, or medicine timing.',
    },
    routineCards: [
      {
        title: 'Pattern View',
        body: 'Look at the last 24 hours instead of judging one diaper in isolation.',
      },
      {
        title: 'Photo Caution',
        body: 'If you save diaper photos for a clinician, keep them private and delete what you no longer need.',
      },
    ],
    tips: [
      'Seek care urgently for dehydration signs, persistent vomiting, or blood in stool.',
      'Record new foods and stool changes together when starting solids.',
      'Do not use adult medicines for diarrhea or constipation unless your clinician instructs you.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Daily health observation',
    authorBio:
      'Baby-care education focused on turning everyday observations into useful, calmer health conversations.',
  },
  {
    id: 'daily-log-without-pressure',
    category: 'Journal',
    title: 'How to Use Baby Logs Without Letting Them Run the Day',
    dek: 'A practical guide to tracking feeds, sleep, diapers, and symptoms with enough structure but less anxiety.',
    heroImage: 'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Quiet nursery light near a resting baby',
    readMinutes: 6,
    quote:
      'The goal of a log is not perfect data. It is a calmer memory aid when tired parents need patterns, not pressure.',
    sections: [
      {
        heading: 'Track the Pattern, Not Every Thought',
        body: [
          'The most useful entries are often simple: time, what happened, and anything unusual. That is enough to spot patterns without turning care into paperwork.',
          'For newborns or medical concerns, more detail may help. For settled routines, a lighter touch can keep the app supportive instead of noisy.',
        ],
      },
      {
        heading: 'Use Notes for Context',
        body: [
          'Short notes like "new bottle nipple", "visitor day", "stuffy nose", or "started carrots" can explain changes later.',
          'When something worries you, bring the log to your clinician as context, not as a self-diagnosis tool.',
        ],
      },
    ],
    callout: {
      title: 'Good Enough Counts',
      body: 'Missing an entry does not ruin the picture. A few consistent anchors are often more useful than an exhausted perfect streak.',
    },
    routineCards: [
      {
        title: 'One-Tap First',
        body: 'Capture the event quickly, then add details later only if they matter.',
      },
      {
        title: 'Review Window',
        body: 'Look back once a day or before appointments instead of checking patterns constantly.',
      },
    ],
    tips: [
      'Use logs to support pediatric conversations, especially when symptoms or feeding changes persist.',
      'Keep private photos and sensitive notes limited to what you truly need.',
      'If tracking increases anxiety, simplify what you record and focus on clinician-recommended items.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Parent workflow notes',
    authorBio:
      'Daily guidance for using baby-care tools in a way that supports confidence, privacy, and calmer routines.',
  },
  {
    id: 'what-to-capture-first-year',
    category: 'Journal',
    title: 'What to Capture in a Baby Journal During the First Year',
    dek: 'A gentle checklist for memories, milestones, questions, symptoms, and the tiny details parents forget by morning.',
    heroImage: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Awake baby looking up during a quiet moment',
    readMinutes: 5,
    quote:
      'A baby journal can hold both the medical clues and the soft little moments that make the season real.',
    sections: [
      {
        heading: 'Capture Milestones With Context',
        body: [
          'Rolling, smiling, babbling, sitting, and first foods are easier to remember when you add where it happened and what baby was trying to do.',
          'Context turns a milestone into a memory and helps you notice if a skill appears only in one setting.',
        ],
      },
      {
        heading: 'Keep a Question List',
        body: [
          'When a worry appears at 2 a.m., write the question down. By appointment time, tired brains do not have to reconstruct everything.',
          'Pair questions with examples: when it happened, how long it lasted, and what helped.',
        ],
      },
    ],
    callout: {
      title: 'Memory Prompt',
      body: 'One sentence a day can be enough: "Today you..." keeps the journal alive without becoming a chore.',
    },
    routineCards: [
      {
        title: 'Photo Plus Note',
        body: 'Add one short note to favorite photos so the story stays attached to the image.',
      },
      {
        title: 'Appointment Prep',
        body: 'Star questions or symptoms you want to bring to the next visit.',
      },
    ],
    tips: [
      'Record symptoms that repeat, worsen, or come with fever, poor feeding, or unusual sleepiness.',
      'Use milestones as observations, not comparisons; babies develop on individual timelines.',
      'Protect privacy when sharing journal screenshots or exports.',
    ],
    authorName: 'The Digital Midwife Care Desk',
    authorRole: 'Memory and milestone guide',
    authorBio:
      'Everyday baby-journal prompts designed to preserve memories and support clearer care conversations.',
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getLocalDayNumber = (date: Date): number =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY,
  );

const getJournalPool = (channel: DailyJournalChannel): DailyJournalArticle[] => {
  return DAILY_JOURNAL_ARTICLES.filter((article) => article.category === channel);
};

export const getDailyJournalArticle = (
  date = new Date(),
  channel: DailyJournalChannel = 'Journal',
): DailyJournalArticle => {
  const pool = getJournalPool(channel);
  const fallbackPool = pool.length > 0 ? pool : DAILY_JOURNAL_ARTICLES;
  const localDay = getLocalDayNumber(date);
  return fallbackPool[localDay % fallbackPool.length];
};

export const getRelatedJournalArticles = (
  articleId: string,
  count = 3,
  channel: DailyJournalChannel = 'Journal',
  date = new Date(),
): DailyJournalArticle[] => {
  const channelCandidates = getJournalPool(channel).filter((article) => article.id !== articleId);
  const fallbackCandidates = DAILY_JOURNAL_ARTICLES.filter(
    (article) =>
      article.id !== articleId &&
      !channelCandidates.some((candidate) => candidate.id === article.id),
  );
  const candidates = [...channelCandidates, ...fallbackCandidates];

  if (candidates.length === 0) {
    return [];
  }

  const startIndex = getLocalDayNumber(date) % candidates.length;

  return Array.from({ length: count }, (_, offset) => {
    const nextIndex = (startIndex + offset) % candidates.length;
    return candidates[nextIndex];
  });
};
