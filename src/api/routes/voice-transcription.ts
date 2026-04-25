/**
 * Voice Transcription & Analysis API Routes
 * Endpoints for transcribing voice memos and analyzing crying patterns
 */

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/voice/upload
 * Upload and transcribe voice memo
 */
export async function uploadVoiceMemo(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, category = 'general' } = req.body;

    if (!userId || !babyId || !req.file) {
      return res.status(400).json({ error: 'Missing required fields or file' });
    }

    // Upload to Supabase Storage
    const fileName = `${babyId}/${Date.now()}-${uuidv4()}.wav`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice_logs')
      .upload(fileName, req.file.buffer, {
        contentType: 'audio/wav',
        metadata: {
          userId,
          babyId,
          uploadedAt: new Date().toISOString(),
        },
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('voice_logs')
      .getPublicUrl(fileName);

    // Transcribe audio
    const transcription = await transcribeAudio(req.file.buffer);

    // Analyze if it's a cry recording
    let cryAnalysis = null;
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
        storage_url: publicUrl.publicUrl,
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

    return res.status(201).json({
      success: true,
      voiceLog,
      transcription: transcription.text,
      cryAnalysis,
      message: 'Voice memo uploaded and transcribed',
    });
  } catch (error) {
    console.error('Voice upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/voice/logs
 * Get voice logs for a baby
 */
export async function getVoiceLogs(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, category, limit = 20, offset = 0 } = req.query;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    return res.json({
      success: true,
      logs: logs || [],
      count: logs?.length || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/voice/analyze-cry
 * Analyze crying pattern from audio
 */
export async function analyzeCry(req: Request, res: Response) {
  try {
    const { voiceLogId } = req.body;

    if (!voiceLogId) {
      return res.status(400).json({ error: 'Voice log ID required' });
    }

    // Get voice log
    const { data: voiceLog, error: fetchError } = await supabase
      .from('voice_logs')
      .select('*')
      .eq('id', voiceLogId)
      .single();

    if (fetchError || !voiceLog) {
      return res.status(404).json({ error: 'Voice log not found' });
    }

    // Download audio file
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('voice_logs')
      .download(voiceLog.storage_url.split('/voice_logs/')[1]);

    if (downloadError) throw downloadError;

    // Analyze
    const analysis = await analyzeCryPattern(audioData as Buffer);

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
  } catch (error) {
    console.error('Cry analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/voice/cry-patterns
 * Get cry pattern trends over time
 */
export async function getCryPatterns(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, daysBack = 30 } = req.query;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/voice/export-memories
 * Export voice logs as memories/scrapbook
 */
export async function exportVoiceLogsAsMemories(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, startDate, endDate } = req.body;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/voice/:voiceLogId
 * Delete a voice log
 */
export async function deleteVoiceLog(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { voiceLogId } = req.params;

    if (!userId || !voiceLogId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get log to get storage path
    const { data: log, error: fetchError } = await supabase
      .from('voice_logs')
      .select('storage_url')
      .eq('id', voiceLogId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !log) {
      return res.status(404).json({ error: 'Voice log not found' });
    }

    // Delete from storage
    const fileName = log.storage_url.split('/voice_logs/')[1];
    await supabase.storage.from('voice_logs').remove([fileName]);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('voice_logs')
      .delete()
      .eq('id', voiceLogId);

    if (deleteError) throw deleteError;

    return res.json({ success: true, message: 'Voice log deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Helper functions

async function transcribeAudio(audioBuffer: Buffer): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    // Use Google Cloud Speech-to-Text or Azure Speech API
    // This is a placeholder - implement with actual API

    if (process.env.SPEECH_API_SERVICE === 'google') {
      // Google Cloud implementation
      // const speech = require('@google-cloud/speech');
      // Implementation here
    } else if (process.env.SPEECH_API_SERVICE === 'azure') {
      // Azure implementation
      // Implementation here
    }

    // Mock response for now
    return {
      text: 'Sample transcription from voice memo',
      confidence: 0.85,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      text: '',
      confidence: 0,
    };
  }
}

async function analyzeCryPattern(audioBuffer: Buffer): Promise<{
  primary_cry_type: string;
  confidence: number;
  pain_level: number;
  hunger_probability: number;
  tiredness_probability: number;
  discomfort_probability: number;
  recommendations: string[];
}> {
  try {
    // Use ML service to analyze cry patterns
    // This could be TensorFlow.js, custom ML model, or cloud service

    // Mock analysis for now
    const cryTypes = ['hungry', 'tired', 'uncomfortable', 'need_change', 'normal'];
    const randomType = cryTypes[Math.floor(Math.random() * cryTypes.length)];

    return {
      primary_cry_type: randomType,
      confidence: 0.7 + Math.random() * 0.25,
      pain_level: Math.random() * 10,
      hunger_probability: Math.random(),
      tiredness_probability: Math.random(),
      discomfort_probability: Math.random(),
      recommendations: [
        'Check diaper',
        'Ensure baby is comfortable',
        'Consider feeding time',
      ],
    };
  } catch (error) {
    console.error('Cry analysis error:', error);
    return {
      primary_cry_type: 'unknown',
      confidence: 0,
      pain_level: 0,
      hunger_probability: 0,
      tiredness_probability: 0,
      discomfort_probability: 0,
      recommendations: [],
    };
  }
}

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
