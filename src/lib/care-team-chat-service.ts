import { getCurrentUser, supabase } from './supabase';

export interface CareTeamChatMessage {
  id: string;
  baby_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'parent' | 'doctor' | 'caregiver' | 'admin' | 'member';
  message_text: string;
  created_at: string;
}

const isMissingTableError = (error: unknown): boolean => {
  const value = String((error as any)?.message || (error as any)?.details || '').toLowerCase();
  return value.includes('does not exist') || value.includes('relation');
};

export async function getCareTeamMessages(
  babyId: string,
  limit = 100,
): Promise<CareTeamChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('care_team_messages')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []) as CareTeamChatMessage[];
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('care_team_messages table missing. Run latest SQL migration to enable chat.');
      return [];
    }
    console.error('Failed to fetch care team messages:', error);
    return [];
  }
}

export async function sendCareTeamMessage(
  babyId: string,
  messageText: string,
  senderRole: CareTeamChatMessage['sender_role'] = 'member',
): Promise<CareTeamChatMessage | null> {
  try {
    const user = await getCurrentUser();
    if (!user?.id || !String(messageText).trim()) {
      return null;
    }

    const senderName =
      String(user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Care Team').trim();

    const { data, error } = await supabase
      .from('care_team_messages')
      .insert({
        baby_id: babyId,
        sender_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        message_text: String(messageText).trim(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as CareTeamChatMessage;
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('care_team_messages table missing. Run latest SQL migration to enable chat.');
      return null;
    }
    console.error('Failed to send care team message:', error);
    return null;
  }
}

export const subscribeToCareTeamMessages = (
  babyId: string,
  onMessage: (message: CareTeamChatMessage) => void,
) => {
  const channel = supabase
    .channel(`care-team-chat:${babyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'care_team_messages',
        filter: `baby_id=eq.${babyId}`,
      },
      (payload: any) => {
        if (payload?.new) {
          onMessage(payload.new as CareTeamChatMessage);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};
