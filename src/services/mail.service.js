import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * Indica si el transporte SMTP está configurado con las credenciales necesarias.
 * Sin ellas el servidor arranca igualmente; en dev/test los códigos se loguean
 * por consola en lugar de enviarse por email.
 */
const smtpConfigured = !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);

// Transporte singleton — se crea solo si las credenciales están disponibles
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host:   config.SMTP_HOST,
      port:   Number(config.SMTP_PORT),
      secure: Number(config.SMTP_PORT) === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    })
  : null;

/**
 * Lanza AppError 503 en producción o loguea el aviso en dev/test.
 * Devuelve true si se debe abortar el envío (SMTP no configurado).
 */
const checkSmtp = (to, code, type) => {
  if (smtpConfigured) return false;
  if (config.NODE_ENV === 'production') {
    throw new AppError('El servicio de email no está disponible', 503, true);
  }
  logger.warn(
    { to, code, type },
    '[MAIL] SMTP no configurado — el email no se ha enviado (solo dev/test)'
  );
  return true; // abortar silenciosamente
};

/**
 * Envía el código de verificación de email al usuario recién registrado.
 * @param {string} to    - Email destinatario
 * @param {string} code  - Código de 6 dígitos
 */
export const sendVerificationEmail = async (to, code) => {
  if (checkSmtp(to, code, 'verification')) return;

  await transporter.sendMail({
    from:    `"BildyApp" <${config.SMTP_USER}>`,
    to,
    subject: 'Verifica tu cuenta en BildyApp',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #2563eb;">Bienvenido a BildyApp</h2>
        <p>Usa el siguiente código para verificar tu cuenta:</p>
        <p style="
          font-size: 2rem;
          font-weight: bold;
          letter-spacing: 0.4rem;
          color: #1e40af;
          background: #eff6ff;
          padding: 16px 24px;
          border-radius: 8px;
          display: inline-block;
        ">${code}</p>
        <p style="color: #6b7280; font-size: 0.85rem;">
          Este código expira en 10 minutos. Si no has creado una cuenta, ignora este email.
        </p>
      </div>
    `,
    text: `Tu código de verificación de BildyApp es: ${code}`,
  });
};

/**
 * Envía un email de restablecimiento de contraseña.
 * @param {string} to    - Email destinatario
 * @param {string} code  - Código de 6 dígitos
 */
export const sendPasswordResetEmail = async (to, code) => {
  if (checkSmtp(to, code, 'password-reset')) return;

  await transporter.sendMail({
    from:    `"BildyApp" <${config.SMTP_USER}>`,
    to,
    subject: 'Restablece tu contraseña en BildyApp',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #dc2626;">Restablecimiento de contraseña</h2>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Usa el siguiente código:</p>
        <p style="
          font-size: 2rem;
          font-weight: bold;
          letter-spacing: 0.4rem;
          color: #991b1b;
          background: #fef2f2;
          padding: 16px 24px;
          border-radius: 8px;
          display: inline-block;
        ">${code}</p>
        <p style="color: #6b7280; font-size: 0.85rem;">
          Si no has solicitado este cambio, ignora este email. Tu contraseña no se modificará.
        </p>
      </div>
    `,
    text: `Tu código de restablecimiento de contraseña en BildyApp es: ${code}`,
  });
};
