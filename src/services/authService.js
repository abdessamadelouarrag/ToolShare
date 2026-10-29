import Utilisateur from "../models/Utilisateur.js";
import Magasin from "../models/Magasin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {AppError} from "../utils/AppError.js";

export async function register(data, creator){
    const {nom, prenom, email, motDePasse, role = "UTILISATEUR", magasinId} = data;
    if(!["ADMIN", "GESTIONNAIRE"].includes(creator.role)){
        throw new AppError("Accès interdit !", 403);
    }
    if(!["GESTIONNAIRE", "UTILISATEUR"].includes(role)
        || (creator.role === "GESTIONNAIRE" && role !== "UTILISATEUR")){
        throw new AppError("Vous ne pouvez pas attribuer ce rôle !", 403);
    }
    const emailToLower = email.toLowerCase();
    if(await Utilisateur.findOne({email : emailToLower})){
        throw new AppError("Email déjà utilisé !", 409);
    }
    if(role === "GESTIONNAIRE"){
        if(!magasinId){
            throw new AppError("Un magasin valide est obligatoire pour un gestionnaire !", 400);
        }
        const magasin = await Magasin.findOne({_id : magasinId, actif : true});
        if(!magasin){
            throw new AppError("Magasin actif introuvable !", 404);
        }
    }else if(magasinId != null){
        throw new AppError("Seul un gestionnaire est affecté à un magasin !", 400);
    }
    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    return Utilisateur.create({
        nom, prenom, email : emailToLower, motDePasseHash : hashedPassword, role,
        magasinId : role === "GESTIONNAIRE" ? magasinId : null,
        creePar : creator._id
    });
}

export async function login(data){
    const {email, motDePasse} = data;
    const user = await Utilisateur.findOne({email : email.toLowerCase()}).select("+motDePasseHash +tokenVersion");
    if(!user || !user.actif || !await bcrypt.compare(motDePasse, user.motDePasseHash)){
        throw new AppError("Email ou mot de passe incorrect !", 401);
    }
    const token = jwt.sign({sub : user._id.toString(), tokenVersion : user.tokenVersion ?? 0},
        process.env.JWT_SECRET, {algorithm : "HS256", expiresIn : "1h"});
    return {token, user};
}

export async function logout(userId){
    await Utilisateur.updateOne({_id : userId}, {$inc : {tokenVersion : 1}});
}
