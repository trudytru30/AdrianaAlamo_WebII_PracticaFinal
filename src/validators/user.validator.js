import { z } from 'zod';
import { addressSchema } from './common.js';

export const registerSchema = z.object({
  email:    z.string().email('Email inválido').trim().toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const loginSchema = z.object({
  email:    z.string().email('Email inválido').trim().toLowerCase(),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener exactamente 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe ser numérico'),
});

export const onboardingPersonalSchema = z.object({
  name:     z.string().trim().min(1, 'El nombre es obligatorio'),
  lastName: z.string().trim().min(1, 'Los apellidos son obligatorios'),
  nif:      z.string().trim().min(1, 'El NIF es obligatorio'),
  address:  addressSchema,
});

export const onboardingCompanySchema = z.discriminatedUnion('isFreelance', [
  z.object({
    isFreelance: z.literal(false),
    name:        z.string().trim().min(1),
    cif:         z.string().trim().min(1),
    address:     addressSchema,
  }),
  z.object({
    isFreelance: z.literal(true),
  }),
]);

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es obligatorio'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
    newPassword:     z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'La nueva contraseña debe ser distinta a la actual',
    path:    ['newPassword'],
  });
