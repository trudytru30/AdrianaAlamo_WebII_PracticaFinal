import mongoose      from 'mongoose';
import DeliveryNote   from '../models/DeliveryNote.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/dashboard
 *
 * Estadísticas de la compañía mediante aggregation pipeline:
 *   - Albaranes por mes (últimos 12 meses)
 *   - Horas totales por proyecto (top 10)
 *   - Materiales más usados por cliente (top 10)
 *   - Resumen global (totales, firmados, pendientes)
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const companyId = new mongoose.Types.ObjectId(req.user.companyId);

  const [summary, byMonth, hoursByProject, materialsByClient] = await Promise.all([

    // ── Resumen global ─────────────────────────────────────────────────────────
    DeliveryNote.aggregate([
      { $match: { company: companyId, deleted: false } },
      {
        $group: {
          _id:      null,
          total:    { $sum: 1 },
          signed:   { $sum: { $cond: ['$signed', 1, 0] } },
          pending:  { $sum: { $cond: ['$signed', 0, 1] } },
          totalHours: {
            $sum: { $cond: [{ $eq: ['$format', 'hours'] }, { $ifNull: ['$hours', 0] }, 0] },
          },
        },
      },
      { $project: { _id: 0 } },
    ]),

    // ── Albaranes por mes (últimos 12 meses) ───────────────────────────────────
    DeliveryNote.aggregate([
      {
        $match: {
          company: companyId,
          deleted: false,
          workDate: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year:  '$workDate' },
            month: { $month: '$workDate' },
          },
          count:  { $sum: 1 },
          signed: { $sum: { $cond: ['$signed', 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year:   '$_id.year',
          month:  '$_id.month',
          count:  1,
          signed: 1,
        },
      },
    ]),

    // ── Horas totales por proyecto (top 10) ────────────────────────────────────
    DeliveryNote.aggregate([
      { $match: { company: companyId, deleted: false, format: 'hours' } },
      {
        $group: {
          _id:        '$project',
          totalHours: { $sum: { $ifNull: ['$hours', 0] } },
          count:      { $sum: 1 },
        },
      },
      { $sort: { totalHours: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from:         'projects',
          localField:   '_id',
          foreignField: '_id',
          as:           'project',
        },
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:        0,
          projectId:  '$_id',
          name:       { $ifNull: ['$project.name', 'Proyecto eliminado'] },
          code:       '$project.projectCode',
          totalHours: 1,
          count:      1,
        },
      },
    ]),

    // ── Materiales más usados por cliente (top 10) ─────────────────────────────
    DeliveryNote.aggregate([
      { $match: { company: companyId, deleted: false, format: 'material' } },
      {
        $group: {
          _id:           '$client',
          totalQuantity: { $sum: { $ifNull: ['$quantity', 0] } },
          count:         { $sum: 1 },
          materials:     { $addToSet: '$material' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from:         'clients',
          localField:   '_id',
          foreignField: '_id',
          as:           'client',
        },
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:           0,
          clientId:      '$_id',
          name:          { $ifNull: ['$client.name', 'Cliente eliminado'] },
          totalQuantity: 1,
          count:         1,
          materials:     1,
        },
      },
    ]),
  ]);

  res.json({
    summary:          summary[0] ?? { total: 0, signed: 0, pending: 0, totalHours: 0 },
    notesByMonth:     byMonth,
    hoursByProject,
    materialsByClient,
  });
});
