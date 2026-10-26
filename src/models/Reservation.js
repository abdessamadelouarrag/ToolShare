import mongoose from 'mongoose';
import { STATUTS_RESERVATION, ETATS_MATERIEL } from './constants.js';

const reservationSchema = new mongoose.Schema({
  utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  magasinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Magasin', required: true },
  materielId: { type: mongoose.Schema.Types.ObjectId, ref: 'Materiel', required: true },
  dateDebut: {
    type: Date,
    required: true,
    validate: {
      validator(value) { return !this.isNew || value.getTime() >= Date.now(); },
      message: 'La date de debut ne peut pas etre dans le passe.',
    },
  },
  dureeHeures: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => Number.isFinite(value) && value > 0,
      message: 'La duree doit etre un nombre strictement positif.',
    },
  },
  dateFin: {
    type: Date,
    required: true,
    validate: {
      validator(value) { return this.dateDebut != null && value > this.dateDebut; },
      message: 'La date de fin doit suivre la date de debut.',
    },
  },
  statut: { type: String, enum: STATUTS_RESERVATION, default: 'CONFIRMEE', required: true },
  dateSortieReelle: {
    type: Date,
    default: null,
    required() { return ['EN_COURS', 'TERMINEE'].includes(this.statut); },
  },
  dateRetourReelle: {
    type: Date,
    default: null,
    required() { return this.statut === 'TERMINEE'; },
    validate: {
      validator(value) {
        return value == null || (this.dateSortieReelle != null && value >= this.dateSortieReelle);
      },
      message: 'Le retour doit suivre la sortie du materiel.',
    },
  },
  etatRetour: {
    type: String,
    enum: ETATS_MATERIEL,
    default: null,
    required() { return this.statut === 'TERMINEE'; },
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Use document.save() so the derived end date and document validation run.
reservationSchema.pre('validate', function () {
  if (this.dateDebut && Number.isFinite(this.dureeHeures) && this.dureeHeures > 0) {
    this.dateFin = new Date(this.dateDebut.getTime() + this.dureeHeures * 60 * 60 * 1000);
  }
  if (['CONFIRMEE', 'ANNULEE'].includes(this.statut) && this.dateSortieReelle != null) {
    this.invalidate('dateSortieReelle', 'Une sortie necessite un emprunt en cours ou termine.');
  }
  if (this.statut !== 'TERMINEE' && (this.dateRetourReelle != null || this.etatRetour != null)) {
    this.invalidate('dateRetourReelle', 'Un retour necessite une reservation terminee.');
  }
});

reservationSchema.virtual('enRetard').get(function () {
  return this.statut === 'EN_COURS' && this.dateRetourReelle == null
    && this.dateFin != null && this.dateFin.getTime() < Date.now();
});

reservationSchema.index({ materielId: 1, statut: 1, dateDebut: 1, dateFin: 1 });
reservationSchema.index({ magasinId: 1, statut: 1, dateDebut: 1 });
reservationSchema.index({ utilisateurId: 1, dateDebut: -1 });
reservationSchema.index({ statut: 1, dateFin: 1 });
// Only one physical handover can be in progress for an equipment item.
reservationSchema.index({ materielId: 1 }, {
  unique: true,
  partialFilterExpression: { statut: 'EN_COURS' },
  name: 'un_emprunt_en_cours_par_materiel',
});

export default mongoose.model('Reservation', reservationSchema);
