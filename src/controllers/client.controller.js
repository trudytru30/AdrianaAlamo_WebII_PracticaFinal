import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitNewClient } from '../services/realtime.service.js';

// POST /api/client
export const create = asyncHandler(async (req, res) => {
  const { name, cif, email, phone, address } = req.body;

  const existing = await Client.findOne({ company: req.user.companyId, cif })
    .setOptions({ includeDeleted: true });
  if (existing) {
    throw AppError.conflict('Ya existe un cliente con ese CIF en tu compañía');
  }

  const client = await Client.create({
    user:    req.user.id,
    company: req.user.companyId,
    name,
    cif,
    email,
    phone,
    address,
  });

  emitNewClient(req.user.companyId, client);
  res.status(201).json({ client });
});

// GET /api/client/:id
export const getById = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id:     req.params.id,
    company: req.user.companyId,
  });
  if (!client) throw AppError.notFound('Cliente no encontrado');
  res.json({ client });
});

// PUT /api/client/:id
export const update = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, company: req.user.companyId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!client) throw AppError.notFound('Cliente no encontrado');
  res.json({ client });
});

// GET /api/client   — lista paginada con filtros opcionales
export const list = asyncHandler(async (req, res) => {
  // page y limit llegan como Number (Zod coerce en la ruta)
  const { page, limit, sort, name } = req.query;

  const filter = { company: req.user.companyId };
  if (name) filter.name = { $regex: name, $options: 'i' };

  const skip = (page - 1) * limit;

  const [clients, totalItems] = await Promise.all([
    Client.find(filter).sort(sort).skip(skip).limit(limit),
    Client.countDocuments(filter),
  ]);

  res.json({
    data: clients,
    pagination: {
      totalItems,
      totalPages:  Math.ceil(totalItems / limit),
      currentPage: page,
      limit,
    },
  });
});

// GET /api/client/archived
export const listArchived = asyncHandler(async (req, res) => {
  const clients = await Client.find({ company: req.user.companyId, deleted: true })
    .setOptions({ includeDeleted: true })
    .sort('-updatedAt');

  res.json({ data: clients, total: clients.length });
});

// PATCH /api/client/:id/restore
export const restore = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, company: req.user.companyId, deleted: true },
    { deleted: false },
    { new: true }
  ).setOptions({ includeDeleted: true });

  if (!client) throw AppError.notFound('Cliente archivado no encontrado');
  res.json({ client });
});

// DELETE /api/client/:id   (?soft=true → borrado lógico)
export const remove = asyncHandler(async (req, res) => {
  const soft = req.query.soft === 'true';

  if (soft) {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, company: req.user.companyId },
      { deleted: true },
      { new: true }
    );
    if (!client) throw AppError.notFound('Cliente no encontrado');
    return res.json({ message: 'Cliente archivado correctamente' });
  }

  const client = await Client.findOneAndDelete({
    _id:     req.params.id,
    company: req.user.companyId,
  });
  if (!client) throw AppError.notFound('Cliente no encontrado');
  res.json({ message: 'Cliente eliminado correctamente' });
});
