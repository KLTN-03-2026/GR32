const mongoose = require("mongoose");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
require("dotenv").config();

async function resetFakeSoldCounts() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Đã kết nối database");

    // Lấy tất cả sản phẩm
    const products = await Product.find({});
    console.log(`📦 Tìm thấy ${products.length} sản phẩm`);

    let updatedCount = 0;
    let totalFakeSoldRemoved = 0;

    for (const product of products) {
      // Tính toán lại số lượng đã bán thực tế từ bảng Order
      // Chỉ tính đơn hàng đã hoàn thành hoặc đã giao hàng
      const agg = await Order.aggregate([
        {
          $match: {
            trang_thai_don: { $in: ["hoan_thanh", "da_giao_hang"] },
          },
        },
        { $unwind: "$chi_tiet" },
        {
          $match: {
            "chi_tiet.san_pham_id": product._id,
          },
        },
        {
          $group: {
            _id: null,
            totalSold: { $sum: "$chi_tiet.so_luong" },
          },
        },
      ]);

      const row = agg[0];
      const realSoldCount = row ? row.totalSold : 0;

      // Kiểm tra nếu số lượng đã bán hiện tại khác với số thực tế
      if (product.so_luong_da_ban !== realSoldCount) {
        const fakeSold = product.so_luong_da_ban - realSoldCount;
        totalFakeSoldRemoved += fakeSold > 0 ? fakeSold : 0;

        // Cập nhật lại số lượng đã bán thực tế
        await Product.findByIdAndUpdate(product._id, {
          so_luong_da_ban: realSoldCount,
        });

        console.log(`🔄 ${product.ten_san_pham}: ${product.so_luong_da_ban} → ${realSoldCount} đã bán`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Đã cập nhật ${updatedCount} sản phẩm`);
    console.log(`🗑️ Đã loại bỏ ${totalFakeSoldRemoved} lượt bán ảo`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
}

resetFakeSoldCounts();
