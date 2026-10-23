const mongoose = require('mongoose');

const magasinSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  site: { type: String, required: true, trim: true },
  adresse: { type: String, required: true, trim: true },
  actif: { type: Boolean, default: true, required: true },
}, { timestamps: true });

magasinSchema.index({ actif: 1, site: 1 });

module.exports = mongoose.model('Magasin', magasinSchema);
