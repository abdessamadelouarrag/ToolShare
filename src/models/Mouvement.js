import mongoose from 'mongoose';
import { ETATS_MATERIEL, TYPES_MOUVEMENT } from './constants.js';

const mouvementSchema = new mongoose.Schema({
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
  magasinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Magasin', required: true },
  type: { type: String, enum: TYPES_MOUVEMENT, required: true },
  effectuePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  date: { type: Date, default: Date.now, required: true },
  etat: {
    type: String,
    enum: ETATS_MATERIEL,
    default: null,
    required() { return this.type === 'RETOUR'; },
  },
}, { timestamps: true });

mouvementSchema.index({ magasinId: 1, date: -1 });
mouvementSchema.index({ reservationId: 1, date: 1 });

export default mongoose.model('Mouvement', mouvementSchema);
