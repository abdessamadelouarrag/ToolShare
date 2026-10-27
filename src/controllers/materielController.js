import mongoose from "mongoose";
import Materiel from "../models/Materiel.js";

export async function createMateriel(req, res, next){
    try{
        const {reference, nom, categorie, description = "", magasinId} = req.body || {};
        if(magasinId !== undefined && magasinId !== req.magasin._id.toString()){
            return res.status(403).json({message_error : "Vous pouvez creer du materiel uniquement dans votre magasin !"});
        }
        if([reference, nom, categorie].some(value => typeof value !== "string" || !value.trim()) || typeof description !== "string"){
            return res.status(400).json({message_error : "Reference, nom et categorie obligatoires. Description invalide !"});
        }

        const materiel = await Materiel.create({
            reference : reference.trim(), nom : nom.trim(), categorie : categorie.trim(),
            description : description.trim(), magasinId : req.magasin._id
        });
        return res.status(201).json({message_success : "Materiel cree.", materiel : materiel});
    }catch(error){
        next(error);
    }
}

export async function getMateriels(req, res, next){
    try{
        const materiels = await Materiel.find({magasinId : req.magasin._id}).sort({nom : 1, _id : 1});
        return res.status(200).json({materiels : materiels});
    }catch(error){
        next(error);
    }
}

export async function getMateriel(req, res, next){
    try{
        if(!mongoose.isObjectIdOrHexString(req.params.id)){
            return res.status(400).json({message_error : "Identifiant du materiel invalide !"});
        }
        const materiel = await Materiel.findOne({_id : req.params.id, magasinId : req.magasin._id});
        if(!materiel){
            return res.status(404).json({message_error : "Materiel introuvable dans votre magasin !"});
        }
        return res.status(200).json({materiel : materiel});
    }catch(error){
        next(error);
    }
}

export async function updateMateriel(req, res, next){
    try{
        if(!mongoose.isObjectIdOrHexString(req.params.id)){
            return res.status(400).json({message_error : "Identifiant du materiel invalide !"});
        }
        if(req.body?.magasinId !== undefined){
            return res.status(400).json({message_error : "Le magasin du materiel ne peut pas etre modifie !"});
        }
        const updates = {};
        for(const field of ["reference", "nom", "categorie", "description"]){
            const value = req.body?.[field];
            if(value !== undefined){
                if(typeof value !== "string" || (field !== "description" && !value.trim())){
                    return res.status(400).json({message_error : "Champ invalide : " + field});
                }
                updates[field] = value.trim();
            }
        }
        if(Object.keys(updates).length === 0){
            return res.status(400).json({message_error : "Aucun champ a modifier !"});
        }
        const materiel = await Materiel.findOneAndUpdate(
            {_id : req.params.id, magasinId : req.magasin._id},
            {$set : updates},
            {returnDocument : "after", runValidators : true}
        );
        if(!materiel){
            return res.status(404).json({message_error : "Materiel introuvable dans votre magasin !"});
        }
        return res.status(200).json({message : "Materiel modifie.", materiel : materiel});
    }catch(error){
        next(error);
    }
}

export async function deactivateMateriel(req, res, next){
    try{
        if(!mongoose.isObjectIdOrHexString(req.params.id)){
            return res.status(400).json({message_error : "Identifiant du materiel invalide !"});
        }
        const materiel = await Materiel.findOneAndUpdate(
            {_id : req.params.id, magasinId : req.magasin._id},
            {$set : {actif : false}},
            {returnDocument : "after", runValidators : true}
        );
        if(!materiel){
            return res.status(404).json({message_error : "Materiel introuvable dans votre magasin !"});
        }
        return res.status(200).json({message : "Materiel desactive. Historique conserve.", materiel : materiel});
    }catch(error){
        next(error);
    }
}
