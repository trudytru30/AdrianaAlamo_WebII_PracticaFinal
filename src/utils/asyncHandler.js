/**
 * Envuelve un controller async para propagar errores al middleware central.
 * Evita el try/catch repetitivo en cada handler.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
