import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Utilisateur from "../models/Utilisateur.js";
import Installation from "../models/Installation.js";
import {AppError} from "../utils/AppError.js";

export async function installationStatus(){
    const installation = await Installation.findOne();
    return {installe : installation?.installe ?? false};
}

export async function install(data){
    const {nom, prenom, email, motDePasse} = data;
    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    try{
        return await mongoose.connection.transaction(async (session) => {
            const installation = await Installation.findOne().session(session);
            const findAdmin = await Utilisateur.exists({role : "ADMIN"}).session(session);
            if(installation?.installe || findAdmin){
                throw new AppError("L'application est déjà initialisée ou un Admin existe déjà.", 403);
            }
            const state = installation || new Installation();
            state.installe = true;
            state.installeLe = new Date();
            await state.save({session});
            const admin = new Utilisateur({
                nom, prenom, email : email.toLowerCase(), motDePasseHash : hashedPassword,
                role : "ADMIN", actif : true
            });
            await admin.save({session});
            return admin;
        });
    }catch(error){
        if(error.code === 11000){
            throw new AppError("Erreur : email déjà utilisé.", 409);
        }
        throw error;
    }
}
