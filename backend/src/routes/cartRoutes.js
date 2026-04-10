const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/add", authMiddleware, cartController.addToCart);
router.get("/", authMiddleware, cartController.getCart);
router.get("/count", authMiddleware, cartController.getCartCount);
router.put("/update", authMiddleware, cartController.updateCartItem);
router.delete("/remove/:itemId", authMiddleware, cartController.removeCartItem);

module.exports = router;
