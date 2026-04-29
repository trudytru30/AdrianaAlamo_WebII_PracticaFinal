import request from 'supertest';
import { dbConnect, dbClear, dbClose } from './setup.js';
import {
  createUserWithCompany,
  createClient,
  createProject,
  fakeId,
} from './helpers/factories.js';
import { authHeader } from './helpers/auth.js';
import app from '../src/app.js';

let user, company, client, token;

beforeAll(dbConnect);
afterAll(dbClose);

beforeEach(async () => {
  await dbClear();
  ({ user, company } = await createUserWithCompany());
  client = await createClient(company._id, user._id);
  token  = authHeader(user._id);
});

// ── POST /api/project ─────────────────────────────────────────────────────────
describe('POST /api/project', () => {
  it('crea un proyecto y devuelve 201', async () => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', token)
      .send({
        client:      client._id.toString(),
        name:        'Obra Principal',
        projectCode: 'OBR-001',
      });

    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe('Obra Principal');
    expect(res.body.project.projectCode).toBe('OBR-001');
  });

  it('rechaza cliente de otra compañía (404)', async () => {
    const { company: oc, user: ou } = await createUserWithCompany();
    const foreignClient = await createClient(oc._id, ou._id);

    const res = await request(app)
      .post('/api/project')
      .set('Authorization', token)
      .send({
        client:      foreignClient._id.toString(),
        name:        'Obra Ajena',
        projectCode: 'OBR-002',
      });

    expect(res.status).toBe(404);
  });

  it('rechaza código de proyecto duplicado (409)', async () => {
    await createProject(company._id, user._id, client._id, { projectCode: 'DUP-001' });

    const res = await request(app)
      .post('/api/project')
      .set('Authorization', token)
      .send({
        client:      client._id.toString(),
        name:        'Otro Proyecto',
        projectCode: 'DUP-001',
      });

    expect(res.status).toBe(409);
  });
});

// ── GET /api/project/:id ──────────────────────────────────────────────────────
describe('GET /api/project/:id', () => {
  it('devuelve el proyecto con populate de cliente', async () => {
    const project = await createProject(company._id, user._id, client._id);

    const res = await request(app)
      .get(`/api/project/${project._id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.project._id).toBe(project._id.toString());
    expect(res.body.project.client).toHaveProperty('name');
  });

  it('devuelve 404 para proyecto inexistente', async () => {
    const res = await request(app)
      .get(`/api/project/${fakeId()}`)
      .set('Authorization', token);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/project/:id ──────────────────────────────────────────────────────
describe('PUT /api/project/:id', () => {
  it('actualiza el nombre del proyecto', async () => {
    const project = await createProject(company._id, user._id, client._id);

    const res = await request(app)
      .put(`/api/project/${project._id}`)
      .set('Authorization', token)
      .send({ name: 'Nombre Modificado' });

    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe('Nombre Modificado');
  });
});

// ── GET /api/project (listado paginado) ───────────────────────────────────────
describe('GET /api/project', () => {
  it('lista proyectos con paginación correcta (page=1)', async () => {
    for (let i = 0; i < 3; i++) {
      await createProject(company._id, user._id, client._id, { projectCode: `P-${i}` });
    }

    const res = await request(app)
      .get('/api/project?page=1&limit=10')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination.totalItems).toBe(3);
  });
});

// ── Archivar y restaurar ──────────────────────────────────────────────────────
describe('Archivar y restaurar proyectos', () => {
  it('archiva un proyecto con ?soft=true', async () => {
    const project = await createProject(company._id, user._id, client._id);

    const res = await request(app)
      .delete(`/api/project/${project._id}?soft=true`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/archivado/i);
  });

  it('lista proyectos archivados', async () => {
    const project = await createProject(company._id, user._id, client._id);
    await request(app)
      .delete(`/api/project/${project._id}?soft=true`)
      .set('Authorization', token);

    const res = await request(app)
      .get('/api/project/archived')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('restaura un proyecto archivado', async () => {
    const project = await createProject(company._id, user._id, client._id);
    await request(app)
      .delete(`/api/project/${project._id}?soft=true`)
      .set('Authorization', token);

    const res = await request(app)
      .patch(`/api/project/${project._id}/restore`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.project._id).toBe(project._id.toString());
  });

  it('devuelve 404 al restaurar un proyecto no archivado', async () => {
    const project = await createProject(company._id, user._id, client._id);

    const res = await request(app)
      .patch(`/api/project/${project._id}/restore`)
      .set('Authorization', token);

    expect(res.status).toBe(404);
  });
});
