import { parseRequestBody, setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http';
import { createSupabaseAdminClient, getAuthenticatedUser } from '../_shared/supabase';

const extractStoragePath = (audioUrl?: string, storageKey?: string): string | null => {
  if (storageKey) {
    return storageKey.replace(/^voice-logs\//, '');
  }

  if (!audioUrl) return null;

  try {
    const parsed = new URL(audioUrl);
    const marker = '/storage/v1/object/public/voice-logs/';
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
};

const transcribeAudio = async (audioBuffer: Buffer): Promise<string> => {
  const endpoint = process.env.SPEECH_TRANSCRIBE_ENDPOINT;
  if (!endpoint) {
    return '';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SPEECH_TRANSCRIBE_API_KEY
        ? { Authorization: `Bearer ${process.env.SPEECH_TRANSCRIBE_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      audioBase64: audioBuffer.toString('base64'),
    }),
  });

  if (!response.ok) {
    throw new Error(`Transcription provider failed (${response.status})`);
  }

  const payload = (await response.json()) as { text?: string };
  return String(payload.text || '').trim();
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const body = parseRequestBody(req.body);
  const voiceLogId = String(body.voice_log_id || body.voiceLogId || '').trim();
  const audioUrl = String(body.audio_url || '').trim() || undefined;
  if (!voiceLogId) {
    res.status(400).json({ success: false, error: 'Missing voice_log_id' });
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: voiceLog, error: fetchError } = await supabase
      .from('voice_logs')
      .select('id, transcription, audio_url, storage_key')
      .eq('id', voiceLogId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!voiceLog) {
      res.status(404).json({ success: false, error: 'Voice log not found' });
      return;
    }

    if (voiceLog.transcription) {
      res.status(200).json({ success: true, transcription: voiceLog.transcription });
      return;
    }

    const storagePath = extractStoragePath(audioUrl || voiceLog.audio_url, voiceLog.storage_key);
    if (!storagePath) {
      res.status(200).json({
        success: true,
        transcription: '',
        message: 'No storage path available for transcription.',
      });
      return;
    }

    const { data: audioBlob, error: downloadError } = await supabase.storage
      .from('voice-logs')
      .download(storagePath);

    if (downloadError || !audioBlob) throw downloadError || new Error('Unable to load audio file');

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const transcription = await transcribeAudio(audioBuffer);

    if (transcription) {
      await supabase.from('voice_logs').update({ transcription }).eq('id', voiceLogId);
    }

    res.status(200).json({ success: true, transcription });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to transcribe audio',
    });
  }
}
