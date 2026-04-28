import { getIO } from '../sockets/index.js';

/**
 * Emite un evento únicamente a la room de la compañía indicada.
 * Cada socket se une a "company:<id>" al conectarse (ver sockets/index.js).
 *
 * @param {string} companyId  - ID de la compañía destinataria
 * @param {string} event      - Nombre del evento Socket.IO
 * @param {object} payload    - Datos a emitir
 */
const emitToCompany = (companyId, event, payload) => {
  const io = getIO();
  if (!io) return; // Socket.IO no inicializado (entorno de tests) — noop
  io.to(`company:${companyId}`).emit(event, payload);
};

// ── Helpers semánticos ────────────────────────────────────────────────────────

export const emitNewClient = (companyId, client) =>
  emitToCompany(companyId, 'client:new', { client });

export const emitNewProject = (companyId, project) =>
  emitToCompany(companyId, 'project:new', { project });

export const emitNewDeliveryNote = (companyId, deliveryNote) =>
  emitToCompany(companyId, 'deliverynote:new', { deliveryNote });

export const emitDeliveryNoteSigned = (companyId, deliveryNote) =>
  emitToCompany(companyId, 'deliverynote:signed', { deliveryNote });
