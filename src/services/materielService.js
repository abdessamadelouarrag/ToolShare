import mongoose from "mongoose";
import Materiel from "../models/Materiel.js";
import {AppError} from "../utils/AppError.js";

export async function createMateriel(storeId, data){
    const {reference, nom, categorie, description = "", magasinId} = data || {};
    if(magasinId !== undefined && magasinId !== storeId.toString()){
        throw new AppError("Vous pouvez creer du materiel uniquement dans votre magasin !", 403);
    }
    if([reference, nom, categorie].some(value => typeof value !== "string" || !value.trim()) || typeof description !== "string"){
        throw new AppError("Reference, nom et categorie obligatoires. Description invalide !", 400);
    }
    try{
        return await Materiel.create({
            reference : reference.trim(), nom : nom.trim(), categorie : categorie.trim(),
            description : description.trim(), magasinId : storeId
        });
    }catch(error){
        if(error.code === 11000){
            throw new AppError("Reference du materiel deja utilisee !", 409);
        }
        throw error;
    }
}

export async function getMateriels(storeId){
    return Materiel.find({magasinId : storeId}).sort({nom : 1, _id : 1});
}

export async function getMateriel(storeId, id){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du materiel invalide !", 400);
    }
    const materiel = await Materiel.findOne({_id : id, magasinId : storeId});
    if(!materiel){
        throw new AppError("Materiel introuvable dans votre magasin !", 404);
    }
    return materiel;
}

export async function updateMateriel(storeId, id, data){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du materiel invalide !", 400);
    }
    if(data?.magasinId !== undefined){
        throw new AppError("Le magasin du materiel ne peut pas etre modifie !", 400);
    }
    const updates = {};
    for(const field of ["reference", "nom", "categorie", "description"]){
        const value = data?.[field];
        if(value !== undefined){
            if(typeof value !== "string" || (field !== "description" && !value.trim())){
                throw new AppError("Champ invalide : " + field, 400);
            }
            updates[field] = value.trim();
        }
    }
    if(Object.keys(updates).length === 0){
        throw new AppError("Aucun champ a modifier !", 400);
    }
    let materiel;
    try{
        materiel = await Materiel.findOneAndUpdate(
            {_id : id, magasinId : storeId}, {$set : updates},
            {returnDocument : "after", runValidators : true}
        );
    }catch(error){
        if(error.code === 11000){
            throw new AppError("Reference du materiel deja utilisee !", 409);
        }
        throw error;
    }
    if(!materiel){
        throw new AppError("Materiel introuvable dans votre magasin !", 404);
    }
    return materiel;
}

export async function deactivateMateriel(storeId, id){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du materiel invalide !", 400);
    }
    const materiel = await Materiel.findOneAndUpdate(
        {_id : id, magasinId : storeId}, {$set : {actif : false}},
        {returnDocument : "after", runValidators : true}
    );
    if(!materiel){
        throw new AppError("Materiel introuvable dans votre magasin !", 404);
    }
    return materiel;
}

export async function updateDisponibilite(storeId, id, data){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du materiel invalide !", 400);
    }
    const {disponible} = data || {};
    if(typeof disponible !== "boolean"){
        throw new AppError("Disponible doit etre true ou false !", 400);
    }
    const materiel = await getMateriel(storeId, id);
    if(!materiel.actif){
        throw new AppError("Le materiel est desactive !", 409);
    }
    materiel.disponible = disponible;
    await materiel.save();
    return materiel;
}
