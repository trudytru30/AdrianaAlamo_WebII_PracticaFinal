import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import config from '../config/index.js';
import User from '../models/User.js';

/**
 * Verifica el JWT de la cabecera Authorization: Bearer <token>
 * Adjunta req.user = { id, companyId, role }
 */
export const verifyJwt = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Token de acceso requerido'));
  }

  const token = auth.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch (err) {
    return next(
      err.name === 'TokenExpiredError'
        ? AppError.unauthorized('El token ha expirado')
        : AppError.unauthorized('Token inválido')
    );
  }

  const user = await User.findById(payload.id).select('role company deleted');
  if (!user || user.deleted) {
    return next(AppError.unauthorized('Usuario no encontrado'));
  }

  req.user = {
    id:        user._id.toString(),
    companyId: user.company?.toString() ?? null,
    role:      user.role,
  };

  next();
};
