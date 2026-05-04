const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminReportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

router.get("/", auth, ctrl.getReports);
router.get("/export", auth, ctrl.exportReportsCsv);

module.exports = router;
