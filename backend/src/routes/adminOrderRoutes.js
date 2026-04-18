const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminOrderController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

router.get("/", auth, ctrl.listOrders);
router.patch("/:id/status", auth, ctrl.patchOrderStatus);

module.exports = router;
