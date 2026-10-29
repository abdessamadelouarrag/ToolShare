import Materiel from "../models/Materiel.js";
import Reservation from "../models/Reservation.js";

export async function getMateriels(){
    return Materiel.find()
        .populate("magasinId", "nom site actif")
        .sort({createdAt : -1, _id : -1});
}

export async function getReservations(){
    return Reservation.find()
        .populate("magasinId", "nom site actif")
        .populate("materielId", "reference nom actif")
        .populate("utilisateurId", "nom prenom email")
        .sort({dateDebut : -1, _id : -1});
}
