const bcrypt = require("bcrypt");
const Utilisateur = require("../models/Utilisateur");
const Installation = require("../models/Installation");

async function installationStatus(req, res, next){
    try{
        const installation = await Installation.findById("installation");
        return res.status(200).json({installe : installation?.installe ?? false});
    }catch(error){
        next(error);
    }
}

async function install(req, res, next){
    try{
        const {nom, prenom, email, motDePasse} = req.body || {};
        if([nom, prenom, email, motDePasse].some(value => typeof value !== "string" || !value.trim())){
            return res.status(400).json({message_error : "Nom, prenom, email et mot de passe obligatoires !"});
        }
        if(!/^\S+@\S+\.\S+$/.test(email.trim())){
            return res.status(400).json({message_error : "Email invalide !"});
        }
        if(motDePasse.length < 8 || Buffer.byteLength(motDePasse) > 72){
            return res.status(400).json({message_error : "Mot de passe : minimum 8 caracteres, maximum 72 octets !"});
        }

        const installation = await Installation.findById("installation");
        const findAdmin = await Utilisateur.exists({role : "ADMIN"});
        if(installation?.installe || findAdmin){
            return res.status(409).json({message_error : "L'application est deja initialisee ou un Admin existe deja !"});
        }

        const hashedPassword = await bcrypt.hash(motDePasse, 10);
        const admin = new Utilisateur({
            nom : nom.trim(),
            prenom : prenom.trim(),
            email : email.trim().toLowerCase(),
            motDePasseHash : hashedPassword,
            role : "ADMIN"
        });
        await admin.save();
        await Installation.findOneAndUpdate(
            {_id : "installation"},
            {$set : {installe : true, installeLe : new Date()}},
            {upsert : true, runValidators : true}
        );
        return res.status(201).json({
            message_success : "Installation effectuee.",
            installe : true,
            user : admin
        });
    }catch(error){
        if(error.code === 11000){
            return res.status(409).json({message_error : "Installation deja effectuee ou email deja utilise !"});
        }
        next(error);
    }
}

module.exports = {installationStatus, install};
