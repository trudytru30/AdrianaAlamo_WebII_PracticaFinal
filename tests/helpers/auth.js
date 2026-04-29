/**
 * Helper de autenticación para tests.
 * Genera tokens JWT directamente, sin pasar por el endpoint /login,
 * para que los tests de recursos (client, project, etc.) sean rápidos.
 */
import jwt from 'jsonwebtoken';
import config from '../../src/config/index.js';

/**
 * Genera un access token válido para un userId dado.
 * El middleware verifyJwt leerá el user de la BD usando el id del token.
 * @param {string|ObjectId} userId
 * @returns {string} Bearer token
 */
export const getToken = (userId) =>
  jwt.sign({ id: String(userId) }, config.JWT_SECRET, { expiresIn: '15m' });

/**
 * Devuelve la cabecera Authorization lista para supertest.
 * @param {string|ObjectId} userId
 * @returns {string}
 */
export const authHeader = (userId) => `Bearer ${getToken(userId)}`;
