const express = require("express");
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

const app = express();

// --- 2. MIDDLEWARE ---
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Phục vụ file ảnh upload
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// --- 3. KẾT NỐI DATABASE ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Kết nối thành công fashion_shop_db!"))
  .catch((err) => console.log("❌ Lỗi kết nối DB:", err));

// --- 4. ĐĂNG KÝ CÁC ĐƯỜNG DẪN (API ROUTES) ---
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);
app.use("/api/admin/orders", adminOrderRoutes);

// --- 5. KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server NO NAME đang chạy tại cổng ${PORT}`),
);
