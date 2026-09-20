import { GoogleGenAI } from '@google/genai';
import { AppError } from '../../utils/errors.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw AppError.internal('GEMINI_API_KEY environment variable is required for audio transcription.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export class TranscribeService {
  async transcribeAudio(audioBase64: string, mimeType = 'audio/webm'): Promise<string> {
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw AppError.badRequest('Audio data is required as a base64 string.');
    }

    // Strip data URL prefix if provided (e.g. data:audio/webm;base64,...)
    const cleanData = audioBase64.includes(',')
      ? audioBase64.split(',')[1]
      : audioBase64;

    // Normalize standard audio mime types
    let cleanMime = mimeType;
    if (cleanMime.includes(';')) {
      cleanMime = cleanMime.split(';')[0];
    }
    if (!cleanMime || cleanMime === 'audio') {
      cleanMime = 'audio/webm';
    }

    const ai = getAiClient();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanData,
              },
            },
            {
              text: 'Transcribe this voice audio message clearly and accurately into text. Return only the transcription.',
            },
          ],
        },
      });

      const transcribedText = response.text ? response.text.trim() : '';
      return transcribedText;
    } catch (err: any) {
      console.error('[TranscribeService] Transcription error:', err?.message || err);
      throw AppError.internal(`Failed to transcribe audio: ${err?.message || 'Unknown error'}`);
    }
  }
}
