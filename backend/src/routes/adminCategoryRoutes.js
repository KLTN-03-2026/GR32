const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminCategoryController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

router.get("/", auth, ctrl.listCategories);
router.post("/repair-tree", auth, ctrl.repairCategoryTree);
router.get("/:id", auth, ctrl.getCategory);
router.post("/", auth, ctrl.createCategory);
router.patch("/:id", auth, ctrl.updateCategory);
router.delete("/:id", auth, ctrl.deleteCategory);

module.exports = router;
