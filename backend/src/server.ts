import { buildApp } from './app.js';
import { env } from './config/env.js';

async function start() {
  const app = buildApp();

  // Graceful shutdown handling for Render and container lifecycles
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    try {
      await app.close();
      console.log('✅ VALORA Backend shut down gracefully.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

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
