import {Router} from "express";
import {verifyToken, verifyUtilisateur} from "../middlewares/verifyToken.js";
import {getMagasinsActifs, getMaterielsMagasin} from "../controllers/catalogueController.js";

const router = Router();

router.use(verifyToken, verifyUtilisateur);
router.get("/magasins", getMagasinsActifs);
router.get("/magasins/:id/materiels", getMaterielsMagasin);

export default router;
