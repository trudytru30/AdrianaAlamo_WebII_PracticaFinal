import rateLimit from 'express-rate-limit';

const defaults = {
  standardHeaders: true, // devuelve cabeceras RateLimit-* estándar
  legacyHeaders:   false,
  handler: (_req, res) => {
    res.status(429).json({
      status:  'error',
      message: 'Demasiadas peticiones, inténtalo de nuevo más tarde.',
    });
  },
};

/** Límite general para todas las rutas */
export const globalLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit:    200,
});

/** Límite estricto para endpoints de autenticación (register, login) */
export const authLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  limit:    20,
  message:  'Demasiados intentos de autenticación, inténtalo en 15 minutos.',
});

/** Límite para operaciones de escritura en la API */
export const writeLimiter = rateLimit({
  ...defaults,
  windowMs: 10 * 60 * 1000, // 10 minutos
  limit:    100,
});
