import { AppError } from '../utils/AppError.js';

/**
 * Requiere que el usuario autenticado tenga uno de los roles indicados.
 * Debe usarse DESPUÉS de verifyJwt.
 * @param {...string} roles
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized());
  }
  if (!roles.includes(req.user.role)) {
    return next(
      AppError.forbidden(
        `Se requiere el rol ${roles.join(' o ')} para esta acción`
      )
    );
  }
  next();
};
