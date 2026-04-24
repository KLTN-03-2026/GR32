const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminCouponController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

router.get("/", auth, ctrl.listCoupons);
router.get("/:id", auth, ctrl.getCoupon);
router.post("/", auth, ctrl.createCoupon);
router.patch("/:id", auth, ctrl.updateCoupon);
router.delete("/:id", auth, ctrl.deleteCoupon);

module.exports = router;
