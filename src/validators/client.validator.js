import { z } from 'zod';
import { addressSchema } from './common.js';

export const createClientSchema = z.object({
  name:    z.string().trim().min(1, 'El nombre es obligatorio'),
  cif:     z.string().trim().toUpperCase().min(1, 'El CIF es obligatorio'),
  email:   z.string().email('Email inválido').trim().toLowerCase().optional(),
  phone:   z.string().trim().optional(),
  address: addressSchema,
});

export const updateClientSchema = createClientSchema.partial();
