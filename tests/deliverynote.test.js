import request from 'supertest';
import { jest } from '@jest/globals';
import { dbConnect, dbClear, dbClose } from './setup.js';
import {
  createUserWithCompany,
  createClient,
  createProject,
  createDeliveryNote,
  fakeId,
} from './helpers/factories.js';
import { authHeader } from './helpers/auth.js';

/**
 * Con ESM, los import estáticos se ejecutan ANTES que cualquier código del
 * módulo, incluyendo jest.unstable_mockModule. Por eso hay que registrar el
 * mock PRIMERO y cargar `app` después mediante import dinámico.
 */
jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  uploadImage:    jest.fn().mockResolvedValue('https://cdn.example.com/sig.webp'),
  uploadPdf:      jest.fn().mockResolvedValue('https://cdn.example.com/note.pdf'),
  deleteResource: jest.fn().mockResolvedValue(undefined),
}));

// PNG mínimo (1×1 px) para tests de firma sin depender de Cloudinary
const SIGNATURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

let app;
let user, company, client, project, token;

beforeAll(async () => {
  // Importar app después de registrar el mock
  ({ default: app } = await import('../src/app.js'));
  await dbConnect();
});
afterAll(dbClose);

beforeEach(async () => {
  await dbClear();
  ({ user, company } = await createUserWithCompany());
  client  = await createClient(company._id, user._id);
  project = await createProject(company._id, user._id, client._id);
  token   = authHeader(user._id);
});

// ── POST /api/deliverynote ────────────────────────────────────────────────────
describe('POST /api/deliverynote', () => {
  it('crea un albarán de horas y devuelve 201', async () => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', token)
      .send({
        project:     project._id.toString(),
        client:      client._id.toString(),
        format:      'hours',
        description: 'Jornada de trabajo',
        workDate:    new Date().toISOString(),
        hours:       8,
        workers:     [{ name: 'Pepe', hours: 8 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.deliveryNote.format).toBe('hours');
  });

  it('crea un albarán de materiales y devuelve 201', async () => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', token)
      .send({
        project:     project._id.toString(),
        client:      client._id.toString(),
        format:      'material',
        description: 'Suministro de materiales',
        workDate:    new Date().toISOString(),
        material:    'Cemento',
        quantity:    50,
        unit:        'kg',
      });

    expect(res.status).toBe(201);
    expect(res.body.deliveryNote.format).toBe('material');
  });

  it('rechaza proyecto de otra compañía (404)', async () => {
    const { company: oc, user: ou } = await createUserWithCompany();
    const oc2 = await createClient(oc._id, ou._id);
    const op  = await createProject(oc._id, ou._id, oc2._id);

    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', token)
      .send({
        project:     op._id.toString(),
        client:      client._id.toString(),
        format:      'hours',
        description: 'Test',
        workDate:    new Date().toISOString(),
      });

    expect(res.status).toBe(404);
  });
});

// ── GET /api/deliverynote/:id ─────────────────────────────────────────────────
describe('GET /api/deliverynote/:id', () => {
  it('devuelve el albarán con populate de client y project', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id);

    const res = await request(app)
      .get(`/api/deliverynote/${note._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.deliveryNote._id).toBe(note._id.toString());
    expect(res.body.deliveryNote.client).toHaveProperty('name');
    expect(res.body.deliveryNote.project).toHaveProperty('name');
  });

  it('devuelve 404 para albarán inexistente', async () => {
    const res = await request(app)
      .get(`/api/deliverynote/${fakeId()}`)
      .set('Authorization', token);
    expect(res.status).toBe(404);
  });
});

// ── GET /api/deliverynote ─────────────────────────────────────────────────────
describe('GET /api/deliverynote', () => {
  it('lista albaranes con paginación correcta', async () => {
    await createDeliveryNote(company._id, user._id, client._id, project._id);
    await createDeliveryNote(company._id, user._id, client._id, project._id);

    const res = await request(app)
      .get('/api/deliverynote?page=1&limit=10')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

// ── DELETE /api/deliverynote/:id ──────────────────────────────────────────────
describe('DELETE /api/deliverynote/:id', () => {
  it('elimina un albarán no firmado', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id);

    const res = await request(app)
      .delete(`/api/deliverynote/${note._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  it('rechaza eliminar un albarán firmado (409)', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id, {
      signed: true,
    });

    const res = await request(app)
      .delete(`/api/deliverynote/${note._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(409);
  });
});

// ── PATCH /api/deliverynote/:id/sign ─────────────────────────────────────────
describe('PATCH /api/deliverynote/:id/sign', () => {
  it('firma un albarán con imagen PNG válida (200)', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id);

    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', token)
      .attach('signature', SIGNATURE_PNG, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.deliveryNote.signed).toBe(true);
    expect(res.body.signatureUrl).toBeDefined();
    expect(res.body.pdfUrl).toBeDefined();
  });

  it('rechaza firmar un albarán ya firmado (409)', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id, {
      signed: true,
    });

    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', token)
      .attach('signature', SIGNATURE_PNG, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(409);
  });

  it('rechaza archivo con mimetype no permitido (400)', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id);

    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', token)
      .attach('signature', Buffer.from('%PDF-1.4 fake'), {
        filename:    'doc.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
  });
});

// ── GET /api/deliverynote/pdf/:id ─────────────────────────────────────────────
describe('GET /api/deliverynote/pdf/:id', () => {
  it('genera PDF al vuelo para albarán sin firma', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id);

    const res = await request(app)
      .get(`/api/deliverynote/pdf/${note._id}`)
      .set('Authorization', token);

    // Sin firma → genera PDF en memoria y lo envía
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  it('redirige al pdfUrl si el albarán ya está firmado (302)', async () => {
    const note = await createDeliveryNote(company._id, user._id, client._id, project._id, {
      signed: true,
      pdfUrl: 'https://cdn.example.com/note.pdf',
    });

    const res = await request(app)
      .get(`/api/deliverynote/pdf/${note._id}`)
      .set('Authorization', token)
      .redirects(0); // no seguir la redirección

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://cdn.example.com/note.pdf');
  });
});
