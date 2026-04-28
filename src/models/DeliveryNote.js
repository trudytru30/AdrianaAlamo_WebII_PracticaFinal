import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    hours: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const deliveryNoteSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    company: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Company',
      required: true,
      index:    true,
    },
    client: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Client',
      required: true,
    },
    project: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Project',
      required: true,
      index:    true,
    },
    format: {
      type:     String,
      enum:     ['material', 'hours'],
      required: [true, 'El formato (material | hours) es obligatorio'],
    },
    description: { type: String, trim: true },
    workDate: {
      type:     Date,
      required: [true, 'La fecha de trabajo es obligatoria'],
      index:    true,
    },
    // Campos para format = 'material'
    material: { type: String, trim: true },
    quantity: { type: Number, min: 0 },
    unit:     { type: String, trim: true },
    // Campos para format = 'hours'
    hours:   { type: Number, min: 0 },
    workers: { type: [workerSchema], default: [] },
    // Firma
    signed:       { type: Boolean, default: false },
    signedAt:     { type: Date },
    signatureUrl: { type: String },
    pdfUrl:       { type: String },
    deleted:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Soft delete: excluye documentos con deleted=true de todas las queries
const excludeDeleted = function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deleted: false });
  }
  next();
};
deliveryNoteSchema.pre(/^find/, excludeDeleted);
deliveryNoteSchema.pre('countDocuments', excludeDeleted);

export default mongoose.model('DeliveryNote', deliveryNoteSchema);
