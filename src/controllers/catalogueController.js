import * as catalogueService from "../services/catalogueService.js";
import {AppError} from "../utils/AppError.js";

export async function getMagasinsActifs(req, res, next){
    try{
        const magasins = await catalogueService.getMagasinsActifs();
        return res.status(200).json({magasins : magasins});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function getMaterielsMagasin(req, res, next){
    try{
        const {magasin, materiels} = await catalogueService.getMaterielsMagasin(req.params.id);
        return res.status(200).json({magasin : magasin, materiels : materiels});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}
