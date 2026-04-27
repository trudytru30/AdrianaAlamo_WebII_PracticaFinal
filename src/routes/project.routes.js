import { Router } from 'express';
import {
  create,
  list,
  listArchived,
  getById,
  update,
  restore,
  remove,
} from '../controllers/project.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import { projectListSchema } from '../validators/pagination.validator.js';

const router = Router();

router.use(verifyJwt);

/**
 * @swagger
 * /api/project:
 *   post:
 *     summary: Crea un nuevo proyecto
 *     tags: [Project]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectCreate'
 *     responses:
 *       201:
 *         description: Proyecto creado
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *   get:
 *     summary: Lista proyectos con paginación y filtros
 *     tags: [Project]
 *     parameters:
 *       - { in: query, name: page,   schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,  schema: { type: integer, default: 10 } }
 *       - { in: query, name: sort,   schema: { type: string, default: '-createdAt' } }
 *       - { in: query, name: client, schema: { type: string }, description: 'Filtrar por ObjectId de cliente' }
 *       - { in: query, name: name,   schema: { type: string }, description: 'Búsqueda parcial por nombre' }
 *       - { in: query, name: active, schema: { type: string, enum: ['true', 'false'] } }
 *     responses:
 *       200:
 *         description: Lista paginada de proyectos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:       { type: array }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *
 * /api/project/archived:
 *   get:
 *     summary: Lista proyectos archivados (soft-deleted)
 *     tags: [Project]
 *     responses:
 *       200:
 *         description: Lista de proyectos archivados
 *
 * /api/project/{id}:
 *   get:
 *     summary: Devuelve un proyecto por id (con populate de cliente)
 *     tags: [Project]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Proyecto encontrado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualiza un proyecto
 *     tags: [Project]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectCreate'
 *     responses:
 *       200:
 *         description: Proyecto actualizado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Elimina o archiva un proyecto
 *     tags: [Project]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: soft, schema: { type: boolean }, description: 'true = soft delete (archivar)' }
 *     responses:
 *       200:
 *         description: Proyecto eliminado o archivado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /api/project/{id}/restore:
 *   patch:
 *     summary: Restaura un proyecto archivado
 *     tags: [Project]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Proyecto restaurado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.post('/',             validate(createProjectSchema), create);
router.get('/',              validate(projectListSchema, 'query'), list);
router.get('/archived',      listArchived);
router.get('/:id',           getById);
router.put('/:id',           validate(updateProjectSchema), update);
router.patch('/:id/restore', restore);
router.delete('/:id',        remove);

export default router;
