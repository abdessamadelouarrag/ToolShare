import {Router} from "express";
import {installationStatus, install} from "../controllers/installationController.js";

const router = Router();

router.get("/status", installationStatus);
router.post("/", install);

export default router;
