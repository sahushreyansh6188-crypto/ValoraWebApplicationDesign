import { buildApp } from './app.js';
import { env } from './config/env.js';

async function start() {
  const app = buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.log(`\n🌿 VALORA Backend Service listening at: ${address}`);
    console.log(`📡 API Base: ${address}${env.API_PREFIX}`);
    console.log(`💬 WebSocket Gateway: ws://${env.HOST}:${env.PORT}/ws/chat`);
    console.log(`💚 Health Check: ${address}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
