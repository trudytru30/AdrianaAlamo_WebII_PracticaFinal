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

const companySchema = new mongoose.Schema(
  {
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'El owner es obligatorio'],
    },
    name: {
      type:     String,
      required: [true, 'El nombre es obligatorio'],
      trim:     true,
    },
    cif: {
      type:     String,
      required: [true, 'El CIF es obligatorio'],
      unique:   true,
      trim:     true,
      uppercase: true,
    },
    address:     addressSchema,
    logo:        { type: String },
    isFreelance: { type: Boolean, default: false },
    deleted:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Company', companySchema);
