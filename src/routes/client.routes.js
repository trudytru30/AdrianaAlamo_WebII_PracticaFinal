import { Router } from 'express';
import {
  create,
  list,
  listArchived,
  getById,
  update,
  restore,
  remove,
} from '../controllers/client.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { createClientSchema, updateClientSchema } from '../validators/client.validator.js';
import { clientListSchema } from '../validators/pagination.validator.js';

const router = Router();

router.use(verifyJwt);

/**
 * @swagger
 * /api/client:
 *   post:
 *     summary: Crea un nuevo cliente
 *     tags: [Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientCreate'
 *     responses:
 *       201:
 *         description: Cliente creado
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *   get:
 *     summary: Lista clientes con paginación y filtros
 *     tags: [Client]
 *     parameters:
 *       - { in: query, name: page,  schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: sort,  schema: { type: string, default: '-createdAt' } }
 *       - { in: query, name: name,  schema: { type: string } }
 *     responses:
 *       200:
 *         description: Lista paginada de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:       { type: array }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *
 * /api/client/{id}:
 *   get:
 *     summary: Devuelve un cliente por id
 *     tags: [Client]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualiza un cliente
 *     tags: [Client]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientCreate'
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Elimina o archiva un cliente
 *     tags: [Client]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: soft, schema: { type: boolean }, description: 'true = soft delete' }
 *     responses:
 *       200:
 *         description: Cliente eliminado o archivado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /api/client/archived:
 *   get:
 *     summary: Lista clientes archivados (soft-deleted)
 *     tags: [Client]
 *     responses:
 *       200:
 *         description: Lista de clientes archivados
 *
 * /api/client/{id}/restore:
 *   patch:
 *     summary: Restaura un cliente archivado
 *     tags: [Client]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Cliente restaurado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.post('/',              validate(createClientSchema), create);
router.get('/',               validate(clientListSchema, 'query'), list);
router.get('/archived',       listArchived);
router.get('/:id',            getById);
router.put('/:id',            validate(updateClientSchema), update);
router.patch('/:id/restore',  restore);
router.delete('/:id',         remove);

export default router;
