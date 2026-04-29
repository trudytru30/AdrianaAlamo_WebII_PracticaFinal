import request from 'supertest';
import { dbConnect, dbClear, dbClose } from './setup.js';
import { createUserWithCompany, createClient, fakeId } from './helpers/factories.js';
import { authHeader } from './helpers/auth.js';
import app from '../src/app.js';

let user, company, token;

beforeAll(dbConnect);
afterAll(dbClose);

beforeEach(async () => {
  await dbClear();
  ({ user, company } = await createUserWithCompany());
  token = authHeader(user._id);
});

// ── POST /api/client ──────────────────────────────────────────────────────────
describe('POST /api/client', () => {
  it('crea un cliente y devuelve 201', async () => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', token)
      .send({ name: 'Acme SL', cif: 'B12345678', email: 'acme@test.com' });

    expect(res.status).toBe(201);
    expect(res.body.client.name).toBe('Acme SL');
    expect(res.body.client.company).toBe(company._id.toString());
  });

  it('rechaza CIF duplicado en la misma compañía (409)', async () => {
    await createClient(company._id, user._id, { cif: 'B12345678' });

    const res = await request(app)
      .post('/api/client')
      .set('Authorization', token)
      .send({ name: 'Otro', cif: 'B12345678' });

    expect(res.status).toBe(409);
  });

  it('rechaza sin token (401)', async () => {
    const res = await request(app)
      .post('/api/client')
      .send({ name: 'Acme', cif: 'B12345678' });
    expect(res.status).toBe(401);
  });

  it('rechaza si falta el nombre (400)', async () => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', token)
      .send({ cif: 'B12345678' });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/client/:id ───────────────────────────────────────────────────────
describe('GET /api/client/:id', () => {
  it('devuelve el cliente por id', async () => {
    const client = await createClient(company._id, user._id);

    const res = await request(app)
      .get(`/api/client/${client._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.client._id).toBe(client._id.toString());
  });

  it('devuelve 404 para id inexistente', async () => {
    const res = await request(app)
      .get(`/api/client/${fakeId()}`)
      .set('Authorization', token);
    expect(res.status).toBe(404);
  });

  it('devuelve 404 para cliente de otra compañía', async () => {
    const { company: otherCo, user: otherUser } = await createUserWithCompany();
    const foreign = await createClient(otherCo._id, otherUser._id);

    const res = await request(app)
      .get(`/api/client/${foreign._id}`)
      .set('Authorization', token);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/client/:id ───────────────────────────────────────────────────────
describe('PUT /api/client/:id', () => {
  it('actualiza el nombre del cliente', async () => {
    const client = await createClient(company._id, user._id);

    const res = await request(app)
      .put(`/api/client/${client._id}`)
      .set('Authorization', token)
      .send({ name: 'Nombre Actualizado' });

    expect(res.status).toBe(200);
    expect(res.body.client.name).toBe('Nombre Actualizado');
  });
});

// ── GET /api/client ───────────────────────────────────────────────────────────
describe('GET /api/client', () => {
  it('lista los clientes de la compañía', async () => {
    await createClient(company._id, user._id);
    await createClient(company._id, user._id);

    const res = await request(app)
      .get('/api/client')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.pagination.totalItems).toBe(2);
  });

  // 🐛 BUG 3: este test falla hasta que se aplique el fix del commit 25.
  // Con page=1 y limit=10: skip = 1*10 = 10 → salta los 5 clientes → data=[]
  // Correcto: skip = (1-1)*10 = 0 → devuelve los 5 clientes
  it('page=1 devuelve los primeros resultados (detecta BUG 3)', async () => {
    for (let i = 0; i < 5; i++) {
      await createClient(company._id, user._id);
    }

    const res = await request(app)
      .get('/api/client?page=1&limit=10')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
  });
});

// ── DELETE y soft delete ──────────────────────────────────────────────────────
describe('DELETE /api/client/:id', () => {
  it('elimina (hard delete) el cliente', async () => {
    const client = await createClient(company._id, user._id);

    const res = await request(app)
      .delete(`/api/client/${client._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  it('archiva (soft delete) con ?soft=true', async () => {
    const client = await createClient(company._id, user._id);

    const res = await request(app)
      .delete(`/api/client/${client._id}?soft=true`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/archivado/i);
  });
});

// ── Archivar y restaurar ──────────────────────────────────────────────────────
describe('GET /api/client/archived y PATCH /:id/restore', () => {
  it('lista clientes archivados', async () => {
    const client = await createClient(company._id, user._id);
    await request(app)
      .delete(`/api/client/${client._id}?soft=true`)
      .set('Authorization', token);

    const res = await request(app)
      .get('/api/client/archived')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('restaura un cliente archivado', async () => {
    const client = await createClient(company._id, user._id);
    await request(app)
      .delete(`/api/client/${client._id}?soft=true`)
      .set('Authorization', token);

    const res = await request(app)
      .patch(`/api/client/${client._id}/restore`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.client._id).toBe(client._id.toString());
  });
});
