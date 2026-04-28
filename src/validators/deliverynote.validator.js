import { z } from 'zod';

const workerSchema = z.object({
  name:  z.string().trim().min(1),
  hours: z.number().min(0),
});

const materialNoteSchema = z.object({
  project:     z.string().min(1, 'El proyecto es obligatorio'),
  client:      z.string().min(1, 'El cliente es obligatorio'),
  format:      z.literal('material'),
  description: z.string().trim().optional(),
  workDate:    z.coerce.date(),
  material:    z.string().trim().min(1, 'El material es obligatorio'),
  quantity:    z.number().min(0, 'La cantidad debe ser >= 0'),
  unit:        z.string().trim().optional(),
});

const hoursNoteSchema = z.object({
  project:     z.string().min(1, 'El proyecto es obligatorio'),
  client:      z.string().min(1, 'El cliente es obligatorio'),
  format:      z.literal('hours'),
  description: z.string().trim().optional(),
  workDate:    z.coerce.date(),
  hours:       z.number().min(0, 'Las horas deben ser >= 0').optional(),
  workers:     z.array(workerSchema).optional(),
});

// discriminatedUnion garantiza validación según el campo 'format'
export const createDeliveryNoteSchema = z.discriminatedUnion('format', [
  materialNoteSchema,
  hoursNoteSchema,
]);
