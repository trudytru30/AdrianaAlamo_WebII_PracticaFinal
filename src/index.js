import { createServer } from 'http';
import app from './app.js';
import { connectDB } from './config/database.js';
import config from './config/index.js';
import { initSocketIO } from './sockets/index.js';
import mongoose from 'mongoose';
import logger from './utils/logger.js';

const server = createServer(app);

// Inicializar Socket.IO sobre el mismo servidor HTTP
initSocketIO(server);

const start = async () => {
  await connectDB(config.MONGO_URI);
  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, '🚀 Servidor arrancado');
    logger.info('🔌 Socket.IO escuchando');
  });
};

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.warn({ signal }, 'Señal recibida — iniciando graceful shutdown');

  server.close(async () => {
    logger.info('Servidor HTTP cerrado');
    try {
      await mongoose.connection.close();
      logger.info('Conexión MongoDB cerrada');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error al cerrar MongoDB');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Timeout de shutdown alcanzado — forzando salida');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandledRejection');
  shutdown('unhandledRejection');
});

start().catch((err) => {
  logger.fatal({ err }, 'Error al arrancar el servidor');
  process.exit(1);
});

export { server };
