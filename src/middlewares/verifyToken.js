import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Utilisateur from "../models/Utilisateur.js";
import Magasin from "../models/Magasin.js";

export function verifyAdmin(req, res, next){
    if(req.user?.role !== "ADMIN"){
        return res.status(403).json({message_error : "Acces reserve a l'Admin !"});
    }
    next();
}

export async function verifyGestionnaire(req, res, next){
    try{
        if(req.user?.role !== "GESTIONNAIRE" || !req.user.magasinId){
            return res.status(403).json({message_error : "Acces reserve a un gestionnaire affecte a un magasin !"});
        }
        const magasin = await Magasin.findById(req.user.magasinId);
        if(!magasin){
            return res.status(404).json({message_error : "Magasin affecte introuvable !"});
        }
        req.magasin = magasin;
        next();
    }catch(error){
        next(error);
    }
}

export function verifyMagasinActif(req, res, next){
    if(!req.magasin?.actif){
        return res.status(409).json({message_error : "Le magasin est desactive !"});
    }
    next();
}

export async function verifyToken(req, res, next){
    const authorization = req.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if(!token){
        return res.status(401).json({message_error : "Token manquant !"});
    }

    try{
        const payload = jwt.verify(token, process.env.JWT_SECRET, {algorithms : ["HS256"]});
        if(typeof payload !== "object" || !mongoose.isObjectIdOrHexString(payload.sub)
            || !Number.isInteger(payload.tokenVersion)){
            return res.status(401).json({message_error : "Token invalide !"});
        }

        const user = await Utilisateur.findById(payload.sub).select("+tokenVersion");
        if(!user || !user.actif){
            return res.status(401).json({message_error : "Utilisateur introuvable ou desactive !"});
        }
        if(payload.tokenVersion !== (user.tokenVersion ?? 0)){
            return res.status(401).json({message_error : "Vous etes deconnecte. Reconnectez-vous !"});
        }

        req.user = user;
        next();
    }catch(error){
        if(["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)){
            return res.status(401).json({message_error : "Token invalide ou expire !"});
        }
        next(error);
    }
}
