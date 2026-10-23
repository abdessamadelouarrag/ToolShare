const {Router} = require("express");
const {verifyToken} = require("../middlewares/verifyToken");
const {showProfile, updateUser, updatePassword} = require("../controllers/profileController");

const router = Router();

router.get("/infos", verifyToken, showProfile);
router.patch("/", verifyToken, updateUser);
router.patch("/password", verifyToken, updatePassword);

module.exports = router;
