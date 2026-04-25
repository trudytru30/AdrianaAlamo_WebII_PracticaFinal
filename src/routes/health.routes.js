import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Estado del servidor y de la conexión a MongoDB
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Estado del servicio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:    { type: string, example: 'ok' }
 *                 db:        { type: string, enum: [connected, disconnected] }
 *                 uptime:    { type: number, example: 123.456 }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    db: dbState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
