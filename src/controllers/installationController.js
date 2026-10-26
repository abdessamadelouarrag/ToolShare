// src/controllers/installationController.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Utilisateur from "../models/Utilisateur.js";
import Installation from "../models/Installation.js";
import { AppError } from "../utils/AppError.js";

export async function installationStatus(req, res, next) {
    try {
        // Utilisation de findOne() car l'ID est un ObjectId
        const installation = await Installation.findOne();
        return res.status(200).json({ installe: installation?.installe ?? false });
    } catch (error) {
        next(error);
    }
}

export async function install(req, res, next) {
    try {
        // Les données sont garanties valides grâce au middleware Zod
        const { nom, prenom, email, motDePasse } = req.body;

        const hashedPassword = await bcrypt.hash(motDePasse, 10);
        
        const admin = await mongoose.connection.transaction(async (session) => {
            const installation = await Installation.findOne().session(session);
            const findAdmin = await Utilisateur.exists({ role: "ADMIN" }).session(session);
            
            if (installation?.installe || findAdmin) {
                // Déclenche l'erreur personnalisée qui annulera automatiquement la transaction
                throw new AppError("L'application est déjà initialisée ou un Admin existe déjà.", 403);
            }

            const state = installation || new Installation();
            state.installe = true;
            state.installeLe = new Date();
            await state.save({ session });

            const user = new Utilisateur({
                nom,
                prenom,
                email: email.toLowerCase(),
                motDePasseHash: hashedPassword,
                role: "ADMIN",
                actif: true
            });
            await user.save({ session });
            
            return user;
        });

        // Réponse formatée sans exposer le hash du mot de passe
        return res.status(201).json({
            status: "success",
            message: "Installation effectuée avec succès.",
            data: {
                installe: true,
                user: {
                    id: admin._id,
                    nom: admin.nom,
                    prenom: admin.prenom,
                    email: admin.email,
                    role: admin.role
                }
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return next(new AppError("Erreur : email déjà utilisé.", 409));
        }

        next(error);
    }
}