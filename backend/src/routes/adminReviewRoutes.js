const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminReviewController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

router.get("/stats", auth, ctrl.getStats);
router.get("/", auth, ctrl.listReviews);
router.patch("/:id", auth, ctrl.patchReview);
router.delete("/:id", auth, ctrl.deleteReview);

module.exports = router;
