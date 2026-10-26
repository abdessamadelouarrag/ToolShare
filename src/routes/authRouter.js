import {Router} from "express";
import {register, login, logout} from "../controllers/authController.js";
import {verifyToken} from "../middlewares/verifyToken.js";

const router = Router();

router.post("/register", verifyToken, register);
router.post("/login", login);
router.post("/logout", verifyToken, logout);

export default router;
