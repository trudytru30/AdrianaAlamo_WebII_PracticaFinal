import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import config from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendVerificationEmail } from '../services/mail.service.js';
import { uploadImage } from '../services/storage.service.js';

/** Genera un código de verificación de 6 dígitos */
const generateCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

/** Genera access token — incluye companyId y role para Socket.IO */
const signAccess = (user) =>
  jwt.sign(
    { id: user._id.toString(), companyId: user.company?.toString() ?? null, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

/** Genera refresh token */
const signRefresh = (id) =>
  jwt.sign({ id: id.toString() }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });

// POST /api/user/register
export const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing && existing.status === 'verified') {
    throw AppError.conflict('Ya existe un usuario con ese email');
  }

  const hashed = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
  const code   = generateCode();

  const user = await User.findOneAndUpdate(
    { email },
    {
      email,
      password:             hashed,
      verificationCode:     code,
      verificationAttempts: 3,
      status:               'pending',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const accessToken  = signAccess(user);
  const refreshToken = signRefresh(user._id);

  await User.findByIdAndUpdate(user._id, { refreshToken });

  // Enviar código por email (no bloqueamos la respuesta si falla)
  sendVerificationEmail(email, code).catch((err) =>
    console.error('[Mail] Error al enviar verificación:', err.message)
  );

  res.status(201).json({
    user:   { email: user.email, status: user.status, role: user.role },
    accessToken,
    refreshToken,
  });
});

// PUT /api/user/validation
export const verifyEmail = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const user = await User.findById(req.user.id).select(
    '+verificationCode +verificationAttempts'
  );

  if (!user) throw AppError.notFound('Usuario no encontrado');
  if (user.status === 'verified') {
    return res.json({ message: 'El email ya estaba verificado' });
  }
  if (user.verificationAttempts <= 0) {
    throw AppError.tooManyRequests('Se han agotado los intentos de verificación');
  }

  if (user.verificationCode !== code) {
    await User.findByIdAndUpdate(user._id, {
      $inc: { verificationAttempts: -1 },
    });
    throw AppError.validation([
      { path: ['code'], message: 'Código incorrecto' },
    ]);
  }

  await User.findByIdAndUpdate(user._id, {
    status:               'verified',
    verificationCode:     undefined,
    verificationAttempts: 0,
  });

  res.json({ message: 'Email verificado correctamente' });
});

// POST /api/user/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || user.deleted) throw AppError.unauthorized('Credenciales incorrectas');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw AppError.unauthorized('Credenciales incorrectas');

  const accessToken  = signAccess(user);
  const refreshToken = signRefresh(user._id);

  await User.findByIdAndUpdate(user._id, { refreshToken });

  res.json({
    user:   { email: user.email, status: user.status, role: user.role },
    accessToken,
    refreshToken,
  });
});

// POST /api/user/refresh
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
  } catch {
    throw AppError.unauthorized('Refresh token inválido o expirado');
  }

  const user = await User.findById(payload.id).select('+refreshToken');
  if (!user || user.deleted || user.refreshToken !== refreshToken) {
    throw AppError.unauthorized('Refresh token inválido');
  }

  const newAccess  = signAccess(user);
  const newRefresh = signRefresh(user._id);

  await User.findByIdAndUpdate(user._id, { refreshToken: newRefresh });

  res.json({ accessToken: newAccess, refreshToken: newRefresh });
});

// POST /api/user/logout
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { refreshToken: undefined });
  res.json({ message: 'Sesión cerrada' });
});

// GET /api/user
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('company');
  if (!user || user.deleted) throw AppError.notFound('Usuario no encontrado');
  res.json({ user });
});

// DELETE /api/user
export const deleteAccount = asyncHandler(async (req, res) => {
  const soft = req.query.soft === 'true';
  if (soft) {
    await User.findByIdAndUpdate(req.user.id, { deleted: true });
  } else {
    await User.findByIdAndDelete(req.user.id);
  }
  res.json({ message: 'Cuenta eliminada' });
});

// PUT /api/user/register — Completar datos personales (onboarding)
export const updatePersonal = asyncHandler(async (req, res) => {
  const { name, lastName, nif, address } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, lastName, nif, address },
    { new: true, runValidators: true }
  );
  if (!user) throw AppError.notFound('Usuario no encontrado');
  res.json({ user });
});

// PATCH /api/user/company — Crear o actualizar compañía
export const upsertCompany = asyncHandler(async (req, res) => {
  const { name, cif, address, isFreelance } = req.body;

  let company;

  if (req.user.companyId) {
    // Actualizar compañía existente
    company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { name, cif, address, isFreelance },
      { new: true, runValidators: true }
    );
  } else {
    // Crear nueva compañía
    company = await Company.create({
      owner: req.user.id,
      name:  isFreelance ? undefined : name,
      cif:   isFreelance ? undefined : cif,
      address,
      isFreelance,
    });
    // Asociar al usuario
    await User.findByIdAndUpdate(req.user.id, { company: company._id });
  }

  res.json({ company });
});

// PATCH /api/user/logo — Subir logo de la compañía
export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw AppError.validation('Se requiere la imagen del logo');
  if (!req.user.companyId) throw AppError.notFound('Primero crea una compañía');

  const logoUrl = await uploadImage(req.file.buffer, 'logos', `company_${req.user.companyId}`);

  const company = await Company.findByIdAndUpdate(
    req.user.companyId,
    { logo: logoUrl },
    { new: true }
  );

  res.json({ company, logoUrl });
});
