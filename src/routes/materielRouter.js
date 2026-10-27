import {Router} from "express";
import {verifyToken, verifyGestionnaire, verifyMagasinActif} from "../middlewares/verifyToken.js";
import {createMateriel, getMateriels, getMateriel, updateMateriel, deactivateMateriel} from "../controllers/materielController.js";

const router = Router();

router.use(verifyToken, verifyGestionnaire);
router.get("/", getMateriels);
router.get("/:id", getMateriel);
router.post("/", verifyMagasinActif, createMateriel);
router.patch("/:id", verifyMagasinActif, updateMateriel);
router.patch("/:id/desactiver", verifyMagasinActif, deactivateMateriel);
router.delete("/:id", verifyMagasinActif, deactivateMateriel);

export default router;
