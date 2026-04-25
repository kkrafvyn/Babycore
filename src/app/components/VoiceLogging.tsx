import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Mic, Square, Play, Trash2 } from 'lucide-react';
import { uploadVoiceMemo, getVoiceLogs, deleteVoiceLog, VoiceLog } from '@/lib/voice-logging-service';

interface VoiceLoggingProps {
  babyId: string;
  babyName: string;
}

export function VoiceLogging({ babyId, babyName }: VoiceLoggingProps) {
  const [recording, setRecording] = useState(false);
  const [logs, setLogs] = useState<VoiceLog[]>([]);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleUploadVoice(audioBlob, 'memory');
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleUploadVoice = async (audioBlob: Blob, logType: string) => {
    setUploading(true);
    const voiceLog = await uploadVoiceMemo(babyId, audioBlob, logType as any);
    if (voiceLog) {
      setLogs([voiceLog, ...logs]);
    }
    setUploading(false);
  };

  const handleDelete = async (logId: string, storageKey: string) => {
    if (!confirm('Delete this voice log?')) return;

    const success = await deleteVoiceLog(logId, storageKey);
    if (success) {
      setLogs(logs.filter((l) => l.id !== logId));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Memo
          </CardTitle>
          <CardDescription>Quick voice notes about {babyName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading}
            size="lg"
            className="w-full"
            variant={recording ? 'destructive' : 'default'}
          >
            {recording ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>

          {uploading && <p className="text-sm text-center text-gray-500">Processing audio...</p>}
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Memos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <Play className="h-4 w-4 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <audio
                    src={log.audio_url}
                    controls
                    className="w-full h-6 text-xs"
                  />
                  {log.transcription && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {log.transcription}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(log.id, log.storage_key || '')}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
