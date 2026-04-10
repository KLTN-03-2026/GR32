const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// Route lấy tất cả sản phẩm (PB05)
router.get("/", productController.getAllProducts);

// Route tìm kiếm sản phẩm (PB04)
router.get("/search", productController.searchProducts);

// Route chi tiết sản phẩm (PB07)
router.get("/:id", productController.getProductById);

// Route gửi đánh giá (PB07)
router.post("/review", productController.addReview);

module.exports = router;
