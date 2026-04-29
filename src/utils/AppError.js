export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode  = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(msg = 'Recurso no encontrado') {
    return new AppError(msg, 404);
  }
  static conflict(msg = 'Ya existe un recurso con esos datos') {
    return new AppError(msg, 409);
  }
  static forbidden(msg = 'No tienes permiso para realizar esta acción') {
    return new AppError(msg, 403);
  }
  static unauthorized(msg = 'Autenticación requerida') {
    return new AppError(msg, 401);
  }
  static validation(issues) {
    const msg = Array.isArray(issues)
      ? issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      : String(issues);
    return new AppError(msg, 400);
  }
  static tooManyRequests(msg = 'Demasiadas peticiones, espera un momento') {
    return new AppError(msg, 429);
  }
  static internal(msg = 'Error interno del servidor') {
    return new AppError(msg, 500);
  }
}
