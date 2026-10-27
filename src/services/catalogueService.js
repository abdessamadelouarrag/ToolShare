import mongoose from "mongoose";
import Magasin from "../models/Magasin.js";
import Materiel from "../models/Materiel.js";
import {AppError} from "../utils/AppError.js";

export async function getMagasinsActifs(){
    return Magasin.find({actif : true}).sort({nom : 1, _id : 1});
}

export async function getMaterielsMagasin(id){
    if(!mongoose.isObjectIdOrHexString(id)){
        throw new AppError("Identifiant du magasin invalide !", 400);
    }
    const magasin = await Magasin.findOne({_id : id, actif : true});
    if(!magasin){
        throw new AppError("Magasin actif introuvable !", 404);
    }
    const materiels = await Materiel.find({magasinId : magasin._id, actif : true}).sort({nom : 1, _id : 1});
    return {magasin, materiels};
}
