import Utilisateur from "../models/Utilisateur.js";
import bcrypt from "bcrypt";
import {AppError} from "../utils/AppError.js";

export async function updateUser(userId, data){
    const {nom, prenom, email} = data;
    if(!nom && !prenom && !email){
        throw new AppError("Aucun champ à modifier !", 400);
    }
    const updates = {};
    if(nom) updates.nom = nom;
    if(prenom) updates.prenom = prenom;
    if(email) updates.email = email;
    try{
        const user = await Utilisateur.findOneAndUpdate(
            {_id : userId, actif : true}, {$set : updates},
            {returnDocument : "after", runValidators : true}
        );
        if(!user){
            throw new AppError("Utilisateur introuvable ou désactivé !", 401);
        }
        return user;
    }catch(error){
        if(error.code === 11000){
            throw new AppError("Email déjà utilisé !", 409);
        }
        throw error;
    }
}

export async function updatePassword(userId, data){
    const {motDePasseActuel, nouveauMotDePasse} = data;
    const user = await Utilisateur.findById(userId).select("+motDePasseHash +tokenVersion");
    if(!user || !user.actif){
        throw new AppError("Reconnectez-vous !", 401);
    }
    if(!await bcrypt.compare(motDePasseActuel, user.motDePasseHash)){
        throw new AppError("Mot de passe actuel incorrect !", 401);
    }
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
    const updated = await Utilisateur.updateOne({
        _id : user._id, actif : true, motDePasseHash : user.motDePasseHash,
        tokenVersion : {$in : [user.tokenVersion ?? 0, null]}
    }, {$set : {motDePasseHash : hashedPassword}, $inc : {tokenVersion : 1}});
    if(!updated.matchedCount){
        throw new AppError("Compte modifié entre-temps. Reconnectez-vous !", 409);
    }
}
