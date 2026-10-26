import mongoose from 'mongoose';

const materielSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  categorie: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  disponible: { type: Boolean, default: true, required: true },
  actif: { type: Boolean, default: true, required: true },
  magasinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Magasin', required: true },
}, { timestamps: true });

materielSchema.index({ magasinId: 1, actif: 1, disponible: 1 });

export default mongoose.model('Materiel', materielSchema);
