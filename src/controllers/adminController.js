import * as adminService from "../services/adminService.js";

export async function getMateriels(req, res, next){
    try{
        const materiels = await adminService.getMateriels();
        return res.status(200).json({materiels : materiels});
    }catch(error){
        next(error);
    }
}

export async function getReservations(req, res, next){
    try{
        const reservations = await adminService.getReservations();
        return res.status(200).json({reservations : reservations});
    }catch(error){
        next(error);
    }
}
