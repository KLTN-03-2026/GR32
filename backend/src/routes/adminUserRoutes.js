const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminUserController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const adminOnly = [authMiddleware, roleMiddleware("admin")];

router.get("/", adminOnly, ctrl.listUsers);
router.post("/", adminOnly, ctrl.createUser);
router.patch("/:id", adminOnly, ctrl.updateUser);
router.delete("/:id", adminOnly, ctrl.deleteUser);

module.exports = router;
