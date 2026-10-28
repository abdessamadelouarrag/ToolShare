import Utilisateur from "../models/Utilisateur.js";
import Magasin from "../models/Magasin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";

export async function register(req, res, next) {
    try {
        // Les données sont déjà formatées et validées par Zod
        const { nom, prenom, email, motDePasse, role = "UTILISATEUR", magasinId } = req.body;

        // Vérification des droits de création
        if (!["ADMIN", "GESTIONNAIRE"].includes(req.user.role)) {
            throw new AppError("Accès interdit !", 403);
        }
        
        // Un Gestionnaire ne peut créer que des Utilisateurs
        if (!["GESTIONNAIRE", "UTILISATEUR"].includes(role) || (req.user.role === "GESTIONNAIRE" && role !== "UTILISATEUR")) {
            throw new AppError("Vous ne pouvez pas attribuer ce rôle !", 403);
        }

        const emailToLower = email.toLowerCase();
        const findUser = await Utilisateur.findOne({ email: emailToLower });
        if (findUser) {
            throw new AppError("Email déjà utilisé !", 409);
        }

        // Vérification des contraintes liées au magasin
        if (role === "GESTIONNAIRE") {
            if (!magasinId) {
                throw new AppError("Un magasin valide est obligatoire pour un gestionnaire !", 400);
            }
            const magasin = await Magasin.findOne({ _id: magasinId, actif: true });
            if (!magasin) {
                throw new AppError("Magasin actif introuvable !", 404);
            }
        } else if (magasinId != null) {
            throw new AppError("Seul un gestionnaire est affecté à un magasin !", 400);
        }

        const hashedPassword = await bcrypt.hash(motDePasse, 10);
        const newUser = await Utilisateur.create({
            nom,
            prenom,
            email: emailToLower,
            motDePasseHash: hashedPassword,
            role,
            magasinId: role === "GESTIONNAIRE" ? magasinId : null,
            creePar: req.user._id
        });

        return res.status(201).json({ status: "success", message: "Compte créé.", data: { user: newUser } });
    } catch (error) {
        next(error);
    }
}

export async function login(req, res, next) {
    try {
        const { email, motDePasse } = req.body;
        const emailToLower = email.toLowerCase();
        
        const findUser = await Utilisateur.findOne({ email: emailToLower }).select("+motDePasseHash +tokenVersion");
        if (!findUser || !findUser.actif) {
            throw new AppError("Email ou mot de passe incorrect !", 401);
        }

        const validPassword = await bcrypt.compare(motDePasse, findUser.motDePasseHash);
        if (!validPassword) {
            throw new AppError("Email ou mot de passe incorrect !", 401);
        }

        const token = jwt.sign({
            sub: findUser._id.toString(),
            tokenVersion: findUser.tokenVersion ?? 0
        }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });

        return res.status(200).json({ status: "success", message: "Connexion réussie.", data: { token, user: findUser } });
    } catch (error) {
        next(error);
    }
}

export async function logout(req, res, next) {
    try {
        await Utilisateur.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
        return res.status(200).json({ status: "success", message: "Déconnexion réussie." });
    } catch (error) {
        next(error);
    }
}