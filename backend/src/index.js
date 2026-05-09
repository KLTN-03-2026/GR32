const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// --- 1. IMPORT CÁC ROUTES ---
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminPaymentRoutes = require("./routes/adminPaymentRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const adminReviewRoutes = require("./routes/adminReviewRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const adminCategoryRoutes = require("./routes/adminCategoryRoutes");
const brandRoutes = require("./routes/brandRoutes");
const adminBrandRoutes = require("./routes/adminBrandRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const couponRoutes = require("./routes/couponRoutes");
const adminCouponRoutes = require("./routes/adminCouponRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");

const app = express();

// --- 2. MIDDLEWARE ---
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);
app.use(express.json());

/** Docker / orchestration — không phụ thuộc DB */
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Không cần phục vụ file ảnh upload nữa vì dùng Cloudinary
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// --- 3. KẾT NỐI DATABASE ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Kết nối thành công fashion_shop_db!"))
  .catch((err) => console.log("❌ Lỗi kết nối DB:", err));

// --- 4. ĐĂNG KÝ CÁC ĐƯỜNG DẪN (API ROUTES) ---
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/brands", adminBrandRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/chat", chatbotRoutes);

/** Multer/file upload — báo JSON rõ ràng thay vì 500 chung */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({
          message:
            "Ảnh vượt quá 15MB. Vui lòng chọn file nhỏ hơn hoặc nén JPG/WEBP.",
        });
    }
    return res.status(400).json({ message: err.message || "Lỗi upload file." });
  }
  if (/Chỉ chấp nhận file ảnh/i.test(err?.message || "")) {
    return res.status(400).json({ message: err.message });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Lỗi server!" });
});

// --- 5. KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server NO NAME đang chạy tại cổng ${PORT}`),
);
