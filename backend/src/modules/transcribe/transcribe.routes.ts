import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { TranscribeService } from './transcribe.service.js';
import { optionalAuthenticate } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';

const transcribeSchema = z.object({
  audioBase64: z.string().min(1, 'Audio data is required'),
  mimeType: z.string().optional().default('audio/webm'),
});

export const transcribeRoutes: FastifyPluginAsync = async (fastify) => {
  const transcribeService = new TranscribeService();

  fastify.post('/transcribe', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { audioBase64, mimeType } = transcribeSchema.parse(request.body);
    const text = await transcribeService.transcribeAudio(audioBase64, mimeType);
    return sendSuccess(reply, { text });
  });
};

export default transcribeRoutes;
