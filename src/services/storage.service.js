import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import config from '../config/index.js';
import { AppError } from '../utils/AppError.js';

/**
 * Indica si Cloudinary está configurado con las tres credenciales necesarias.
 * Si no lo está, las funciones de subida lanzarán un AppError 503 en lugar
 * de crashear con un error críptico de la SDK.
 */
const cloudinaryConfigured = !!(
  config.CLOUDINARY_CLOUD_NAME &&
  config.CLOUDINARY_API_KEY    &&
  config.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key:    config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });
}

/**
 * Optimiza una imagen con Sharp y la sube a Cloudinary.
 * @param {Buffer} buffer  - Buffer del archivo recibido (memoryStorage)
 * @param {string} folder  - Carpeta destino en Cloudinary (ej. 'signatures')
 * @param {string} publicId - Identificador único dentro de la carpeta
 * @returns {Promise<string>} URL segura del recurso subido
 */
export const uploadImage = async (buffer, folder, publicId) => {
  if (!cloudinaryConfigured) {
    throw new AppError(
      'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el .env',
      503,
      true
    );
  }

  // Optimización con Sharp: convertir a webp, reducir calidad
  const optimized = await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Subida a Cloudinary usando stream desde buffer
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:      publicId,
        resource_type:  'image',
        overwrite:      true,
        format:         'webp',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(optimized);
  });
};

/**
 * Sube un PDF (Buffer) a Cloudinary como raw.
 * @param {Buffer} buffer
 * @param {string} folder
 * @param {string} publicId
 * @returns {Promise<string>} URL segura del PDF subido
 */
export const uploadPdf = async (buffer, folder, publicId) => {
  if (!cloudinaryConfigured) {
    throw new AppError(
      'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el .env',
      503,
      true
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:     publicId,
        resource_type: 'raw',
        overwrite:     true,
        format:        'pdf',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Elimina un recurso de Cloudinary dado su publicId completo.
 * @param {string} publicId - p.ej. 'signatures/note_abc123'
 * @param {'image'|'raw'} resourceType
 */
export const deleteResource = async (publicId, resourceType = 'image') => {
  if (!cloudinaryConfigured) return; // noop si no está configurado
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};
