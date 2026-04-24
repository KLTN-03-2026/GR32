const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/brandController");

router.get("/", ctrl.listPublic);

module.exports = router;
