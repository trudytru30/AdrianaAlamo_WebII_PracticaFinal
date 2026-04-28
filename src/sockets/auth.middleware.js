import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';

/**
 * Middleware de autenticación para el handshake de Socket.IO.
 * Espera el token en socket.handshake.auth.token o en la query ?token=...
 *
 * El JWT incluye companyId y role desde el endpoint de login/register.
 * Como fallback, si el payload no contiene companyId (tokens antiguos),
 * se consulta la BD para obtenerlo.
 */
export const socketAuthMiddleware = async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Authentication error: token requerido'));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);

    let companyId = payload.companyId;
    let role      = payload.role;

    // Fallback: si el token no tiene companyId (por compatibilidad),
    // consultar la BD
    if (!companyId) {
      const user = await User.findById(payload.id).select('company role');
      if (!user || user.deleted) {
        return next(new Error('Authentication error: usuario no encontrado'));
      }
      companyId = user.company?.toString() ?? null;
      role      = user.role;
    }

    socket.user = {
      id:        payload.id,
      companyId,
      role,
    };
    next();
  } catch (err) {
    next(new Error('Authentication error: token inválido o expirado'));
  }
};
