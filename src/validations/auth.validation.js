import { z } from 'zod';
import mongoose from 'mongoose';

export const loginSchema = z.object({
  email: z.string().email("Email invalide").trim(),
  motDePasse: z.string().min(1, "Mot de passe obligatoire").max(72, "Mot de passe trop long")
});

export const registerSchema = z.object({
  nom: z.string().trim().min(1, "Nom obligatoire"),
  prenom: z.string().trim().min(1, "Prénom obligatoire"),
  email: z.string().email("Email invalide").trim(),
  motDePasse: z.string().min(8, "Minimum 8 caractères").max(72, "Maximum 72 octets"),
  role: z.enum(["ADMIN", "GESTIONNAIRE", "UTILISATEUR"]).optional(),
  magasinId: z.string().refine((val) => mongoose.isObjectIdOrHexString(val), {
    message: "Format d'ID magasin invalide"
  }).optional().nullable()
});