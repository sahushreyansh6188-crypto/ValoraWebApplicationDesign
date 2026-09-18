import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import fs from 'fs';

async function main() {
  let db: PGlite;
  try {
    if (fs.existsSync('./.pgdata/postmaster.pid')) {
      fs.unlinkSync('./.pgdata/postmaster.pid');
    }
    db = new PGlite('./.pgdata');
    await db.waitReady;
  } catch (err) {
    console.warn('Recovering .pgdata due to aborted state:', err);
    try {
      fs.rmSync('./.pgdata', { recursive: true, force: true });
    } catch {}
    db = new PGlite('./.pgdata');
    await db.waitReady;
  }

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
