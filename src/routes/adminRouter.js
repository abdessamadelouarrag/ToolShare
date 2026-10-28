import {Router} from "express";
import {verifyToken, verifyAdmin} from "../middlewares/verifyToken.js";
import {getMagasins} from "../controllers/magasinController.js";
import {getMateriels, getReservations} from "../controllers/adminController.js";

const router = Router();

router.use(verifyToken, verifyAdmin);
router.get("/magasins", getMagasins);
router.get("/materiels", getMateriels);
router.get("/reservations", getReservations);

export default router;
