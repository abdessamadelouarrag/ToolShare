export function errorHandler(error, req, res, next){
    if(res.headersSent){
        return next(error);
    }
    if(error.code === 11000){
        return res.status(409).json({message_error : "Email ou reference deja utilise !"});
    }
    if(error.name === "ValidationError" || error.name === "CastError"){
        return res.status(400).json({message_error : "Donnees invalides !"});
    }
    if(error.type === "entity.parse.failed"){
        return res.status(400).json({message_error : "Requete JSON invalide !"});
    }
    if(error.type === "entity.too.large"){
        return res.status(413).json({message_error : "Requete trop volumineuse !"});
    }

    console.error(error);
    return res.status(500).json({message_error : "Erreur interne du serveur !"});
}
