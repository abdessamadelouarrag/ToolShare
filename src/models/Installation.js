import mongoose from 'mongoose';

const installationSchema = new mongoose.Schema({
  // A fixed primary key allows only one installation record.
  _id: { type: String, enum: ['installation'], default: 'installation', required: true },
  installe: { type: Boolean, default: false, required: true },
  installeLe: {
    type: Date,
    default: null,
    required() { return this.installe; },
  },
}, { timestamps: true });

export default mongoose.model('Installation', installationSchema);
