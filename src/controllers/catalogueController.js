import mongoose from "mongoose";
import Magasin from "../models/Magasin.js";
import Materiel from "../models/Materiel.js";

export async function getMagasinsActifs(req, res, next){
    try{
        const magasins = await Magasin.find({actif : true}).sort({nom : 1, _id : 1});
        return res.status(200).json({magasins : magasins});
    }catch(error){
        next(error);
    }
}

export async function getMaterielsMagasin(req, res, next){
    try{
        if(!mongoose.isObjectIdOrHexString(req.params.id)){
            return res.status(400).json({message_error : "Identifiant du magasin invalide !"});
        }
        const magasin = await Magasin.findOne({_id : req.params.id, actif : true});
        if(!magasin){
            return res.status(404).json({message_error : "Magasin actif introuvable !"});
        }
        const materiels = await Materiel.find({magasinId : magasin._id, actif : true}).sort({nom : 1, _id : 1});
        return res.status(200).json({magasin : magasin, materiels : materiels});
    }catch(error){
        next(error);
    }
}
