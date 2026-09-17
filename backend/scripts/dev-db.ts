import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

async function main() {
  const db = new PGlite('./.pgdata');
  await db.waitReady;
  const server = new PGLiteSocketServer({
    db,
    port: 5432,
    host: '127.0.0.1',
    maxConnections: 100,
  });
  await server.start();
  console.log('VALORA local PostgreSQL wire server listening on 127.0.0.1:5432');

  // Keep process alive indefinitely
  setInterval(() => {}, 1000 * 60 * 60);
}

process.on('uncaughtException', (err) => {
  console.error('dev-db warning (uncaughtException):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('dev-db warning (unhandledRejection):', reason);
});

main().catch((err) => {
  console.error('Failed to start local PostgreSQL server:', err);
  process.exit(1);
});
