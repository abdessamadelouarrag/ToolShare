import { Router } from "express";
import { showProfile, updateUser, updatePassword } from "../controllers/profileController.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateUserSchema, updatePasswordSchema } from "../validations/profile.validation.js";

const router = Router();

router.use(protect);

router.get("/", showProfile);
router.put("/", validate(updateUserSchema), updateUser);
router.put("/password", validate(updatePasswordSchema), updatePassword);

export default router;