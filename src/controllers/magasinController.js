import Magasin from "../models/Magasin.js";
import mongoose from "mongoose";

export async function createMagasin(req, res, next){
    try{
        const {nom, site, adresse} = req.body || {};
        if([nom, site, adresse].some(value => typeof value !== "string" || !value.trim())){
            return res.status(400).json({message_error : "Nom, site et adresse obligatoires !"});
        }

        const magasin = await Magasin.create({
            nom : nom.trim(),
            site : site.trim(),
            adresse : adresse.trim()
        });
        return res.status(201).json({message_success : "Magasin cree.", magasin : magasin});
    }catch(error){
        next(error);
    }
}

export async function getMagasins(req, res, next){
    try{
        const magasins = await Magasin.find().sort({nom : 1, _id : 1});
        return res.status(200).json({magasins : magasins});
    }catch(error){
        next(error);
    }
}

export async function getMagasin(req, res, next){
    try{
        if(!mongoose.isObjectIdOrHexString(req.params.id)){
            return res.status(400).json({message_error : "Identifiant du magasin invalide !"});
        }
        const magasin = await Magasin.findById(req.params.id);
        if(!magasin){
            return res.status(404).json({message_error : "Magasin introuvable !"});
        }
        return res.status(200).json({magasin : magasin});
    }catch(error){
        next(error);
    }
}

export async function updateMagasin(req, res, next){
    try{
        if(!mongoose.isObjectIdOrHexString(req.params.id)){
            return res.status(400).json({message_error : "Identifiant du magasin invalide !"});
        }
        const updates = {};
        for(const field of ["nom", "site", "adresse"]){
            const value = req.body?.[field];
            if(value !== undefined){
                if(typeof value !== "string" || !value.trim()){
                    return res.status(400).json({message_error : "Champ invalide : " + field});
                }
                updates[field] = value.trim();
            }
        }
        if(Object.keys(updates).length === 0){
            return res.status(400).json({message_error : "Aucun champ a modifier !"});
        }

        const magasin = await Magasin.findByIdAndUpdate(
            req.params.id,
            {$set : updates},
            {returnDocument : "after", runValidators : true}
        );
        if(!magasin){
            return res.status(404).json({message_error : "Magasin introuvable !"});
        }
        return res.status(200).json({message : "Magasin modifie.", magasin : magasin});
    }catch(error){
        next(error);
    }
}
