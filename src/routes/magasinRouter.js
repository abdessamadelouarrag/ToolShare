import {Router} from "express";
import {verifyToken, verifyAdmin} from "../middlewares/verifyToken.js";
import {createMagasin, getMagasins, getMagasin, updateMagasin, deactivateMagasin} from "../controllers/magasinController.js";

const router = Router();

router.use(verifyToken, verifyAdmin);
router.post("/", createMagasin);
router.get("/", getMagasins);
router.get("/:id", getMagasin);
router.patch("/:id", updateMagasin);
router.patch("/:id/desactiver", deactivateMagasin);
router.delete("/:id", deactivateMagasin);

export default router;
