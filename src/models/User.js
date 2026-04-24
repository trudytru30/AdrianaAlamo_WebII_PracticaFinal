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

const userSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: [true, 'El email es obligatorio'],
      unique:   true,
      lowercase: true,
      trim:     true,
      index:    true,
    },
    password: {
      type:     String,
      required: [true, 'La contraseña es obligatoria'],
      select:   false,
    },
    name:     { type: String, trim: true },
    lastName: { type: String, trim: true },
    nif:      { type: String, trim: true },
    role: {
      type:    String,
      enum:    ['admin', 'guest'],
      default: 'admin',
      index:   true,
    },
    status: {
      type:    String,
      enum:    ['pending', 'verified'],
      default: 'pending',
      index:   true,
    },
    verificationCode:     { type: String, select: false },
    verificationAttempts: { type: Number, default: 3 },
    company: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'Company',
      index: true,
    },
    address:      addressSchema,
    refreshToken: { type: String, select: false },
    deleted:      { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// Virtual: nombre completo
userSchema.virtual('fullName').get(function () {
  if (!this.name && !this.lastName) return '';
  return `${this.name ?? ''} ${this.lastName ?? ''}`.trim();
});

export default mongoose.model('User', userSchema);
