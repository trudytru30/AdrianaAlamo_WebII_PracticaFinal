/**
 * Tests de utilidades, middleware y servicios sin HTTP.
 * Cubre ramas no alcanzadas por los tests de integración:
 *   - AppError — todos los statics + validation(array)
 *   - error-handler — errores 5XX y errores no operacionales
 *   - pdf.service — formato material y albarán firmado sin buffer
 *   - mail.service — rutas de retorno temprano cuando SMTP no configurado
 *   - middleware/upload — handleMulterError con distintos códigos Multer
 */

import { jest } from '@jest/globals';
import { PassThrough } from 'stream';

// ── Mocks previos a importaciones estáticas ───────────────────────────────────
jest.unstable_mockModule('../src/services/logger.service.js', () => ({
  notifySlack: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

let AppError, errorHandler, pipeDeliveryNotePdf, generateDeliveryNotePdf,
    sendVerificationEmail, sendPasswordResetEmail, handleMulterError;

beforeAll(async () => {
  ({ AppError }                          = await import('../src/utils/AppError.js'));
  ({ errorHandler }                      = await import('../src/middleware/error-handler.js'));
  ({ pipeDeliveryNotePdf,
     generateDeliveryNotePdf }           = await import('../src/services/pdf.service.js'));
  ({ sendVerificationEmail,
     sendPasswordResetEmail }            = await import('../src/services/mail.service.js'));
  ({ handleMulterError }                 = await import('../src/middleware/upload.js'));
});

// ─────────────────────────────────────────────────────────────────────────────
// AppError
// ─────────────────────────────────────────────────────────────────────────────
describe('AppError — métodos estáticos', () => {
  it('notFound devuelve 404 con mensaje por defecto', () => {
    const e = AppError.notFound();
    expect(e.statusCode).toBe(404);
    expect(e.isOperational).toBe(true);
    expect(e.message).toBeTruthy();
  });

  it('notFound acepta mensaje personalizado', () => {
    const e = AppError.notFound('Entidad no existe');
    expect(e.message).toBe('Entidad no existe');
  });

  it('conflict devuelve 409', () => {
    expect(AppError.conflict().statusCode).toBe(409);
  });

  it('forbidden devuelve 403', () => {
    const e = AppError.forbidden('Acceso denegado');
    expect(e.statusCode).toBe(403);
    expect(e.message).toBe('Acceso denegado');
  });

  it('forbidden usa mensaje por defecto', () => {
    expect(AppError.forbidden().statusCode).toBe(403);
  });

  it('unauthorized devuelve 401', () => {
    expect(AppError.unauthorized().statusCode).toBe(401);
  });

  it('tooManyRequests devuelve 429', () => {
    const e = AppError.tooManyRequests();
    expect(e.statusCode).toBe(429);
  });

  it('tooManyRequests acepta mensaje personalizado', () => {
    const e = AppError.tooManyRequests('Rate limit alcanzado');
    expect(e.message).toBe('Rate limit alcanzado');
  });

  it('internal devuelve 500', () => {
    const e = AppError.internal();
    expect(e.statusCode).toBe(500);
  });

  it('internal acepta mensaje personalizado', () => {
    const e = AppError.internal('Fallo en BD');
    expect(e.message).toBe('Fallo en BD');
  });

  it('validation con array de issues genera mensaje compuesto', () => {
    const e = AppError.validation([
      { path: ['email'],    message: 'Invalid email' },
      { path: ['password'], message: 'Too short'     },
    ]);
    expect(e.statusCode).toBe(400);
    expect(e.message).toContain('email: Invalid email');
    expect(e.message).toContain('password: Too short');
  });

  it('validation con string directo', () => {
    const e = AppError.validation('Campo obligatorio');
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe('Campo obligatorio');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler middleware
// ─────────────────────────────────────────────────────────────────────────────
describe('errorHandler middleware', () => {
  const makeRes = () => {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
  };
  const makeReq = () => ({ originalUrl: '/test', method: 'GET' });

  it('responde con el statusCode del AppError operacional', () => {
    const err = AppError.notFound('No encontrado');
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No encontrado' })
    );
  });

  it('oculta el mensaje en errores no operacionales (500)', () => {
    const err = new Error('Error inesperado de la BD');  // no operacional
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Ha ocurrido un error interno');
  });

  it('incluye stack en desarrollo (NODE_ENV=development)', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = AppError.validation('Campo requerido');
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('stack');
    expect(body).toHaveProperty('details');
    process.env.NODE_ENV = original;
  });

  it('notifySlack se llama para errores 5XX', async () => {
    const { notifySlack } = await import('../src/services/logger.service.js');
    notifySlack.mockClear();
    const err = AppError.internal('Error de servidor');
    const res = makeRes();
    errorHandler(err, makeReq(), res, () => {});
    await new Promise(r => setTimeout(r, 10)); // espera la Promise de notifySlack
    expect(notifySlack).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pdf.service — ramas no cubiertas
// ─────────────────────────────────────────────────────────────────────────────
describe('pdf.service — generateDeliveryNotePdf', () => {
  // Nota mínima suficiente para generar el PDF
  const baseNote = {
    _id:         'abc123',
    workDate:    new Date(),
    description: 'Test',
    format:      'hours',
    hours:       8,
    workers:     [],
    signed:      false,
    updatedAt:   new Date(),
    client:      { name: 'Cliente SA', cif: 'B12345678', email: 'c@test.com' },
    project:     { name: 'Proyecto X', projectCode: 'PX-01' },
  };

  it('genera PDF para albarán de horas sin operarios', async () => {
    const buf = await generateDeliveryNotePdf(baseNote);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('genera PDF para albarán de horas CON operarios', async () => {
    const note = { ...baseNote, workers: [{ name: 'Pepe', hours: 8 }] };
    const buf = await generateDeliveryNotePdf(note);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('genera PDF para albarán de MATERIALES', async () => {
    const note = {
      ...baseNote,
      format:   'material',
      material: 'Cemento',
      quantity: 50,
      unit:     'kg',
    };
    const buf = await generateDeliveryNotePdf(note);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('genera PDF para albarán FIRMADO sin buffer de firma', async () => {
    const note = { ...baseNote, signed: true };
    const buf = await generateDeliveryNotePdf(note);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('genera PDF con buffer de firma embebida (PNG 1×1)', async () => {
    const sigBuf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const buf = await generateDeliveryNotePdf(baseNote, sigBuf);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mail.service — retorno temprano cuando SMTP no configurado
// ─────────────────────────────────────────────────────────────────────────────
describe('mail.service — SMTP no configurado (entorno dev/test)', () => {
  it('sendVerificationEmail no lanza aunque SMTP no esté configurado', async () => {
    await expect(
      sendVerificationEmail('test@example.com', '123456')
    ).resolves.toBeUndefined();
  });

  it('sendPasswordResetEmail no lanza aunque SMTP no esté configurado', async () => {
    await expect(
      sendPasswordResetEmail('test@example.com', '654321')
    ).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// handleMulterError — ramas de códigos Multer
// ─────────────────────────────────────────────────────────────────────────────
describe('handleMulterError middleware', () => {
  let multer;

  beforeAll(async () => {
    multer = (await import('multer')).default;
  });

  it('convierte LIMIT_FILE_SIZE en AppError 400', () => {
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    const next = jest.fn();
    handleMulterError(err, {}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it('convierte otro MulterError en AppError 400', () => {
    const err = new multer.MulterError('LIMIT_FILE_COUNT');
    err.message = 'Too many files';
    const next = jest.fn();
    handleMulterError(err, {}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('pasa errores no-Multer al siguiente middleware', () => {
    const err = new Error('Error genérico');
    const next = jest.fn();
    handleMulterError(err, {}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
