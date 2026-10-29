import { z } from 'zod';

export const installationSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire"),
  prenom: z.string().trim().min(1, "Le prénom est obligatoire"),
  email: z.string().email("Veuillez fournir une adresse email valide").trim(),
  motDePasse: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères")
});