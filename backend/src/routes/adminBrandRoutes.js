const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminBrandController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

router.get("/", auth, ctrl.listBrands);
router.get("/:id", auth, ctrl.getBrand);
router.post("/", auth, ctrl.createBrand);
router.patch("/:id", auth, ctrl.updateBrand);
router.delete("/:id", auth, ctrl.deleteBrand);

module.exports = router;
