import React from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import { CareCopilotChat } from './CareCopilotChat';
import { i18nT } from '@/lib/i18n';

interface CareCopilotBubbleProps {
  babyId: string;
  babyName: string;
}

type DragOffset = { x: number; y: number };

const MotionDiv = motion.div as any;
const POSITION_STORAGE_KEY = 'cradlyn:copilot-drag-offset';

const readStoredOffsets = (): { bubble: DragOffset; panel: DragOffset } => {
  if (typeof window === 'undefined') {
    return { bubble: { x: 0, y: 0 }, panel: { x: 0, y: 0 } };
  }

  try {
    const raw = window.sessionStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) {
      return { bubble: { x: 0, y: 0 }, panel: { x: 0, y: 0 } };
    }
    const parsed = JSON.parse(raw) as { bubble?: DragOffset; panel?: DragOffset };
    return {
      bubble: parsed.bubble ?? { x: 0, y: 0 },
      panel: parsed.panel ?? { x: 0, y: 0 },
    };
  } catch {
    return { bubble: { x: 0, y: 0 }, panel: { x: 0, y: 0 } };
  }
};

const persistOffsets = (bubble: DragOffset, panel: DragOffset) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    POSITION_STORAGE_KEY,
    JSON.stringify({ bubble, panel }),
  );
};

export const CareCopilotBubble: React.FC<CareCopilotBubbleProps> = ({ babyId, babyName }) => {
  const boundsRef = React.useRef<HTMLDivElement | null>(null);
  const panelDragControls = useDragControls();
  const bubbleDraggedRef = React.useRef(false);

  const [open, setOpen] = React.useState(false);
  const [bubbleOffset, setBubbleOffset] = React.useState<DragOffset>({ x: 0, y: 0 });
  const [panelOffset, setPanelOffset] = React.useState<DragOffset>({ x: 0, y: 0 });

  React.useEffect(() => {
    const stored = readStoredOffsets();
    setBubbleOffset(stored.bubble);
    setPanelOffset(stored.panel);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [babyId]);

  React.useEffect(() => {
    persistOffsets(bubbleOffset, panelOffset);
  }, [bubbleOffset, panelOffset]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleBubbleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    setBubbleOffset((current) => ({
      x: current.x + info.offset.x,
      y: current.y + info.offset.y,
    }));
    window.setTimeout(() => {
      bubbleDraggedRef.current = false;
    }, 0);
  };

  const handlePanelDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    setPanelOffset((current) => ({
      x: current.x + info.offset.x,
      y: current.y + info.offset.y,
    }));
  };

  const handleBubbleClick = () => {
    if (bubbleDraggedRef.current) {
      return;
    }
    setOpen(true);
  };

  return (
    <div ref={boundsRef} className="pointer-events-none fixed inset-0 z-[61]">
      <AnimatePresence>
        {open && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto fixed inset-0 z-[62] bg-slate-950/30 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-0"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <MotionDiv
              drag
              dragControls={panelDragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.08}
              dragConstraints={boundsRef}
              style={{ x: panelOffset.x, y: panelOffset.y }}
              onDragEnd={handlePanelDragEnd}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="pointer-events-auto absolute right-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[63] flex h-[min(32rem,calc(100dvh-8.5rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] border border-border-gray bg-surface shadow-2xl dark:border-zinc-800 sm:right-5 sm:bottom-8 sm:h-[min(34rem,calc(100dvh-6rem))] lg:right-8 lg:bottom-10"
              role="dialog"
              aria-modal="true"
              aria-label={i18nT('copilot.title', 'Ask Cradlyn AI')}
              onClick={(event: React.MouseEvent) => event.stopPropagation()}
            >
              <CareCopilotChat
                babyId={babyId}
                babyName={babyName}
                variant="panel"
                className="h-full min-h-0"
                onClose={() => setOpen(false)}
                onHeaderPointerDown={(event) => panelDragControls.start(event)}
              />
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {!open && (
        <MotionDiv
          drag
          dragMomentum={false}
          dragElastic={0.12}
          dragConstraints={boundsRef}
          style={{ x: bubbleOffset.x, y: bubbleOffset.y }}
          onDragStart={() => {
            bubbleDraggedRef.current = false;
          }}
          onDrag={() => {
            bubbleDraggedRef.current = true;
          }}
          onDragEnd={handleBubbleDragEnd}
          className="pointer-events-auto absolute right-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:right-5 sm:bottom-6 lg:right-6 xl:right-8"
        >
          <button
            type="button"
            onClick={handleBubbleClick}
            className="group relative flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-secondary text-white shadow-[0_12px_40px_rgba(37,99,235,0.45)] transition hover:scale-105 active:cursor-grabbing active:scale-95"
            aria-label={i18nT('copilot.open', 'Open Care Copilot')}
            title={i18nT('copilot.dragHint', 'Drag to move · Tap to open')}
          >
            <span className="absolute inset-0 rounded-full bg-secondary/30 blur-md transition group-hover:scale-110" />
            <span className="relative">
              <MessageCircle size={22} />
            </span>
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-secondary shadow">
              <Sparkles size={11} />
            </span>
          </button>
        </MotionDiv>
      )}
    </div>
  );
};
