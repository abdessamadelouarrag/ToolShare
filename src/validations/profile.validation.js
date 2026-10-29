import { z } from 'zod';

export const updateProfileSchema = z.object({
  nom: z.string().trim().min(1, "Le nom ne peut pas être vide").optional(),
  prenom: z.string().trim().min(1, "Le prénom ne peut pas être vide").optional(),
  email: z.string().email("Format d'email invalide").trim().optional()
});

export const updatePasswordSchema = z.object({
  ancienMotDePasse: z.string().min(1, "L'ancien mot de passe est requis"),
  nouveauMotDePasse: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères").max(72, "Mot de passe trop long")
});