import mongoose from 'mongoose';
import { ROLES } from './constants.js';

const utilisateurSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  // The auth controller hashes the password before assigning this field.
  motDePasseHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0, min: 0, select: false },
  role: { type: String, enum: ROLES, default: 'UTILISATEUR', required: true },
  actif: { type: Boolean, default: true, required: true },
  magasinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Magasin',
    default: null,
    required() { return this.role === 'GESTIONNAIRE'; },
  },
  creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', default: null },
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.motDePasseHash;
      delete ret.tokenVersion;
      return ret;
    },
  },
});

utilisateurSchema.index({ magasinId: 1, role: 1, actif: 1 });

export default mongoose.model('Utilisateur', utilisateurSchema);
