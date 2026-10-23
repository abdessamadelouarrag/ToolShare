const Utilisateur = require("../models/Utilisateur");
const bcrypt = require("bcrypt");

function showProfile(req, res){
    return res.status(200).json({user : req.user});
}

async function updateUser(req, res, next){
    try{
        const {nom, prenom, email} = req.body || {};
        const updates = {};
        if(nom === undefined && prenom === undefined && email === undefined){
            return res.status(400).json({message_error : "Aucun champ a modifier !"});
        }
        if(nom !== undefined){
            if(typeof nom !== "string" || !nom.trim()){
                return res.status(400).json({message_error : "Nom invalide !"});
            }
            updates.nom = nom.trim();
        }
        if(prenom !== undefined){
            if(typeof prenom !== "string" || !prenom.trim()){
                return res.status(400).json({message_error : "Prenom invalide !"});
            }
            updates.prenom = prenom.trim();
        }
        if(email !== undefined){
            if(typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())){
                return res.status(400).json({message_error : "Email invalide !"});
            }
            updates.email = email.trim().toLowerCase();
        }

        const user = await Utilisateur.findOneAndUpdate(
            {_id : req.user._id, actif : true},
            {$set : updates},
            {returnDocument : "after", runValidators : true}
        );
        if(!user){
            return res.status(401).json({message_error : "Utilisateur introuvable ou desactive !"});
        }
        return res.status(200).json({message : "Profil modifie.", user : user});
    }catch(error){
        next(error);
    }
}

async function updatePassword(req, res, next){
    try{
        const {motDePasseActuel, nouveauMotDePasse} = req.body || {};
        if(typeof motDePasseActuel !== "string" || !motDePasseActuel
            || typeof nouveauMotDePasse !== "string" || nouveauMotDePasse.length < 8
            || Buffer.byteLength(motDePasseActuel) > 72 || Buffer.byteLength(nouveauMotDePasse) > 72){
            return res.status(400).json({message_error : "Mot de passe actuel requis et nouveau mot de passe de 8 caracteres minimum (72 octets maximum) !"});
        }

        const user = await Utilisateur.findById(req.user._id).select("+motDePasseHash +tokenVersion");
        if(!user || !user.actif || (user.tokenVersion ?? 0) !== (req.user.tokenVersion ?? 0)){
            return res.status(401).json({message_error : "Reconnectez-vous !"});
        }
        const validPassword = await bcrypt.compare(motDePasseActuel, user.motDePasseHash);
        if(!validPassword){
            return res.status(401).json({message_error : "Mot de passe actuel incorrect !"});
        }

        const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
        const updated = await Utilisateur.updateOne({
            _id : user._id,
            actif : true,
            motDePasseHash : user.motDePasseHash,
            tokenVersion : {$in : [user.tokenVersion ?? 0, null]}
        }, {$set : {motDePasseHash : hashedPassword}, $inc : {tokenVersion : 1}});

        if(!updated.matchedCount){
            return res.status(409).json({message_error : "Compte modifie entre-temps. Reconnectez-vous !"});
        }
        return res.status(200).json({message : "Mot de passe modifie. Reconnectez-vous !"});
    }catch(error){
        next(error);
    }
}

module.exports = {showProfile, updateUser, updatePassword};
