const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/categoryController");

router.get("/", ctrl.listPublic);

module.exports = router;
