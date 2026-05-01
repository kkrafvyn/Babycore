/**
 * Voice Transcription & Analysis API Routes
 * Endpoints for transcribing voice memos and analyzing crying patterns
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { AuthRequest } from '../middleware/auth.js';
import {
  buildStorageReference,
  createSignedStorageUrl,
  ensureBabyAccess,
  ensureRecordBabyAccess,
} from '../utils/baby-access.js';

const router = Router();

type CryAnalysis = {
  primary_cry_type: string;
  confidence: number;
  pain_level: number;
  hunger_probability: number;
  tiredness_probability: number;
  discomfort_probability: number;
  recommendations: string[];
};

const extractVoiceStoragePath = (storageUrl: string): string | null => {
  if (!storageUrl) return null;
  const marker = '/voice-logs/';
  const legacyMarker = '/voice_logs/';

  if (storageUrl.includes(marker)) {
    return storageUrl.split(marker)[1] || null;
  }

  if (storageUrl.includes(legacyMarker)) {
    return storageUrl.split(legacyMarker)[1] || null;
  }

  const internalMarker = 'storage://voice-logs/';
  if (storageUrl.startsWith(internalMarker)) {
    return storageUrl.slice(internalMarker.length) || null;
  }

  return null;
};

const getVoiceStoragePath = (voiceLog: { storage_key?: string | null; storage_url?: string | null }): string | null =>
  String(voiceLog?.storage_key || '').trim() || extractVoiceStoragePath(String(voiceLog?.storage_url || ''));

/**
 * POST /api/voice/upload
 * Upload and transcribe voice memo
 */
export async function uploadVoiceMemo(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, category = 'general' } = req.body;

    if (!userId || !babyId || !req.file) {
      return res.status(400).json({ error: 'Missing required fields or file' });
    }

    if (
      !(await ensureBabyAccess(req, res, String(babyId), {
        write: true,
        forbiddenMessage: 'You do not have permission to upload voice logs for this baby',
      }))
    )
      return;

    // Upload to Supabase Storage
    const fileName = `${babyId}/${Date.now()}-${uuidv4()}.wav`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-logs')
      .upload(fileName, req.file.buffer, {
        contentType: 'audio/wav',
        metadata: {
          userId,
          babyId,
          uploadedAt: new Date().toISOString(),
        },
      });

    if (uploadError) throw uploadError;

    // Transcribe audio
    const transcription = await transcribeAudio(req.file.buffer);

    // Analyze if it's a cry recording
    let cryAnalysis: CryAnalysis | null = null;
    if (category === 'cry') {
      cryAnalysis = await analyzeCryPattern(req.file.buffer);
    }

    // Save to database
    const { data: voiceLog, error: dbError } = await supabase
      .from('voice_logs')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: userId,
        storage_key: fileName,
        storage_url: buildStorageReference('voice-logs', fileName),
        category,
        transcription: transcription.text,
        confidence: transcription.confidence,
        cry_analysis: cryAnalysis,
        duration_seconds: req.file.size / (16 * 1000), // Approximate
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const signedUrl = await createSignedStorageUrl('voice-logs', fileName);

    return res.status(201).json({
      success: true,
      voiceLog: {
        ...voiceLog,
        storage_url: signedUrl,
        audio_url: signedUrl,
      },
      transcription: transcription.text,
      cryAnalysis,
      message: 'Voice memo uploaded and transcribed',
    });
  } catch (error: any) {
    console.error('Voice upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/voice/logs
 * Get voice logs for a baby
 */
export async function getVoiceLogs(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, category, limit = 20, offset = 0 } = req.query;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    let query = supabase
      .from('voice_logs')
      .select('*')
      .eq('baby_id', babyId)
      .eq('user_id', userId);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    const signedLogs = await Promise.all(
      (logs || []).map(async (log: any) => {
        const storagePath = getVoiceStoragePath(log);
        const signedUrl = await createSignedStorageUrl('voice-logs', storagePath);
        return {
          ...log,
          storage_url: signedUrl || log.storage_url || null,
          audio_url: signedUrl || log.audio_url || null,
        };
      }),
    );

    return res.json({
      success: true,
      logs: signedLogs,
      count: signedLogs.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/voice/analyze-cry
 * Analyze crying pattern from audio
 */
export async function analyzeCry(req: AuthRequest, res: Response) {
  try {
    const { voiceLogId } = req.body;

    if (!voiceLogId) {
      return res.status(400).json({ error: 'Voice log ID required' });
    }

    // Get voice log
    const voiceLog = await ensureRecordBabyAccess<{
      id: string;
      baby_id: string;
      storage_key?: string | null;
      storage_url?: string | null;
    }>(req, res, {
      table: 'voice_logs',
      idValue: String(voiceLogId),
      select: 'id,baby_id,storage_key,storage_url',
      write: true,
      missingMessage: 'Voice log not found',
    });
    if (!voiceLog) return;

    // Download audio file
    const storagePath = getVoiceStoragePath(voiceLog);
    if (!storagePath) {
      return res.status(400).json({ error: 'Voice file path is invalid' });
    }

    const { data: audioData, error: downloadError } = await supabase.storage
      .from('voice-logs')
      .download(storagePath);

    if (downloadError) throw downloadError;

    // Analyze
    const audioBuffer = Buffer.from(await audioData.arrayBuffer());
    const analysis = await analyzeCryPattern(audioBuffer);

    // Update database
    await supabase
      .from('voice_logs')
      .update({ cry_analysis: analysis })
      .eq('id', voiceLogId);

    return res.json({
      success: true,
      analysis,
      cryType: analysis.primary_cry_type,
      confidence: analysis.confidence,
      message: 'Cry pattern analyzed',
    });
  } catch (error: any) {
    console.error('Cry analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/voice/cry-patterns
 * Get cry pattern trends over time
 */
export async function getCryPatterns(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, daysBack = 30 } = req.query;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(daysBack));

    const { data: logs, error } = await supabase
      .from('voice_logs')
      .select('cry_analysis, created_at')
      .eq('baby_id', babyId)
      .eq('user_id', userId)
      .eq('category', 'cry')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Analyze patterns
    const patterns = analyzeCryTrends(logs || []);

    return res.json({
      success: true,
      patterns,
      totalRecordings: logs?.length || 0,
      period: `Last ${daysBack} days`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/voice/export-memories
 * Export voice logs as memories/scrapbook
 */
export async function exportVoiceLogsAsMemories(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, startDate, endDate } = req.body;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (
      !(await ensureBabyAccess(req, res, String(babyId), {
        write: true,
        forbiddenMessage: 'You do not have permission to export memories for this baby',
      }))
    )
      return;

    let query = supabase
      .from('voice_logs')
      .select('*')
      .eq('baby_id', babyId)
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    // Create a memory entry
    const { data: memory, error: memoryError } = await supabase
      .from('ai_scrapbook_entries')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: userId,
        entry_type: 'voice_collection',
        title: `Voice Memos (${logs?.length || 0} recordings)`,
        content: {
          voiceLogIds: logs?.map(l => l.id) || [],
          count: logs?.length || 0,
          dateRange: {
            start: startDate,
            end: endDate,
          },
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memoryError) throw memoryError;

    return res.json({
      success: true,
      memory,
      exportedLogs: logs?.length || 0,
      message: 'Voice logs exported to memories',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/voice/:voiceLogId
 * Delete a voice log
 */
export async function deleteVoiceLog(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { voiceLogId } = req.params;

    if (!userId || !voiceLogId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const log = await ensureRecordBabyAccess<{
      id: string;
      baby_id: string;
      storage_key?: string | null;
      storage_url?: string | null;
    }>(req, res, {
      table: 'voice_logs',
      idValue: String(voiceLogId),
      select: 'id,baby_id,storage_key,storage_url',
      write: true,
      missingMessage: 'Voice log not found',
    });
    if (!log) return;

    // Delete from storage
    const fileName = getVoiceStoragePath(log);
    if (fileName) {
      await supabase.storage.from('voice-logs').remove([fileName]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('voice_logs')
      .delete()
      .eq('id', voiceLogId);

    if (deleteError) throw deleteError;

    return res.json({ success: true, message: 'Voice log deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Helper functions

async function transcribeAudio(audioBuffer: Buffer): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    const endpoint = process.env.SPEECH_TRANSCRIBE_ENDPOINT;
    if (!endpoint) {
      return {
        text: '',
        confidence: 0,
      };
    }

    const response = await axios.post(
      endpoint,
      {
        audioBase64: audioBuffer.toString('base64'),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SPEECH_TRANSCRIBE_API_KEY
            ? { Authorization: `Bearer ${process.env.SPEECH_TRANSCRIBE_API_KEY}` }
            : {}),
        },
      },
    );

    const text = String(response.data?.text || '').trim();
    const confidence = Number(response.data?.confidence ?? 0);

    return {
      text,
      confidence: Number.isFinite(confidence) ? confidence : 0,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      text: '',
      confidence: 0,
    };
  }
}

async function analyzeCryPattern(audioBuffer: Buffer): Promise<CryAnalysis> {
  try {
    const endpoint = process.env.CRY_ANALYSIS_ENDPOINT;
    if (!endpoint) {
      return {
        primary_cry_type: 'unclassified',
        confidence: 0,
        pain_level: 0,
        hunger_probability: 0,
        tiredness_probability: 0,
        discomfort_probability: 0,
        recommendations: ['Enable a cry-analysis provider to classify this recording.'],
      };
    }

    const response = await axios.post(
      endpoint,
      {
        audioBase64: audioBuffer.toString('base64'),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRY_ANALYSIS_API_KEY
            ? { Authorization: `Bearer ${process.env.CRY_ANALYSIS_API_KEY}` }
            : {}),
        },
      },
    );

    const data = response.data || {};

    return {
      primary_cry_type: String(data.primary_cry_type || 'unclassified'),
      confidence: Number.isFinite(Number(data.confidence)) ? Number(data.confidence) : 0,
      pain_level: Number.isFinite(Number(data.pain_level)) ? Number(data.pain_level) : 0,
      hunger_probability: Number.isFinite(Number(data.hunger_probability)) ? Number(data.hunger_probability) : 0,
      tiredness_probability: Number.isFinite(Number(data.tiredness_probability)) ? Number(data.tiredness_probability) : 0,
      discomfort_probability: Number.isFinite(Number(data.discomfort_probability)) ? Number(data.discomfort_probability) : 0,
      recommendations: Array.isArray(data.recommendations)
        ? data.recommendations.map((item: any) => String(item))
        : [],
    };
  } catch (error) {
    console.error('Cry analysis error:', error);
    return {
      primary_cry_type: 'unclassified',
      confidence: 0,
      pain_level: 0,
      hunger_probability: 0,
      tiredness_probability: 0,
      discomfort_probability: 0,
      recommendations: [],
    };
  }
}

router.post('/upload', uploadVoiceMemo);
router.get('/logs', getVoiceLogs);
router.post('/analyze-cry', analyzeCry);
router.get('/cry-patterns', getCryPatterns);
router.post('/export-memories', exportVoiceLogsAsMemories);
router.delete('/:voiceLogId', deleteVoiceLog);

export default router;

function analyzeCryTrends(
  logs: any[]
): {
  mostCommonType: string;
  averagePainLevel: number;
  trendByDay: { [key: string]: any };
} {
  if (!logs.length) {
    return {
      mostCommonType: 'unknown',
      averagePainLevel: 0,
      trendByDay: {},
    };
  }

  const byType: { [key: string]: number } = {};
  let totalPain = 0;
  const trendByDay: { [key: string]: any } = {};

  for (const log of logs) {
    const analysis = log.cry_analysis || {};
    const type = analysis.primary_cry_type || 'unknown';
    const date = new Date(log.created_at).toLocaleDateString();

    byType[type] = (byType[type] || 0) + 1;
    totalPain += analysis.pain_level || 0;

    if (!trendByDay[date]) {
      trendByDay[date] = { count: 0, types: {}, avgPain: 0 };
    }
    trendByDay[date].count++;
    trendByDay[date].types[type] = (trendByDay[date].types[type] || 0) + 1;
    trendByDay[date].avgPain = (trendByDay[date].avgPain + (analysis.pain_level || 0)) / 2;
  }

  const mostCommonType = Object.entries(byType).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';

  return {
    mostCommonType,
    averagePainLevel: totalPain / logs.length,
    trendByDay,
  };
}
