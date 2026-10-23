const {Router} = require("express");
const {installationStatus} = require("../controllers/installationController");

const router = Router();

router.get("/status", installationStatus);

module.exports = router;
