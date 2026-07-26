import React from 'react';
import { Bot, GripHorizontal, Send, Sparkles, X } from 'lucide-react';
import { askCareCopilot, type CareCopilotMessage } from '@/lib/ml-insights-service';
import { i18nT } from '@/lib/i18n';

const DEFAULT_GREETING = i18nT(
  'copilot.greeting',
  "Hi! I'm your Cradlyn care copilot. Ask about sleep, feeding, vaccine timing, or growth trends.",
);

const SUGGESTED_PROMPTS = [
  i18nT('copilot.promptSleep', 'Should we adjust bedtime this week?'),
  i18nT('copilot.promptFeeding', 'How often should we feed today?'),
  i18nT('copilot.promptVaccines', 'What vaccines are coming up next?'),
];

interface CareCopilotChatProps {
  babyId: string;
  babyName: string;
  variant?: 'compact' | 'full' | 'panel';
  className?: string;
  onClose?: () => void;
  onHeaderPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
}

export const CareCopilotChat: React.FC<CareCopilotChatProps> = ({
  babyId,
  babyName,
  variant = 'full',
  className = '',
  onClose,
  onHeaderPointerDown,
}) => {
  const [copilotPrompt, setCopilotPrompt] = React.useState('');
  const [copilotHistory, setCopilotHistory] = React.useState<CareCopilotMessage[]>([
    { role: 'assistant', content: DEFAULT_GREETING },
  ]);
  const [copilotModel, setCopilotModel] = React.useState('cradlyn-guidance');
  const [copilotProvider, setCopilotProvider] = React.useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = React.useState(false);
  const transcriptRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setCopilotHistory([{ role: 'assistant', content: DEFAULT_GREETING }]);
    setCopilotModel('cradlyn-guidance');
    setCopilotProvider(null);
    setCopilotPrompt('');
  }, [babyId]);

  React.useEffect(() => {
    const node = transcriptRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [copilotHistory, copilotLoading]);

  const handleAskCopilot = async (questionOverride?: string) => {
    const question = String(questionOverride ?? copilotPrompt).trim();
    if (!question || copilotLoading) {
      return;
    }

    const nextHistory: CareCopilotMessage[] = [...copilotHistory, { role: 'user', content: question }];
    setCopilotHistory(nextHistory);
    setCopilotPrompt('');
    setCopilotLoading(true);

    const answer = await askCareCopilot(babyId, question, nextHistory);
    setCopilotLoading(false);

    if (!answer) {
      setCopilotHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: i18nT(
            'copilot.error',
            'I could not generate a response right now. Please try again in a moment, and contact your pediatrician for urgent concerns.',
          ),
        },
      ]);
      return;
    }

    setCopilotModel(answer.usedModel || 'cradlyn-guidance');
    setCopilotProvider(answer.usedProvider || null);
    setCopilotHistory((prev) => [...prev, { role: 'assistant', content: answer.response }]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleAskCopilot();
  };

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleAskCopilot();
    }
  };

  const engineLabel =
    copilotProvider === 'openai' || copilotProvider === 'qwen'
      ? copilotModel
      : i18nT('copilot.engineGuidance', 'Cradlyn guidance');

  const isPanel = variant === 'panel';
  const isCompact = variant === 'compact';
  const transcriptHeightClass = isPanel
    ? 'min-h-0 flex-1'
    : isCompact
      ? 'max-h-52'
      : 'max-h-72';

  const shellClass = isPanel
    ? `flex h-full min-h-0 flex-col bg-surface dark:bg-zinc-950 ${className}`
    : `rounded-[2rem] border border-border-gray bg-surface shadow-sm dark:border-zinc-800 sm:rounded-[2.5rem] ${className}`;

  return (
    <section className={shellClass}>
      <div
        className={`border-b border-border-gray dark:border-zinc-800 ${
          isPanel ? 'shrink-0 px-4 py-3 sm:px-5' : 'px-5 py-4 sm:px-6 sm:py-5'
        } ${isPanel && onHeaderPointerDown ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
        onPointerDown={isPanel ? onHeaderPointerDown : undefined}
      >
        {isPanel && onHeaderPointerDown && (
          <div className="mb-2 flex items-center justify-center text-text-light">
            <GripHorizontal size={18} aria-hidden="true" />
            <span className="ml-2 text-[10px] font-black uppercase tracking-[0.18em]">
              {i18nT('copilot.dragToMove', 'Drag to move')}
            </span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 text-secondary">
              <Sparkles size={isPanel ? 14 : 16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {i18nT('copilot.badge', 'Care Copilot')}
              </span>
            </div>
            <h3
              className={`font-headline font-black tracking-tight text-foreground ${
                isPanel ? 'text-lg' : 'text-xl sm:text-2xl'
              }`}
            >
              {i18nT('copilot.title', 'Ask Cradlyn AI')}
            </h3>
            <p className={`mt-0.5 font-semibold text-text-dim ${isPanel ? 'text-xs' : 'text-sm'}`}>
              {i18nT('copilot.subtitle', 'Questions about {name} use your logged care data.').replace(
                '{name}',
                babyName,
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isPanel && (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                <Bot size={20} />
              </div>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                onPointerDown={(event) => event.stopPropagation()}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-gray bg-surface-gray text-foreground transition hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900"
                aria-label={i18nT('copilot.close', 'Close Care Copilot')}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        {!isPanel && (
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-text-light">
            {i18nT('copilot.engine', 'Engine')}: {engineLabel}
          </p>
        )}
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          isPanel ? 'gap-3 px-4 py-3 sm:px-5 sm:py-4' : 'space-y-4 px-5 py-4 sm:px-6 sm:py-5'
        }`}
      >
        <div
          ref={transcriptRef}
          className={`${transcriptHeightClass} space-y-2 overflow-y-auto rounded-[1.4rem] border border-border-gray bg-surface-gray p-3 dark:border-zinc-800 dark:bg-zinc-900/60`}
        >
          {copilotHistory.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                entry.role === 'user'
                  ? 'ml-6 bg-secondary text-white'
                  : 'mr-6 bg-surface text-foreground dark:bg-zinc-950'
              }`}
            >
              {entry.content}
            </div>
          ))}
          {copilotLoading && (
            <div className="mr-6 rounded-2xl bg-surface px-3 py-2 text-sm text-text-dim dark:bg-zinc-950">
              {i18nT('copilot.thinking', 'Thinking...')}
            </div>
          )}
        </div>

        <div className={`shrink-0 space-y-3 ${isPanel ? 'pb-[env(safe-area-inset-bottom)]' : ''}`}>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void handleAskCopilot(prompt)}
              disabled={copilotLoading}
              className="rounded-full border border-border-gray bg-surface-gray px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-text-dim transition-all hover:border-secondary hover:text-secondary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="care-copilot-input" className="sr-only">
            {i18nT('copilot.inputLabel', 'Ask a care question')}
          </label>
          <textarea
            id="care-copilot-input"
            value={copilotPrompt}
            onChange={(event) => setCopilotPrompt(event.target.value)}
            onKeyDown={handlePromptKeyDown}
            rows={isPanel ? 2 : isCompact ? 2 : 3}
            placeholder={i18nT(
              'copilot.placeholder',
              'Ask something like: Is this sleep pattern normal for their age?',
            )}
            className="w-full resize-none rounded-[1.4rem] border border-border-gray bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-text-light focus:border-secondary focus:ring-2 focus:ring-secondary/20 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={copilotLoading || !copilotPrompt.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            {copilotLoading
              ? i18nT('copilot.generating', 'Generating...')
              : i18nT('copilot.ask', 'Ask Copilot')}
          </button>
        </form>

        <p className="text-[11px] leading-relaxed text-text-light">
          {i18nT(
            'copilot.disclaimer',
            'Care Copilot offers general guidance only. Contact your pediatrician for urgent or medical concerns.',
          )}
        </p>
        </div>
      </div>
    </section>
  );
};
