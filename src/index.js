import { createServer } from 'http';
import app from './app.js';
import { connectDB } from './config/database.js';
import config from './config/index.js';
import mongoose from 'mongoose';
import logger from './utils/logger.js';

const server = createServer(app);

const start = async () => {
  await connectDB(config.MONGO_URI);
  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, '🚀 Servidor arrancado');
  });
};

process.on('SIGTERM', () => {
  logger.warn('SIGTERM recibido — cerrando servidor');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  logger.warn('SIGINT recibido — cerrando servidor');
  server.close(() => process.exit(0));
});

start().catch((err) => {
  logger.fatal({ err }, 'Error al arrancar el servidor');
  process.exit(1);
});

export { server };
