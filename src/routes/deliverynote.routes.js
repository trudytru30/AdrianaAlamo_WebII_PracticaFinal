import { Router } from 'express';
import {
  create,
  list,
  getById,
  remove,
  sign,
  downloadPdf,
} from '../controllers/deliverynote.controller.js';
import { verifyJwt } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js';
import { deliverynoteListSchema } from '../validators/pagination.validator.js';
import { upload, handleMulterError } from '../middleware/upload.js';

const router = Router();

router.use(verifyJwt);

/**
 * @swagger
 * /api/deliverynote:
 *   post:
 *     summary: Crea un nuevo albarán
 *     tags: [DeliveryNote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryNoteCreate'
 *     responses:
 *       201:
 *         description: Albarán creado
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   get:
 *     summary: Lista albaranes con paginación y filtros
 *     tags: [DeliveryNote]
 *     parameters:
 *       - { in: query, name: page,    schema: { type: integer } }
 *       - { in: query, name: limit,   schema: { type: integer } }
 *       - { in: query, name: project, schema: { type: string } }
 *       - { in: query, name: client,  schema: { type: string } }
 *       - { in: query, name: format,  schema: { type: string, enum: [hours, material] } }
 *       - { in: query, name: signed,  schema: { type: boolean } }
 *       - { in: query, name: from,    schema: { type: string, format: date } }
 *       - { in: query, name: to,      schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: Lista paginada de albaranes
 *
 * /api/deliverynote/{id}:
 *   get:
 *     summary: Devuelve un albarán por id (con populate)
 *     tags: [DeliveryNote]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Albarán con datos de cliente y proyecto
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Elimina un albarán (solo si no está firmado)
 *     tags: [DeliveryNote]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Albarán eliminado
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *
 * /api/deliverynote/{id}/sign:
 *   patch:
 *     summary: Firma el albarán subiendo imagen de firma
 *     tags: [DeliveryNote]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               signature:
 *                 type: string
 *                 format: binary
 *                 description: Imagen PNG/JPEG/WebP de la firma
 *     responses:
 *       200:
 *         description: Albarán firmado, signatureUrl y pdfUrl en la respuesta
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *
 * /api/deliverynote/pdf/{id}:
 *   get:
 *     summary: Descarga o redirige al PDF del albarán
 *     tags: [DeliveryNote]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: PDF generado al vuelo (albarán sin firma)
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       302:
 *         description: Redirect a URL de Cloudinary (albarán firmado)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.post('/',     validate(createDeliveryNoteSchema), create);
router.get('/',      validate(deliverynoteListSchema, 'query'), list);

// OJO: /pdf/:id debe declararse ANTES de /:id para que Express no lo interprete
// como un documento con id='pdf'
router.get('/pdf/:id',    downloadPdf);
router.get('/:id',        getById);
router.delete('/:id',     remove);

router.patch('/:id/sign', upload.single('signature'), handleMulterError, sign);

export default router;
