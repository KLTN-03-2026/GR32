const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminPaymentController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

router.get("/", auth, ctrl.listPayments);
router.get("/:id", auth, ctrl.getPaymentDetail);
router.post("/:id/confirm-offline", auth, ctrl.confirmOfflinePayment);
router.post("/:id/refund", auth, ctrl.markRefunded);

module.exports = router;
