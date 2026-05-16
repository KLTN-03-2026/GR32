const mongoose = require("mongoose");
const Product = require("../src/models/Product");
const Review = require("../src/models/Review");
require("dotenv").config();

async function resetFakeReviews() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Đã kết nối database");

    // Lấy tất cả sản phẩm
    const products = await Product.find({});
    console.log(`📦 Tìm thấy ${products.length} sản phẩm`);

    let updatedCount = 0;
    let totalFakeReviewsRemoved = 0;

    for (const product of products) {
      // Tính toán lại số đánh giá thực tế từ bảng Review
      const agg = await Review.aggregate([
        {
          $match: {
            san_pham_id: product._id,
            $nor: [{ trang_thai: "an" }, { trang_thai: "da_xoa" }],
          },
        },
        { $group: { _id: null, avg: { $avg: "$so_sao" }, count: { $sum: 1 } } },
      ]);

      const row = agg[0];
      const realCount = row ? row.count : 0;
      const realAvg = row ? Math.round(row.avg * 10) / 10 : 0;

      // Kiểm tra nếu số đánh giá hiện tại khác với số thực tế
      if (product.tong_danh_gia !== realCount || product.sao_danh_gia !== realAvg) {
        const fakeCount = product.tong_danh_gia - realCount;
        totalFakeReviewsRemoved += fakeCount > 0 ? fakeCount : 0;

        // Cập nhật lại số đánh giá thực tế
        await Product.findByIdAndUpdate(product._id, {
          sao_danh_gia: realAvg,
          tong_danh_gia: realCount,
        });

        console.log(`🔄 ${product.ten_san_pham}: ${product.tong_danh_gia} → ${realCount} đánh giá (sao: ${product.sao_danh_gia} → ${realAvg})`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Đã cập nhật ${updatedCount} sản phẩm`);
    console.log(`🗑️ Đã loại bỏ ${totalFakeReviewsRemoved} đánh giá ảo`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
}

resetFakeReviews();
