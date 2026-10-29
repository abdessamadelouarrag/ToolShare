import {Router} from "express";
import {installationStatus, install} from "../controllers/installationController.js";
import {validate} from "../middlewares/validate.middleware.js";
import {installationSchema} from "../validations/auth.validation.js";

const router = Router();

router.get("/status", installationStatus);
router.post("/", validate(installationSchema), install);

export default router;
