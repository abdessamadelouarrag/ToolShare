import mongoose from "mongoose";
import Magasin from "../models/Magasin.js";
import {AppError} from "../utils/AppError.js";

export async function createMagasin(data){
    const {nom, site, adresse} = data || {};
    if([nom, site, adresse].some(value => typeof value !== "string" || !value.trim())){
        throw new AppError("Nom, site et adresse obligatoires !", 400);
    }
    return Magasin.create({nom : nom.trim(), site : site.trim(), adresse : adresse.trim()});
}

export async function getMagasins(){
    return Magasin.find().sort({nom : 1, _id : 1});
}

export async function getMagasin(id){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du magasin invalide !", 400);
    }
    const magasin = await Magasin.findById(id);
    if(!magasin){
        throw new AppError("Magasin introuvable !", 404);
    }
    return magasin;
}

export async function updateMagasin(id, data){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du magasin invalide !", 400);
    }
    const updates = {};
    for(const field of ["nom", "site", "adresse"]){
        const value = data?.[field];
        if(value !== undefined){
            if(typeof value !== "string" || !value.trim()){
                throw new AppError("Champ invalide : " + field, 400);
            }
            updates[field] = value.trim();
        }
    }
    if(Object.keys(updates).length === 0){
        throw new AppError("Aucun champ a modifier !", 400);
    }
    const magasin = await Magasin.findByIdAndUpdate(
        id, {$set : updates}, {returnDocument : "after", runValidators : true}
    );
    if(!magasin){
        throw new AppError("Magasin introuvable !", 404);
    }
    return magasin;
}

export async function deactivateMagasin(id){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du magasin invalide !", 400);
    }
    const magasin = await Magasin.findByIdAndUpdate(
        id, {$set : {actif : false}}, {returnDocument : "after", runValidators : true}
    );
    if(!magasin){
        throw new AppError("Magasin introuvable !", 404);
    }
    return magasin;
}
