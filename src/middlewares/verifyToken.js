import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Utilisateur from "../models/Utilisateur.js";

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
