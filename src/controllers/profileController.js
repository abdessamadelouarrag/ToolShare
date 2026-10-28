import Utilisateur from "../models/Utilisateur.js";
import bcrypt from "bcrypt";
import { AppError } from "../utils/AppError.js";

export function showProfile(req, res) {
    return res.status(200).json({ status: "success", data: { user: req.user } });
}

export async function updateUser(req, res, next) {
    try {
        const { nom, prenom, email } = req.body;
        
        if (!nom && !prenom && !email) {
            throw new AppError("Aucun champ à modifier !", 400);
        }

        const updates = {};
        if (nom) updates.nom = nom;
        if (prenom) updates.prenom = prenom;
        if (email) updates.email = email;

        const user = await Utilisateur.findOneAndUpdate(
            { _id: req.user._id, actif: true },
            { $set: updates },
            { returnDocument: "after", runValidators: true }
        );

        if (!user) {
            throw new AppError("Utilisateur introuvable ou désactivé !", 401);
        }

        return res.status(200).json({ status: "success", message: "Profil modifié.", data: { user } });
    } catch (error) {
        if (error.code === 11000) {
            return next(new AppError("Email déjà utilisé !", 409));
        }
        next(error);
    }
}

export async function updatePassword(req, res, next) {
    try {
        const { motDePasseActuel, nouveauMotDePasse } = req.body;

        const user = await Utilisateur.findById(req.user._id).select("+motDePasseHash +tokenVersion");
        
        if (!user || !user.actif) {
            throw new AppError("Reconnectez-vous !", 401);
        }

        const validPassword = await bcrypt.compare(motDePasseActuel, user.motDePasseHash);
        if (!validPassword) {
            throw new AppError("Mot de passe actuel incorrect !", 401);
        }

        const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
        
        // Optimistic locking : on s'assure que le hash et la version n'ont pas changé entre le SELECT et l'UPDATE
        const updated = await Utilisateur.updateOne({
            _id: user._id,
            actif: true,
            motDePasseHash: user.motDePasseHash,
            tokenVersion: { $in: [user.tokenVersion ?? 0, null] }
        }, { 
            $set: { motDePasseHash: hashedPassword }, 
            $inc: { tokenVersion: 1 } 
        });

        if (!updated.matchedCount) {
            throw new AppError("Compte modifié entre-temps. Reconnectez-vous !", 409);
        }

        return res.status(200).json({ status: "success", message: "Mot de passe modifié. Reconnectez-vous !" });
    } catch (error) {
        next(error);
    }
}