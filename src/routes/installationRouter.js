const {Router} = require("express");
const {installationStatus, install} = require("../controllers/installationController");

const router = Router();

router.get("/status", installationStatus);
router.post("/", install);

module.exports = router;
