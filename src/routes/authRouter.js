const {Router} = require("express");
const {register, login, logout} = require("../controllers/authController");
const {verifyToken} = require("../middlewares/verifyToken");

const router = Router();

router.post("/register", verifyToken, register);
router.post("/login", login);
router.post("/logout", verifyToken, logout);

module.exports = router;
