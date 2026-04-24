import { z } from 'zod';

const envSchema = z.object({
  PORT:                    z.coerce.number().default(3000),
  NODE_ENV:                z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI:               z.string().default('mongodb://localhost:27017/bildyapp'),
  JWT_SECRET:              z.string().default('dev-jwt-secret-change-in-prod'),
  JWT_EXPIRES_IN:          z.string().default('15m'),
  JWT_REFRESH_SECRET:      z.string().default('dev-refresh-secret-change-in-prod'),
  JWT_REFRESH_EXPIRES_IN:  z.string().default('7d'),
  BCRYPT_SALT_ROUNDS:      z.coerce.number().default(12),
  UPLOAD_MAX_SIZE_MB:      z.coerce.number().default(5),
  CLOUDINARY_CLOUD_NAME:   z.string().default(''),
  CLOUDINARY_API_KEY:      z.string().default(''),
  CLOUDINARY_API_SECRET:   z.string().default(''),
  SMTP_HOST:               z.string().default(''),
  SMTP_PORT:               z.coerce.number().default(587),
  SMTP_USER:               z.string().default(''),
  SMTP_PASS:               z.string().default(''),
  MAIL_FROM:               z.string().default('BildyApp <no-reply@bildyapp.local>'),
  SLACK_WEBHOOK_URL:       z.string().default(''),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌  Variables de entorno inválidas:');
  result.error.issues.forEach(i =>
    console.error(' •', i.path.join('.'), '—', i.message)
  );
  process.exit(1);
}

export default Object.freeze(result.data);
