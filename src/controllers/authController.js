import * as authService from "../services/authService.js";

export async function register(req, res, next){
    try{
        const user = await authService.register(req.body, req.user);
        return res.status(201).json({status : "success", message : "Compte créé.", data : {user : user}});
    }catch(error){
        next(error);
    }
}

export async function login(req, res, next){
    try{
        const data = await authService.login(req.body);
        return res.status(200).json({status : "success", message : "Connexion réussie.", data : data});
    }catch(error){
        next(error);
    }
}

export async function logout(req, res, next){
    try{
        await authService.logout(req.user._id);
        return res.status(200).json({status : "success", message : "Déconnexion réussie."});
    }catch(error){
        next(error);
    }
}
