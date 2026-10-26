import {Router} from "express";
import {verifyToken} from "../middlewares/verifyToken.js";
import {showProfile, updateUser, updatePassword} from "../controllers/profileController.js";

const router = Router();

router.get("/infos", verifyToken, showProfile);
router.patch("/", verifyToken, updateUser);
router.patch("/password", verifyToken, updatePassword);

export default router;
