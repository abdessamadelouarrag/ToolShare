import {Router} from "express";
import {verifyToken, verifyGestionnaire} from "../middlewares/verifyToken.js";

const router = Router();

router.use(verifyToken, verifyGestionnaire);
router.get("/magasin", (req, res) => {
    return res.status(200).json({magasin : req.magasin});
});

export default router;
