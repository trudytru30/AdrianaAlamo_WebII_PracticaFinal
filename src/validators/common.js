import { z } from 'zod';

/**
 * Schema Zod reutilizable para direcciones.
 * Usado por user, client y project validators.
 */
export const addressSchema = z.object({
  street:   z.string().trim().optional(),
  number:   z.string().trim().optional(),
  postal:   z.string().trim().optional(),
  city:     z.string().trim().optional(),
  province: z.string().trim().optional(),
}).optional();
