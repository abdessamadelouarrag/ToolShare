import * as profileService from "../services/profileService.js";

export function showProfile(req, res){
    return res.status(200).json({status : "success", data : {user : req.user}});
}

export async function updateUser(req, res, next){
    try{
        const user = await profileService.updateUser(req.user._id, req.body);
        return res.status(200).json({status : "success", message : "Profil modifié.", data : {user : user}});
    }catch(error){
        next(error);
    }
}

export async function updatePassword(req, res, next){
    try{
        await profileService.updatePassword(req.user._id, req.body);
        return res.status(200).json({status : "success", message : "Mot de passe modifié. Reconnectez-vous !"});
    }catch(error){
        next(error);
    }
}
