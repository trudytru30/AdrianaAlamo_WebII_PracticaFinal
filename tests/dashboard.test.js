import request from 'supertest';
import app from '../src/app.js';
import { dbConnect, dbClear, dbClose } from './setup.js';
import {
  createUserWithCompany,
  createClient,
  createProject,
  createDeliveryNote,
} from './helpers/factories.js';
import { authHeader } from './helpers/auth.js';

beforeAll(dbConnect);
afterEach(dbClear);
afterAll(dbClose);

describe('GET /api/dashboard', () => {
  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('devuelve resumen vacío cuando no hay albaranes (200)', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.summary.total).toBe(0);
    expect(res.body.summary.signed).toBe(0);
    expect(res.body.summary.pending).toBe(0);
    expect(res.body.notesByMonth).toHaveLength(0);
    expect(res.body.hoursByProject).toHaveLength(0);
    expect(res.body.materialsByClient).toHaveLength(0);
  });

  it('agrega correctamente albaranes de horas y materiales', async () => {
    const { user, company } = await createUserWithCompany();
    const client  = await createClient(company._id, user._id);
    const project = await createProject(company._id, user._id, client._id);

    // Dos albaranes de horas (8h cada uno)
    await createDeliveryNote(company._id, user._id, client._id, project._id, {
      format: 'hours', hours: 8, signed: false,
    });
    await createDeliveryNote(company._id, user._id, client._id, project._id, {
      format: 'hours', hours: 4, signed: true,
    });
    // Un albarán de materiales
    await createDeliveryNote(company._id, user._id, client._id, project._id, {
      format: 'material', material: 'Cemento', quantity: 50, unit: 'kg',
    });

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);

    // Resumen global
    expect(res.body.summary.total).toBe(3);
    expect(res.body.summary.signed).toBe(1);
    expect(res.body.summary.pending).toBe(2);
    expect(res.body.summary.totalHours).toBe(12);

    // Por mes — debe haber al menos 1 entrada
    expect(res.body.notesByMonth.length).toBeGreaterThanOrEqual(1);
    const thisMonth = res.body.notesByMonth[0];
    expect(thisMonth).toHaveProperty('year');
    expect(thisMonth).toHaveProperty('month');
    expect(thisMonth).toHaveProperty('count');

    // Horas por proyecto
    expect(res.body.hoursByProject).toHaveLength(1);
    expect(res.body.hoursByProject[0].totalHours).toBe(12);
    expect(res.body.hoursByProject[0].name).toBe(project.name);

    // Materiales por cliente
    expect(res.body.materialsByClient).toHaveLength(1);
    expect(res.body.materialsByClient[0].totalQuantity).toBe(50);
    expect(res.body.materialsByClient[0].name).toBe(client.name);
    expect(res.body.materialsByClient[0].materials).toContain('Cemento');
  });

  it('no mezcla datos de otra compañía', async () => {
    const { user: u1, company: c1 } = await createUserWithCompany();
    const { user: u2, company: c2 } = await createUserWithCompany();
    const client2  = await createClient(c2._id, u2._id);
    const project2 = await createProject(c2._id, u2._id, client2._id);

    // Albaranes de otra compañía
    await createDeliveryNote(c2._id, u2._id, client2._id, project2._id);
    await createDeliveryNote(c2._id, u2._id, client2._id, project2._id);

    // Dashboard de u1 debe estar vacío
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', authHeader(u1._id));

    expect(res.status).toBe(200);
    expect(res.body.summary.total).toBe(0);
  });
});
