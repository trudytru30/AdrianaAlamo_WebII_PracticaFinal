import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async (uri) => {
  const conn = await mongoose.connect(uri);
  logger.info({ host: conn.connection.host }, 'MongoDB conectado');
};

mongoose.connection.on('disconnected', () =>
  logger.warn('MongoDB desconectado')
);
mongoose.connection.on('error', (err) =>
  logger.error({ err }, 'MongoDB error')
);
