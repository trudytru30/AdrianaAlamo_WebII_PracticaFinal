import { z } from 'zod';
import { addressSchema } from './common.js';

export const createProjectSchema = z.object({
  client:      z.string().min(1, 'El cliente es obligatorio'),
  name:        z.string().trim().min(1, 'El nombre del proyecto es obligatorio'),
  projectCode: z.string().trim().min(1, 'El código de proyecto es obligatorio'),
  address:     addressSchema,
  email:       z.string().email('Email inválido').trim().toLowerCase().optional(),
  notes:       z.string().trim().optional(),
  active:      z.boolean().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
