import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import router from './routes/index.js';
import { notFound, errorHandler } from './middleware/error-handler.js';
import { globalLimiter } from './middleware/rate-limit.js';

const app = express();

// ── Seguridad ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: true }));
// Express 5: req.query es un getter sin setter — lo convertimos en objeto
// plano escribible para que express-mongo-sanitize pueda sanitizarlo
app.use((req, _res, next) => {
  Object.defineProperty(req, 'query', {
    value:        { ...req.query },
    writable:     true,
    configurable: true,
    enumerable:   true,
  });
  next();
});
app.use(mongoSanitize());
app.use(hpp());
app.use(globalLimiter);

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Archivos estáticos ────────────────────────────────────────────────────────
app.use(express.static('public'));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/', router);

// ── Manejo de errores ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
