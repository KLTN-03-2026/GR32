const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const orderController = require("../controllers/orderController");

router.get("/vnpay-return", orderController.vnpayReturn);
router.post("/checkout", authMiddleware, orderController.checkout);
router.get("/mine", authMiddleware, orderController.myOrders);
router.get("/vnpay-sandbox-order/:ma_don", authMiddleware, orderController.vnpaySandboxOrderMeta);
router.post("/vnpay-sandbox-complete", authMiddleware, orderController.vnpaySandboxComplete);
router.post("/vnpay-sandbox-cancel", authMiddleware, orderController.vnpaySandboxCancel);

module.exports = router;
