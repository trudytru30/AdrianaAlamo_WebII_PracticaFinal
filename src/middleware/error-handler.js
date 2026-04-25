import { AppError } from '../utils/AppError.js';
import { notifySlack } from '../services/logger.service.js';
import logger from '../utils/logger.js';

/** Captura rutas no encontradas y las convierte en AppError 404 */
export const notFound = (req, res, next) =>
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));

/** Middleware de errores centralizado — debe ir AL FINAL de app.js */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  // Errores no operacionales (bugs reales) — log estructurado + notificación Slack
  if (statusCode >= 500) {
    logger.error(
      { err, path: req.originalUrl, method: req.method },
      'Error 5XX'
    );
    notifySlack(err, req).catch(() => {});
  }

  res.status(statusCode).json({
    status: 'error',
    message: isOperational ? err.message : 'Ha ocurrido un error interno',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.message,
    }),
  });
};
