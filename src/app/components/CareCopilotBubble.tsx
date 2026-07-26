import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { CareCopilotChat } from './CareCopilotChat';
import { i18nT } from '@/lib/i18n';

interface CareCopilotBubbleProps {
  babyId: string;
  babyName: string;
}

const MotionDiv = motion.div as any;

export const CareCopilotBubble: React.FC<CareCopilotBubbleProps> = ({ babyId, babyName }) => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [babyId]);

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

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[62] bg-slate-950/35 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-0"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <MotionDiv
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-[4.75rem] z-[63] overflow-hidden rounded-[1.75rem] border border-border-gray bg-surface shadow-2xl dark:border-zinc-800 sm:inset-x-auto sm:right-5 sm:bottom-6 sm:top-auto sm:h-[min(34rem,calc(100dvh-6rem))] sm:w-[min(24rem,calc(100vw-2rem))] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-[5.5rem] xl:right-[6.5rem]"
              role="dialog"
              aria-modal="true"
              aria-label={i18nT('copilot.title', 'Ask Cradlyn AI')}
            >
              <CareCopilotChat
                babyId={babyId}
                babyName={babyName}
                variant="panel"
                className="h-full"
                onClose={() => setOpen(false)}
              />
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed right-3 z-[61] bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:right-5 sm:bottom-6 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-6 xl:right-8">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="pointer-events-auto group relative flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-[0_12px_40px_rgba(37,99,235,0.45)] transition hover:scale-105 active:scale-95"
          aria-expanded={open}
          aria-label={
            open
              ? i18nT('copilot.close', 'Close Care Copilot')
              : i18nT('copilot.open', 'Open Care Copilot')
          }
        >
          <span className="absolute inset-0 rounded-full bg-secondary/30 blur-md transition group-hover:scale-110" />
          <span className="relative">
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </span>
          {!open && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-secondary shadow">
              <Sparkles size={11} />
            </span>
          )}
        </button>
      </div>
    </>
  );
};
