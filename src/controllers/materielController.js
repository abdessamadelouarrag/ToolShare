import * as materielService from "../services/materielService.js";
import {AppError} from "../utils/AppError.js";

export async function createMateriel(req, res, next){
    try{
        const materiel = await materielService.createMateriel(req.magasin._id, req.body);
        return res.status(201).json({message_success : "Materiel cree.", materiel : materiel});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function getMateriels(req, res, next){
    try{
        const materiels = await materielService.getMateriels(req.magasin._id);
        return res.status(200).json({materiels : materiels});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function getMateriel(req, res, next){
    try{
        const materiel = await materielService.getMateriel(req.magasin._id, req.params.id);
        return res.status(200).json({materiel : materiel});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function updateMateriel(req, res, next){
    try{
        const materiel = await materielService.updateMateriel(req.magasin._id, req.params.id, req.body);
        return res.status(200).json({message : "Materiel modifie.", materiel : materiel});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function deactivateMateriel(req, res, next){
    try{
        const materiel = await materielService.deactivateMateriel(req.magasin._id, req.params.id);
        return res.status(200).json({message : "Materiel desactive. Historique conserve.", materiel : materiel});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}

export async function updateDisponibilite(req, res, next){
    try{
        const materiel = await materielService.updateDisponibilite(req.magasin._id, req.params.id, req.body);
        return res.status(200).json({message : materiel.disponible ? "Materiel remis en service." : "Materiel indisponible.", materiel : materiel});
    }catch(error){
        if(error instanceof AppError){
            return res.status(error.statusCode).json({message_error : error.message});
        }
        next(error);
    }
}
