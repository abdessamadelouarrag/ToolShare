import Utilisateur from "../models/Utilisateur.js";
import Magasin from "../models/Magasin.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function register(req, res, next){
    try{
        const {nom, prenom, email, motDePasse, role = "UTILISATEUR", magasinId} = req.body || {};

        if(!["ADMIN", "GESTIONNAIRE"].includes(req.user.role)){
            return res.status(403).json({message_error : "Acces interdit !"});
        }
        if(!["GESTIONNAIRE", "UTILISATEUR"].includes(role)
            || (req.user.role === "GESTIONNAIRE" && role !== "UTILISATEUR")){
            return res.status(403).json({message_error : "Vous ne pouvez pas attribuer ce role !"});
        }
        if([nom, prenom, email, motDePasse].some(value => typeof value !== "string" || !value.trim())){
            return res.status(400).json({message_error : "Nom, prenom, email et mot de passe obligatoires !"});
        }
        if(motDePasse.length < 8 || Buffer.byteLength(motDePasse) > 72){
            return res.status(400).json({message_error : "Mot de passe : minimum 8 caracteres, maximum 72 octets !"});
        }

        const emailToLower = email.trim().toLowerCase();
        const findUser = await Utilisateur.findOne({email : emailToLower});
        if(findUser){
            return res.status(409).json({message_error : "Email deja utilise !"});
        }

        if(role === "GESTIONNAIRE"){
            if(!mongoose.isObjectIdOrHexString(magasinId)){
                return res.status(400).json({message_error : "Un magasin valide est obligatoire !"});
            }
            const magasin = await Magasin.findOne({_id : magasinId, actif : true});
            if(!magasin){
                return res.status(404).json({message_error : "Magasin actif introuvable !"});
            }
        }else if(magasinId != null){
            return res.status(400).json({message_error : "Seul un gestionnaire est affecte a un magasin !"});
        }

        const hashedPassword = await bcrypt.hash(motDePasse, 10);
        const newUser = await Utilisateur.create({
            nom : nom,
            prenom : prenom,
            email : emailToLower,
            motDePasseHash : hashedPassword,
            role : role,
            magasinId : role === "GESTIONNAIRE" ? magasinId : null,
            creePar : req.user._id
        });

        return res.status(201).json({message_success : "Compte cree.", user : newUser});
    }catch(error){
        next(error);
    }
}

export async function login(req, res, next){
    try{
        const {email, motDePasse} = req.body || {};
        if(typeof email !== "string" || typeof motDePasse !== "string" || !email.trim() || !motDePasse){
            return res.status(400).json({message_error : "Email et mot de passe obligatoires !"});
        }
        if(Buffer.byteLength(motDePasse) > 72){
            return res.status(400).json({message_error : "Mot de passe trop long !"});
        }

        const emailToLower = email.trim().toLowerCase();
        const findUser = await Utilisateur.findOne({email : emailToLower}).select("+motDePasseHash +tokenVersion");
        if(!findUser || !findUser.actif){
            return res.status(401).json({message_error : "Email ou mot de passe incorrect !"});
        }

        const validPassword = await bcrypt.compare(motDePasse, findUser.motDePasseHash);
        if(!validPassword){
            return res.status(401).json({message_error : "Email ou mot de passe incorrect !"});
        }

        const token = jwt.sign({
            sub : findUser._id.toString(),
            tokenVersion : findUser.tokenVersion ?? 0
        }, process.env.JWT_SECRET, {algorithm : "HS256", expiresIn : "1h"});

        return res.status(200).json({token : token, user : findUser, message : "Connexion reussie."});
    }catch(error){
        next(error);
    }
}

export async function logout(req, res, next){
    try{
        await Utilisateur.updateOne({_id : req.user._id}, {$inc : {tokenVersion : 1}});
        return res.status(200).json({message : "Deconnexion reussie."});
    }catch(error){
        next(error);
    }
}
