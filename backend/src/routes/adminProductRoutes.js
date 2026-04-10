const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminProductController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

const auth = [authMiddleware, roleMiddleware("admin", "nhan_vien")];

const uploadFields = upload.fields([
  { name: "hinh_anh", maxCount: 1 },
  { name: "danh_sach_anh", maxCount: 5 },
]);

router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.post("/", auth, uploadFields, ctrl.create);
router.put("/:id", auth, uploadFields, ctrl.update);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
