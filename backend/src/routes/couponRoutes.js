const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const ctrl = require("../controllers/couponPreviewController");

router.post("/preview", authMiddleware, ctrl.preview);

module.exports = router;
