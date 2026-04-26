import { supabase } from './supabase';

export interface VoiceLog {
  id: string;
  baby_id: string;
  audio_url: string;
  storage_key?: string;
  transcription?: string;
  duration_seconds: number;
  log_type: 'memory' | 'feed' | 'sleep' | 'health' | 'general';
  created_at: string;
}

export interface VoiceRecognitionResult {
  id: string;
  voice_log_id: string;
  cry_type?: 'hunger' | 'tired' | 'diaper' | 'pain' | 'unknown';
  confidence_score: number;
}

const getJsonHeaders = async (): Promise<Record<string, string>> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();
  const accessToken: string | undefined = session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

/**
 * Record and upload voice memo
 */
export async function uploadVoiceMemo(
  babyId: string,
  audioBlob: Blob,
  logType: 'memory' | 'feed' | 'sleep' | 'health' | 'general'
): Promise<VoiceLog | null> {
  try {
    // Get duration from blob
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const durationSeconds = Math.round(audioBuffer.duration);

    // Upload to storage
    const fileName = `voice-logs/${babyId}/${logType}_${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-logs')
      .upload(fileName, audioBlob);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('voice-logs')
      .getPublicUrl(fileName);

    // Save to database
    const { data, error } = await supabase
      .from('voice_logs')
      .insert({
        baby_id: babyId,
        audio_url: publicUrl.publicUrl,
        storage_key: fileName,
        duration_seconds: durationSeconds,
        log_type: logType,
      })
      .select()
      .single();

    if (error) throw error;

    // Queue for transcription (async)
    transcribeVoiceLog(data.id, publicUrl.publicUrl);

    return data;
  } catch (err) {
    console.error('Error uploading voice memo:', err);
    return null;
  }
}

/**
 * Transcribe voice log using speech-to-text API
 */
export async function transcribeVoiceLog(voiceLogId: string, audioUrl: string): Promise<string | null> {
  try {
    // Call backend transcription service
    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: await getJsonHeaders(),
      body: JSON.stringify({
        voice_log_id: voiceLogId,
        audio_url: audioUrl,
      }),
    });

    if (!response.ok) throw new Error('Transcription failed');

    const { transcription } = await response.json();

    // Update voice log with transcription
    const { error } = await supabase
      .from('voice_logs')
      .update({ transcription })
      .eq('id', voiceLogId);

    if (error) throw error;
    return transcription;
  } catch (err) {
    console.error('Error transcribing voice log:', err);
    return null;
  }
}

/**
 * Analyze cry pattern in voice log
 */
export async function analyzeCryPattern(voiceLogId: string): Promise<VoiceRecognitionResult | null> {
  try {
    // Get voice log
    const { data: voiceLog } = await supabase
      .from('voice_logs')
      .select('*')
      .eq('id', voiceLogId)
      .single();

    if (!voiceLog) return null;

    // Call ML service for cry analysis
    const response = await fetch('/api/voice/analyze-cry', {
      method: 'POST',
      headers: await getJsonHeaders(),
      body: JSON.stringify({
        audio_url: voiceLog.audio_url,
      }),
    });

    if (!response.ok) throw new Error('Analysis failed');

    const { cry_type, confidence } = await response.json();

    // Save result
    const { data, error } = await supabase
      .from('voice_recognition_results')
      .insert({
        voice_log_id: voiceLogId,
        cry_type,
        confidence_score: confidence,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error analyzing cry:', err);
    return null;
  }
}

/**
 * Get voice logs for a baby
 */
export async function getVoiceLogs(
  babyId: string,
  logType?: string,
  limit = 20,
  offset = 0
): Promise<VoiceLog[]> {
  try {
    let query = supabase
      .from('voice_logs')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logType) {
      query = query.eq('log_type', logType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching voice logs:', err);
    return [];
  }
}

/**
 * Delete voice log
 */
export async function deleteVoiceLog(voiceLogId: string, storageKey: string): Promise<boolean> {
  try {
    // Delete from storage
    if (storageKey) {
      await supabase.storage.from('voice-logs').remove([storageKey]);
    }

    // Delete from database
    const { error } = await supabase.from('voice_logs').delete().eq('id', voiceLogId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting voice log:', err);
    return false;
  }
}

/**
 * Export voice logs as memory entries
 */
export async function exportVoiceLogsAsMemories(
  babyId: string,
  voiceLogIds: string[]
): Promise<boolean> {
  try {
    // Get voice logs with transcriptions
    const { data: voiceLogs } = await supabase
      .from('voice_logs')
      .select('*')
      .in('id', voiceLogIds);

    if (!voiceLogs) return false;

    // Create memory entries from transcriptions
    const memories = voiceLogs.map((log) => ({
      baby_id: babyId,
      content: log.transcription || 'Voice log - no transcription',
      tags: [log.log_type, 'voice'],
      created_at: log.created_at,
    }));

    const { error } = await supabase.from('memories').insert(memories);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error exporting voice logs:', err);
    return false;
  }
}
