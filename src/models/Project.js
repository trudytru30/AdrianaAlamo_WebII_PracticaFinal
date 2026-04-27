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

const projectSchema = new mongoose.Schema(
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
      required: [true, 'El cliente es obligatorio'],
    },
    name: {
      type:     String,
      required: [true, 'El nombre del proyecto es obligatorio'],
      trim:     true,
    },
    projectCode: {
      type:     String,
      required: [true, 'El código de proyecto es obligatorio'],
      trim:     true,
    },
    address: addressSchema,
    email:   { type: String, lowercase: true, trim: true },
    notes:   { type: String, trim: true },
    active:  { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Índice compuesto: código de proyecto único dentro de una compañía
projectSchema.index({ company: 1, projectCode: 1 }, { unique: true });

// Soft delete: excluye documentos con deleted=true de todas las queries
const excludeDeleted = function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deleted: false });
  }
  next();
};
projectSchema.pre(/^find/, excludeDeleted);
projectSchema.pre('countDocuments', excludeDeleted);

export default mongoose.model('Project', projectSchema);
