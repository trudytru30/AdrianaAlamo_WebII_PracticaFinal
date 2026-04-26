import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    street:   { type: String, trim: true },
    number:   { type: String, trim: true },
    postal:   { type: String, trim: true },
    city:     { type: String, trim: true },
    province: { type: String, trim: true },
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
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
    name: {
      type:     String,
      required: [true, 'El nombre es obligatorio'],
      trim:     true,
    },
    cif:   { type: String, required: [true, 'El CIF es obligatorio'], trim: true, uppercase: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: addressSchema,
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Índice compuesto único: no puede haber dos clientes con el mismo CIF dentro de una compañía
clientSchema.index({ company: 1, cif: 1 }, { unique: true });

// Soft delete: excluye documentos con deleted=true de todas las queries
// (find, findOne, countDocuments, findOneAndUpdate, etc.)
const excludeDeleted = function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deleted: false });
  }
  next();
};
clientSchema.pre(/^find/, excludeDeleted);
clientSchema.pre('countDocuments', excludeDeleted);

export default mongoose.model('Client', clientSchema);
