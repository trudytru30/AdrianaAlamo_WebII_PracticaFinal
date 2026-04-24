import pino from 'pino';

/**
 * Logger centralizado con Pino.
 *
 * - Desarrollo:  pino-pretty (legible, con colores, sin pid/hostname)
 * - Producción:  JSON puro (líneas parseables por Datadog, CloudWatch…)
 * - Test:        nivel 'silent' — no contamina la salida de Jest
 */
const logger = pino({
  level: process.env.LOG_LEVEL
    ?? (process.env.NODE_ENV === 'test'       ? 'silent'
      : process.env.NODE_ENV === 'production' ? 'info'
      : 'debug'),

  ...(process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
    ? {
        transport: {
          target:  'pino-pretty',
          options: {
            colorize:      true,
            translateTime: 'HH:MM:ss',
            ignore:        'pid,hostname',
          },
        },
      }
    : {}),
});

export default logger;
