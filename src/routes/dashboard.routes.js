import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { verifyJwt }    from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyJwt);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Estadísticas de la compañía (aggregation pipeline)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas calculadas con aggregation pipeline
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:      { type: integer }
 *                     signed:     { type: integer }
 *                     pending:    { type: integer }
 *                     totalHours: { type: number }
 *                 notesByMonth:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:   { type: integer }
 *                       month:  { type: integer }
 *                       count:  { type: integer }
 *                       signed: { type: integer }
 *                 hoursByProject:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:       { type: string }
 *                       code:       { type: string }
 *                       totalHours: { type: number }
 *                       count:      { type: integer }
 *                 materialsByClient:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:          { type: string }
 *                       totalQuantity: { type: number }
 *                       count:         { type: integer }
 *                       materials:     { type: array, items: { type: string } }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', getDashboard);

export default router;
