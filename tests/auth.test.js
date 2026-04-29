import request from 'supertest';
import jwt from 'jsonwebtoken';
import { dbConnect, dbClear, dbClose } from './setup.js';
import { createUserWithCompany, RAW_PASSWORD } from './helpers/factories.js';
import { authHeader } from './helpers/auth.js';
import config from '../src/config/index.js';
import app from '../src/app.js';

beforeAll(dbConnect);
afterEach(dbClear);
afterAll(dbClose);

// ── POST /api/user/register ───────────────────────────────────────────────────
describe('POST /api/user/register', () => {
  it('registra un usuario nuevo y devuelve accessToken + refreshToken', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({ email: 'nuevo@test.com', password: 'Segura123!' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('nuevo@test.com');
    expect(res.body.user.status).toBe('pending');
  });

  it('rechaza email inválido (400)', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({ email: 'no-es-email', password: 'Segura123!' });

    expect(res.status).toBe(400);
  });

  it('rechaza si el usuario ya existe con email verificado (409)', async () => {
    const { user } = await createUserWithCompany({ email: 'dup@test.com', status: 'verified' });

    const res = await request(app)
      .post('/api/user/register')
      .send({ email: user.email, password: 'Segura123!' });

    expect(res.status).toBe(409);
  });
});

// ── POST /api/user/login ──────────────────────────────────────────────────────
describe('POST /api/user/login', () => {
  it('devuelve tokens con credenciales correctas', async () => {
    const { user } = await createUserWithCompany({ email: 'login@test.com' });

    const res = await request(app)
      .post('/api/user/login')
      .send({ email: user.email, password: RAW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('rechaza contraseña incorrecta (401)', async () => {
    const { user } = await createUserWithCompany({ email: 'login2@test.com' });

    const res = await request(app)
      .post('/api/user/login')
      .send({ email: user.email, password: 'Incorrecta123!' });

    expect(res.status).toBe(401);
  });

  it('rechaza email inexistente (401)', async () => {
    const res = await request(app)
      .post('/api/user/login')
      .send({ email: 'noexiste@test.com', password: 'Segura123!' });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/user ─────────────────────────────────────────────────────────────
describe('GET /api/user', () => {
  it('devuelve el perfil del usuario autenticado', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .get('/api/user')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('rechaza petición sin token (401)', async () => {
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(401);
  });

  it('rechaza token inválido (401)', async () => {
    const res = await request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer token.invalido.aqui');
    expect(res.status).toBe(401);
  });
});

// ── PUT /api/user/validation ──────────────────────────────────────────────────
describe('PUT /api/user/validation', () => {
  it('verifica el email con el código correcto', async () => {
    const regRes = await request(app)
      .post('/api/user/register')
      .send({ email: 'verify@test.com', password: 'Segura123!' });

    const { accessToken } = regRes.body;

    // Recuperar el código directamente de la BD en-memoria
    const User = (await import('../src/models/User.js')).default;
    const userDoc = await User.findOne({ email: 'verify@test.com' })
      .select('+verificationCode');
    const { verificationCode: code } = userDoc;

    const res = await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verificado/i);
  });

  it('rechaza código incorrecto (400)', async () => {
    const { user } = await createUserWithCompany({ status: 'pending' });

    const res = await request(app)
      .put('/api/user/validation')
      .set('Authorization', authHeader(user._id))
      .send({ code: '000000' });

    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/user ──────────────────────────────────────────────────────────
describe('DELETE /api/user', () => {
  it('elimina la cuenta del usuario autenticado', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .delete('/api/user')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada/i);
  });
});

// ── PUT /api/user/register (onboarding personal) ──────────────────────────────
describe('PUT /api/user/register (onboarding)', () => {
  it('actualiza nombre, apellido y NIF del usuario (200)', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .put('/api/user/register')
      .set('Authorization', authHeader(user._id))
      .send({ name: 'Hugo', lastName: 'García', nif: '12345678A' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Hugo');
    expect(res.body.user.lastName).toBe('García');
  });

  it('rechaza si falta el nombre (400)', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .put('/api/user/register')
      .set('Authorization', authHeader(user._id))
      .send({ lastName: 'García', nif: '12345678A' }); // sin name

    expect(res.status).toBe(400);
  });
});

// ── PATCH /api/user/company ───────────────────────────────────────────────────
describe('PATCH /api/user/company', () => {
  it('actualiza la compañía existente del usuario (200)', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .patch('/api/user/company')
      .set('Authorization', authHeader(user._id))
      .send({
        isFreelance: false,
        name:        'Nueva Empresa SL',
        cif:         'B98765432',
        address:     { city: 'Madrid' },
      });

    expect(res.status).toBe(200);
    expect(res.body.company.name).toBe('Nueva Empresa SL');
  });

  it('funciona como freelance sin datos de empresa (200)', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .patch('/api/user/company')
      .set('Authorization', authHeader(user._id))
      .send({ isFreelance: true });

    expect(res.status).toBe(200);
  });
});

// ── GET /health ───────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('devuelve 200 con status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ── POST /api/user/logout ─────────────────────────────────────────────────────
describe('POST /api/user/logout', () => {
  it('cierra la sesión del usuario autenticado (200)', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .post('/api/user/logout')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sesión/i);
  });
});

// ── POST /api/user/refresh ────────────────────────────────────────────────────
describe('POST /api/user/refresh', () => {
  it('devuelve nuevos tokens con refresh token válido (200)', async () => {
    // Registrar para obtener un refreshToken real almacenado en BD
    const regRes = await request(app)
      .post('/api/user/register')
      .send({ email: 'refresh@test.com', password: 'Segura123!' });

    const { refreshToken } = regRes.body;

    const res = await request(app)
      .post('/api/user/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('rechaza refresh token inválido (401)', async () => {
    const res = await request(app)
      .post('/api/user/refresh')
      .send({ refreshToken: 'token.invalido.aqui' });

    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/user (soft) ───────────────────────────────────────────────────
describe('DELETE /api/user — soft delete', () => {
  it('archiva la cuenta con ?soft=true (200)', async () => {
    const { user } = await createUserWithCompany();

    const res = await request(app)
      .delete('/api/user?soft=true')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada/i);
  });
});

// ── Middleware de autenticación — casos de error ──────────────────────────────
describe('verifyJwt — casos de error', () => {
  it('rechaza token de usuario eliminado (401)', async () => {
    const { user } = await createUserWithCompany();
    // Marcar usuario como eliminado directamente en BD
    const User = (await import('../src/models/User.js')).default;
    await User.findByIdAndUpdate(user._id, { deleted: true });

    const res = await request(app)
      .get('/api/user')
      .set('Authorization', authHeader(user._id));

    expect(res.status).toBe(401);
  });

  it('rechaza token expirado (401)', async () => {
    // Generar token con exp ya pasado
    const expiredToken = jwt.sign(
      { id: 'fakeid', exp: Math.floor(Date.now() / 1000) - 100 },
      config.JWT_SECRET
    );

    const res = await request(app)
      .get('/api/user')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expirado/i);
  });
});

// ── PATCH /api/user/company — crear empresa nueva ─────────────────────────────
describe('PATCH /api/user/company — usuario sin empresa', () => {
  it('crea una empresa nueva si el usuario no tiene compañía (200)', async () => {
    // Crear usuario sin compañía
    const bcrypt = (await import('bcryptjs')).default;
    const User   = (await import('../src/models/User.js')).default;
    const hashed = await bcrypt.hash('Test1234!', 10);
    const userSinEmpresa = await User.create({
      email:    'sinempresa@test.com',
      password: hashed,
      status:   'verified',
      role:     'admin',
    });

    const res = await request(app)
      .patch('/api/user/company')
      .set('Authorization', authHeader(userSinEmpresa._id))
      .send({
        isFreelance: false,
        name:        'Empresa Nueva SL',
        cif:         'B11223344',
        address:     { city: 'Barcelona' },
      });

    expect(res.status).toBe(200);
    expect(res.body.company.name).toBe('Empresa Nueva SL');
  });
});

// ── Ruta no existente — notFound middleware ───────────────────────────────────
describe('Rutas no registradas', () => {
  it('devuelve 404 para rutas inexistentes', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe');

    expect(res.status).toBe(404);
  });
});
