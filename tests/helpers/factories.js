/**
 * Factories para crear documentos de prueba en la BD en-memoria.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User         from '../../src/models/User.js';
import Company      from '../../src/models/Company.js';
import Client       from '../../src/models/Client.js';
import Project      from '../../src/models/Project.js';
import DeliveryNote from '../../src/models/DeliveryNote.js';

export const RAW_PASSWORD = 'Test1234!';

let _counter = 0;
const uid = () => ++_counter;

/** Crea un User + Company y asocia el user a la company. */
export const createUserWithCompany = async (overrides = {}) => {
  const n      = uid();
  const hashed = await bcrypt.hash(RAW_PASSWORD, 10);

  const user = await User.create({
    email:    overrides.email    ?? `user${n}@test.com`,
    password: hashed,
    status:   overrides.status   ?? 'verified',
    role:     overrides.role     ?? 'admin',
  });

  const company = await Company.create({
    owner:       user._id,
    name:        overrides.companyName ?? `Empresa ${n} SL`,
    cif:         overrides.cif         ?? `B${String(Date.now()).slice(-7)}${n}`,
    isFreelance: overrides.isFreelance ?? false,
  });

  // Asociar company al user
  await User.findByIdAndUpdate(user._id, { company: company._id });
  const updatedUser = await User.findById(user._id);

  return { user: updatedUser, company };
};

/** Crea un Client asociado a la compañía dada. */
export const createClient = async (companyId, userId, overrides = {}) => {
  const n = uid();
  return Client.create({
    user:    userId,
    company: companyId,
    name:    overrides.name  ?? `Cliente ${n}`,
    cif:     overrides.cif   ?? `A${String(Date.now()).slice(-7)}${n}`,
    email:   overrides.email ?? `cliente${n}@test.com`,
    phone:   overrides.phone ?? '600000000',
    ...overrides,
  });
};

/** Crea un Project asociado al client y company dados. */
export const createProject = async (companyId, userId, clientId, overrides = {}) => {
  const n = uid();
  return Project.create({
    user:        userId,
    company:     companyId,
    client:      clientId,
    name:        overrides.name        ?? `Proyecto ${n}`,
    projectCode: overrides.projectCode ?? `PRJ-${n}`,
    ...overrides,
  });
};

/** Crea un DeliveryNote (albarán) con formato 'hours' por defecto. */
export const createDeliveryNote = async (companyId, userId, clientId, projectId, overrides = {}) => {
  return DeliveryNote.create({
    user:        userId,
    company:     companyId,
    client:      clientId,
    project:     projectId,
    format:      overrides.format      ?? 'hours',
    description: overrides.description ?? 'Trabajo de prueba',
    workDate:    overrides.workDate     ?? new Date(),
    hours:       overrides.hours       ?? 8,
    workers:     overrides.workers     ?? [{ name: 'Operario Test', hours: 8 }],
    ...overrides,
  });
};

/** Genera un ObjectId de mongoose válido (para IDs inexistentes en tests). */
export const fakeId = () => new mongoose.Types.ObjectId().toString();
