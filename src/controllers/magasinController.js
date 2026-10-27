import * as magasinService from "../services/magasinService.js";
import {AppError} from "../utils/AppError.js";

export async function createMagasin(req, res, next){
    try{
        const magasin = await magasinService.createMagasin(req.body);
        return res.status(201).json({message_success : "Magasin cree.", magasin : magasin});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function getMagasins(req, res, next){
    try{
        const magasins = await magasinService.getMagasins();
        return res.status(200).json({magasins : magasins});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function getMagasin(req, res, next){
    try{
        const magasin = await magasinService.getMagasin(req.params.id);
        return res.status(200).json({magasin : magasin});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function updateMagasin(req, res, next){
    try{
        const magasin = await magasinService.updateMagasin(req.params.id, req.body);
        return res.status(200).json({message : "Magasin modifie.", magasin : magasin});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function deactivateMagasin(req, res, next){
    try{
        const magasin = await magasinService.deactivateMagasin(req.params.id);
        return res.status(200).json({message : "Magasin desactive. Historique conserve.", magasin : magasin});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}
