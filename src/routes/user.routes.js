import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  getMe,
  deleteAccount,
  updatePersonal,
  upsertCompany,
  uploadLogo,
} from '../controllers/user.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshSchema,
  onboardingPersonalSchema,
  onboardingCompanySchema,
} from '../validators/user.validator.js';

const router = Router();

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [User]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Usuario registrado, devuelve tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *   put:
 *     summary: Completa datos personales del usuario (onboarding)
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, lastName, nif]
 *             properties:
 *               name:     { type: string }
 *               lastName: { type: string }
 *               nif:      { type: string }
 *               address:  { $ref: '#/components/schemas/Address' }
 *     responses:
 *       200:
 *         description: Datos personales actualizados
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/register',   authLimiter, validate(registerSchema),   register);
router.put('/register',    verifyJwt, validate(onboardingPersonalSchema), updatePersonal);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Inicia sesión
 *     tags: [User]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login correcto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/login',      authLimiter, validate(loginSchema),      login);

/**
 * @swagger
 * /api/user/validation:
 *   put:
 *     summary: Verifica el email con código de 6 dígitos
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: '123456' }
 *     responses:
 *       200:
 *         description: Email verificado correctamente
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: Demasiados intentos de verificación
 */
router.put('/validation',  verifyJwt, validate(verifyEmailSchema), verifyEmail);

/**
 * @swagger
 * /api/user/refresh:
 *   post:
 *     summary: Renueva el access token usando un refresh token
 *     tags: [User]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Nuevos tokens generados
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/refresh',    validate(refreshSchema),       refresh);

/**
 * @swagger
 * /api/user/logout:
 *   post:
 *     summary: Cierra sesión e invalida el refresh token
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Sesión cerrada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout',     verifyJwt,                     logout);

/**
 * @swagger
 * /api/user/company:
 *   patch:
 *     summary: Crea o actualiza la compañía del usuario
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isFreelance: { type: boolean }
 *               name:        { type: string }
 *               cif:         { type: string }
 *               address:     { $ref: '#/components/schemas/Address' }
 *     responses:
 *       200:
 *         description: Compañía creada o actualizada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/company',   verifyJwt, validate(onboardingCompanySchema), upsertCompany);

/**
 * @swagger
 * /api/user/logo:
 *   patch:
 *     summary: Sube el logo de la compañía
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Imagen PNG/JPEG/WebP del logo
 *     responses:
 *       200:
 *         description: Logo subido correctamente
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/logo',      verifyJwt, upload.single('logo'), handleMulterError, uploadLogo);

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Devuelve el perfil del usuario autenticado
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     summary: Elimina la cuenta del usuario
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: soft
 *         schema:
 *           type: boolean
 *         description: Si es true, hace soft delete (deleted=true)
 *     responses:
 *       200:
 *         description: Cuenta eliminada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/',            verifyJwt,                     getMe);
router.delete('/',         verifyJwt,                     deleteAccount);

export default router;
