import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { MessageCircle, Send } from 'lucide-react';
import { useAuthStore } from '@/app/AppContext';
import {
  type CareTeamChatMessage,
  getCareTeamMessages,
  sendCareTeamMessage,
  subscribeToCareTeamMessages,
} from '@/lib/care-team-chat-service';

interface CareTeamChatProps {
  babyId: string;
  babyName: string;
}

const resolveSenderRole = (profileType?: string): CareTeamChatMessage['sender_role'] => {
  if (profileType === 'doctor') return 'doctor';
  if (profileType === 'caregiver') return 'caregiver';
  return 'parent';
};

export function CareTeamChat({ babyId, babyName }: CareTeamChatProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<CareTeamChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const profileType = user?.user_metadata?.onboarding_profile_type as string | undefined;
  const senderRole = useMemo(() => resolveSenderRole(profileType), [profileType]);
  const userId = user?.id;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const rows = await getCareTeamMessages(babyId);
      if (!mounted) return;
      setMessages(rows);
      setLoading(false);
    };

    load();

    const unsubscribe = subscribeToCareTeamMessages(babyId, (message) => {
      setMessages((prev) => {
        if (prev.some((entry) => entry.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [babyId]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setSending(true);
    const created = await sendCareTeamMessage(babyId, trimmed, senderRole);
    setSending(false);

    if (created) {
      setMessages((prev) => {
        if (prev.some((entry) => entry.id === created.id)) {
          return prev;
        }
        return [...prev, created];
      });
      setDraft('');
    }
  };

  return (
    <Card className="border border-border-gray dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Care Team Chat
        </CardTitle>
        <CardDescription>
          Shared messages for {babyName}. Parents, caregivers, and doctors can coordinate updates here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-72 overflow-y-auto rounded-xl border border-border-gray dark:border-zinc-800 bg-background p-3 space-y-2">
          {loading ? (
            <p className="text-xs font-semibold text-text-light">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-xs font-semibold text-text-light">
              No messages yet. Start with a quick care update for the team.
            </p>
          ) : (
            messages.map((message) => {
              const mine = userId && message.sender_id === userId;
              return (
                <div
                  key={message.id}
                  className={`rounded-xl px-3 py-2 text-xs ${
                    mine
                      ? 'bg-secondary text-white ml-8'
                      : 'bg-surface-gray dark:bg-zinc-900 text-foreground mr-8 border border-border-gray dark:border-zinc-800'
                  }`}
                >
                  <p className={`font-black uppercase tracking-wider ${mine ? 'text-white/80' : 'text-text-light'}`}>
                    {message.sender_name} - {message.sender_role}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words font-semibold">{message.message_text}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-text-light'}`}>
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="Share updates, reminders, or care instructions..."
            className="text-sm"
          />
          <Button onClick={handleSend} disabled={sending || !draft.trim()} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
