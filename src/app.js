import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import router from './routes/index.js';
import { notFound, errorHandler } from './middleware/error-handler.js';
import { globalLimiter } from './middleware/rate-limit.js';
import { swaggerSpec } from './config/swagger.js';

const app = express();

// ── Seguridad ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrcAttr: ["'unsafe-inline'"],          // permite onclick/onsubmit en la UI de prueba
      styleSrc:      ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc:        ["'self'", 'data:', 'https:'],
      connectSrc:    ["'self'"],
      fontSrc:       ["'self'", 'https:', 'data:'],
      objectSrc:     ["'none'"],
      frameAncestors:["'self'"],
      baseUri:       ["'self'"],
      formAction:    ["'self'"],
    },
  },
}));                                // cabeceras HTTP seguras
app.use(cors({ origin: true }));    // CORS — permitir cualquier origen (restringir en producción)
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
app.use(mongoSanitize());           // previene inyección NoSQL ($, .)
app.use(hpp());                     // previene contaminación de parámetros HTTP
app.use(globalLimiter);             // rate limit global (200 req / 15 min)

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'BildyApp API Docs',
}));

// ── Interfaz de prueba (archivos estáticos) ───────────────────────────────────
app.use(express.static('public'));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/', router);

// ── Manejo de errores ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
