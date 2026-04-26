import { z } from 'zod';

/**
 * Schema base de paginación reutilizable.
 * z.coerce.number() convierte los strings de la query a número
 * para evitar el casteo manual `Number(page)` en cada controller.
 */
export const paginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// ── Schemas específicos por recurso ───────────────────────────────────────────

export const clientListSchema = paginationSchema.extend({
  sort: z.string().default('-createdAt'),
  name: z.string().optional(),
});

export const projectListSchema = paginationSchema.extend({
  sort:   z.string().default('-createdAt'),
  client: z.string().optional(),
  name:   z.string().optional(),
  // 'true'/'false' como string desde la URL — el controller compara con === 'true'
  active: z.enum(['true', 'false']).optional(),
});

export const deliverynoteListSchema = paginationSchema.extend({
  sort:    z.string().default('-workDate'),
  project: z.string().optional(),
  client:  z.string().optional(),
  format:  z.enum(['material', 'hours']).optional(),
  signed:  z.enum(['true', 'false']).optional(),
  // Fechas como strings ISO o YYYY-MM-DD — el controller hace new Date(from)
  from:    z.string().optional(),
  to:      z.string().optional(),
});
