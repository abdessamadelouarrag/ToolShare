import * as installationService from "../services/installationService.js";

export async function installationStatus(req, res, next){
    try{
        const status = await installationService.installationStatus();
        return res.status(200).json(status);
    }catch(error){
        next(error);
    }
}

export async function install(req, res, next){
    try{
        const admin = await installationService.install(req.body);
        return res.status(201).json({
            status : "success",
            message : "Installation effectuée avec succès.",
            data : {
                installe : true,
                user : {id : admin._id, nom : admin.nom, prenom : admin.prenom, email : admin.email, role : admin.role}
            }
        });
    }catch(error){
        next(error);
    }
}
