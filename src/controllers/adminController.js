import Materiel from "../models/Materiel.js";
import Reservation from "../models/Reservation.js";

export async function getMateriels(req, res, next){
    try{
        const materiels = await Materiel.find()
            .populate("magasinId", "nom site actif")
            .sort({createdAt : -1, _id : -1});
        return res.status(200).json({materiels : materiels});
    }catch(error){
        next(error);
    }
}

export async function getReservations(req, res, next){
    try{
        const reservations = await Reservation.find()
            .populate("magasinId", "nom site actif")
            .populate("materielId", "reference nom actif")
            .populate("utilisateurId", "nom prenom email")
            .sort({dateDebut : -1, _id : -1});
        return res.status(200).json({reservations : reservations});
    }catch(error){
        next(error);
    }
}
