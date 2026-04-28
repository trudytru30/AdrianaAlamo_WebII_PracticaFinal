import DeliveryNote from '../models/DeliveryNote.js';
import Project      from '../models/Project.js';
import Client       from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadImage, uploadPdf } from '../services/storage.service.js';
import { pipeDeliveryNotePdf, generateDeliveryNotePdf } from '../services/pdf.service.js';
import {
  emitNewDeliveryNote,
  emitDeliveryNoteSigned,
} from '../services/realtime.service.js';

// POST /api/deliverynote
export const create = asyncHandler(async (req, res) => {
  const { project, client, format, description, workDate, ...rest } = req.body;

  // Verificar que el proyecto y el cliente pertenecen a la compañía del usuario
  const [projectDoc, clientDoc] = await Promise.all([
    Project.findOne({ _id: project, company: req.user.companyId }),
    Client.findOne({ _id: client,  company: req.user.companyId }),
  ]);

  if (!projectDoc) throw AppError.notFound('Proyecto no encontrado en tu compañía');
  if (!clientDoc)  throw AppError.notFound('Cliente no encontrado en tu compañía');

  const note = await DeliveryNote.create({
    user:    req.user.id,
    company: req.user.companyId,
    project,
    client,
    format,
    description,
    workDate,
    ...rest,
  });

  emitNewDeliveryNote(req.user.companyId, note);
  res.status(201).json({ deliveryNote: note });
});

// GET /api/deliverynote   — lista paginada con filtros
export const list = asyncHandler(async (req, res) => {
  // page y limit llegan como Number (Zod coerce en la ruta)
  const { page, limit, sort, project, client, format, signed, from, to } = req.query;

  const filter = { company: req.user.companyId };
  if (project) filter.project = project;
  if (client)  filter.client  = client;
  if (format)  filter.format  = format;
  if (signed !== undefined) filter.signed = signed === 'true';
  if (from || to) {
    filter.workDate = {};
    if (from) filter.workDate.$gte = new Date(from);
    if (to)   filter.workDate.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;

  const [notes, totalItems] = await Promise.all([
    DeliveryNote.find(filter)
      .populate('client',  'name cif')
      .populate('project', 'name projectCode')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    DeliveryNote.countDocuments(filter),
  ]);

  res.json({
    data: notes,
    pagination: {
      totalItems,
      totalPages:  Math.ceil(totalItems / limit),
      currentPage: page,
      limit,
    },
  });
});

// GET /api/deliverynote/:id
export const getById = asyncHandler(async (req, res) => {
  const note = await DeliveryNote.findOne({
    _id:     req.params.id,
    company: req.user.companyId,
  })
    .populate('user',    'name lastName email')
    .populate('client',  'name cif email phone address')
    .populate('project', 'name projectCode address email');

  if (!note) throw AppError.notFound('Albarán no encontrado');
  res.json({ deliveryNote: note });
});

// DELETE /api/deliverynote/:id
// Un albarán firmado no se puede borrar
export const remove = asyncHandler(async (req, res) => {
  const note = await DeliveryNote.findOne({
    _id:     req.params.id,
    company: req.user.companyId,
  });

  if (!note) throw AppError.notFound('Albarán no encontrado');
  if (note.signed) {
    throw AppError.conflict('No se puede eliminar un albarán firmado');
  }

  await note.deleteOne();
  res.json({ message: 'Albarán eliminado correctamente' });
});

// PATCH /api/deliverynote/:id/sign
// Recibe la imagen de firma como multipart/form-data (campo: signature)
export const sign = asyncHandler(async (req, res) => {
  const note = await DeliveryNote.findOne({
    _id:     req.params.id,
    company: req.user.companyId,
  })
    .populate('user',    'name lastName email')
    .populate('client',  'name cif email phone address')
    .populate('project', 'name projectCode address email');

  if (!note) throw AppError.notFound('Albarán no encontrado');
  if (note.signed) throw AppError.conflict('El albarán ya está firmado');
  if (!req.file)   throw AppError.validation('Se requiere la imagen de firma');

  // 1. El buffer de la firma viene directamente de Multer (memoryStorage)
  const signatureBuffer = req.file.buffer;

  // 2. Subir la imagen de firma a Cloudinary (optimizada con Sharp)
  const signatureUrl = await uploadImage(signatureBuffer, 'signatures', `note_${note._id}`);

  // 3. Generar PDF con la firma embebida (doc.image(buffer)) y subirlo a Cloudinary
  //    No necesitamos la URL de la firma para el PDF — usamos el buffer directamente
  const pdfBuffer = await generateDeliveryNotePdf(note, signatureBuffer);
  const pdfUrl    = await uploadPdf(pdfBuffer, 'deliverynotes', `note_${note._id}`);

  // 4. Persistir estado firmado
  note.signed       = true;
  note.signatureUrl = signatureUrl;
  note.pdfUrl       = pdfUrl;
  await note.save();

  emitDeliveryNoteSigned(req.user.companyId, note);
  res.json({ deliveryNote: note, signatureUrl, pdfUrl });
});

// GET /api/deliverynote/pdf/:id
// Redirige a la URL del PDF almacenado en Cloudinary, o lo regenera si no existe
export const downloadPdf = asyncHandler(async (req, res) => {
  const note = await DeliveryNote.findOne({
    _id:     req.params.id,
    company: req.user.companyId,
  })
    .populate('user',    'name lastName email')
    .populate('client',  'name cif email phone address')
    .populate('project', 'name projectCode address email');

  if (!note) throw AppError.notFound('Albarán no encontrado');

  // Si ya hay PDF firmado guardado en Cloudinary, redirigir
  if (note.pdfUrl) {
    return res.redirect(note.pdfUrl);
  }

  // Albarán sin firmar → generar PDF al vuelo con streaming directo
  // doc.pipe(res) — sin acumular buffer en memoria
  res.setHeader('Content-Type',        'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="albaran-${note._id}.pdf"`);
  pipeDeliveryNotePdf(note, res);
});
