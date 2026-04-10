const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const Product = require("./models/Product");

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeVariants(colors, sizes) {
  const arr = [];
  for (const c of colors) {
    for (const s of sizes) {
      arr.push({ mau_sac: c, kich_co: s, so_luong: rnd(2, 30) });
    }
  }
  return arr;
}

const SIZES = ["S", "M", "L", "XL"];
const SIZES_FULL = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["38", "39", "40", "41", "42", "43"];
const IMG = (seed) => `https://picsum.photos/seed/${seed}/500/650`;
const IMG_LIST = (seed, n = 5) => Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/${seed}_${i}/500/650`);
const BRANDS = ["NO NAME", "NO NAME Premium", "NO NAME Basic", "NO NAME Sport"];

const PRODUCTS = [
  { ten: "Áo Thun Nam Basic Cotton", dm: "Áo thun nam", gia: 299000, giam: 20, cl: "Cotton 100%, mềm mại, thấm hút mồ hôi tốt", kd: "Form regular fit, thoải mái", bq: "Giặt máy ở 30°C, không dùng chất tẩy mạnh", colors: ["Trắng", "Đen", "Xám", "Navy"] },
  { ten: "Áo Thun Nam Oversize Street", dm: "Áo thun nam", gia: 350000, giam: 15, cl: "Cotton French Terry 350GSM, dày dặn", kd: "Form oversize, dáng rộng thoải mái", bq: "Giặt tay hoặc máy nhẹ, phơi trong bóng râm", colors: ["Đen", "Trắng", "Kem", "Xanh rêu"] },
  { ten: "Áo Thun Nam In Hình Nghệ Thuật", dm: "Áo thun nam", gia: 280000, giam: 10, cl: "Cotton pha Polyester, bền màu in", kd: "Form slim fit, ôm vừa người", bq: "Lộn trái khi giặt, không giặt bằng nước nóng", colors: ["Đen", "Trắng", "Xám đậm"] },
  { ten: "Áo Thun Nam Cổ Tròn Premium", dm: "Áo thun nam", gia: 399000, giam: 25, cl: "Cotton Compact cao cấp, mịn màng", kd: "Form regular fit, vai xuôi tự nhiên", bq: "Giặt ở 30°C, ủi ở nhiệt độ trung bình", colors: ["Trắng", "Đen", "Navy", "Xanh mint", "Hồng nhạt"] },
  { ten: "Áo Thun Nam Thể Thao Dri-Fit", dm: "Áo thun nam", gia: 320000, giam: 0, cl: "Polyester Dri-Fit, thoáng khí tốt", kd: "Form slim fit, co giãn 4 chiều", bq: "Giặt máy bình thường, không dùng chất tẩy", colors: ["Đen", "Xám", "Xanh dương"] },
  { ten: "Áo Polo Nam Classic Pique", dm: "Áo polo nam", gia: 450000, giam: 20, cl: "Vải Pique Cotton 100%, dệt tổ ong thoáng mát", kd: "Form regular fit, cổ bẻ lịch sự", bq: "Giặt máy 30°C, ủi mặt trái, không vắt mạnh", colors: ["Trắng", "Đen", "Navy", "Đỏ đô"] },
  { ten: "Áo Polo Nam Phối Sọc", dm: "Áo polo nam", gia: 480000, giam: 15, cl: "Cotton pha Spandex, co giãn nhẹ", kd: "Form slim fit, phối viền cổ và tay", bq: "Giặt ở nhiệt độ thường, phơi nơi thoáng mát", colors: ["Trắng sọc navy", "Navy sọc trắng", "Xám sọc đen"] },
  { ten: "Áo Polo Nam Thêu Logo", dm: "Áo polo nam", gia: 520000, giam: 30, cl: "Lacoste Cotton cao cấp, mềm mịn", kd: "Form regular fit, thêu logo ngực trái", bq: "Giặt tay hoặc máy nhẹ, ủi ở nhiệt độ thấp", colors: ["Đen", "Trắng", "Xanh lá", "Cam"] },
  { ten: "Quần Jean Nam Slim Fit Wash", dm: "Quần jean nam", gia: 650000, giam: 20, cl: "Denim Cotton 98% + Spandex 2%, co giãn", kd: "Form slim fit, ống đứng, wash nhẹ", bq: "Giặt lộn trái, nước lạnh, phơi trong bóng râm", colors: ["Xanh đậm", "Xanh nhạt", "Đen"], sizes: SIZES_FULL },
  { ten: "Quần Jean Nam Straight Classic", dm: "Quần jean nam", gia: 590000, giam: 10, cl: "Denim Cotton cao cấp, dày dặn", kd: "Form straight, ống suông cổ điển", bq: "Giặt ở 30°C, không dùng máy sấy", colors: ["Xanh đậm", "Xanh medium"], sizes: SIZES_FULL },
  { ten: "Quần Jean Nam Rách Gối Streetwear", dm: "Quần jean nam", gia: 720000, giam: 25, cl: "Denim Cotton pha Elastane, co giãn tốt", kd: "Form slim taper, rách gối nghệ thuật", bq: "Giặt tay nhẹ nhàng, tránh vắt mạnh vùng rách", colors: ["Xanh nhạt", "Xanh medium", "Đen rách"], sizes: SIZES_FULL },
  { ten: "Quần Short Nam Kaki Basic", dm: "Quần short nam", gia: 350000, giam: 15, cl: "Kaki Cotton 97% + Spandex 3%", kd: "Form regular, dài đến gối", bq: "Giặt máy bình thường, ủi ở nhiệt độ trung bình", colors: ["Be", "Đen", "Navy", "Xám"], sizes: SIZES_FULL },
  { ten: "Quần Short Nam Thể Thao", dm: "Quần short nam", gia: 280000, giam: 0, cl: "Polyester thoáng khí, nhanh khô", kd: "Form rộng thoải mái, lưng thun co giãn", bq: "Giặt máy, không dùng chất tẩy mạnh", colors: ["Đen", "Xám", "Navy"] },
  { ten: "Áo Thun Nữ Crop Top Basic", dm: "Áo thun nữ", gia: 250000, giam: 20, cl: "Cotton pha Spandex, co giãn, mềm mại", kd: "Form crop, ôm nhẹ eo", bq: "Giặt tay hoặc túi giặt, phơi phẳng", colors: ["Trắng", "Đen", "Hồng", "Tím lavender", "Xanh mint"] },
  { ten: "Áo Thun Nữ Oversized Vintage", dm: "Áo thun nữ", gia: 320000, giam: 10, cl: "Cotton 100%, wash vintage mềm mại", kd: "Form oversize, tay rộng, dáng dài", bq: "Giặt máy nhẹ, phơi trong bóng râm", colors: ["Kem", "Xám", "Xanh bạc hà", "Hồng pastel"] },
  { ten: "Áo Thun Nữ Cổ Tim Thanh Lịch", dm: "Áo thun nữ", gia: 290000, giam: 15, cl: "Viscose pha Cotton, rũ mềm mại", kd: "Form slim, cổ tim thanh lịch", bq: "Giặt tay ở 30°C, ủi ở nhiệt độ thấp", colors: ["Trắng", "Đen", "Đỏ đô", "Navy"] },
  { ten: "Đầm Liền Nữ Hoa Nhí Vintage", dm: "Đầm / Váy", gia: 550000, giam: 20, cl: "Voan chiffon nhẹ, lót Cotton", kd: "Form xòe, thắt eo, dài qua gối", bq: "Giặt tay nhẹ, phơi trong bóng râm, ủi nhiệt thấp", colors: ["Trắng hoa đỏ", "Xanh hoa vàng", "Hồng hoa trắng"] },
  { ten: "Váy Midi Nữ Xếp Ly Thanh Lịch", dm: "Đầm / Váy", gia: 480000, giam: 15, cl: "Vải chéo Polyester cao cấp, giữ ly tốt", kd: "Form A-line, lưng thun co giãn", bq: "Giặt tay, treo phơi, ủi theo nếp ly", colors: ["Đen", "Be", "Navy", "Xám nhạt"] },
  { ten: "Đầm Sơ Mi Nữ Công Sở", dm: "Đầm / Váy", gia: 620000, giam: 25, cl: "Lụa Satin pha, mềm rũ sang trọng", kd: "Form suông, cổ sơ mi, thắt đai eo", bq: "Giặt tay, ủi mặt trái ở nhiệt độ thấp", colors: ["Trắng", "Be", "Xanh pastel"] },
  { ten: "Quần Âu Nữ Ống Đứng Công Sở", dm: "Quần nữ", gia: 450000, giam: 10, cl: "Kaki pha Spandex, co giãn thoải mái", kd: "Form slim straight, cạp cao tôn dáng", bq: "Giặt máy nhẹ, ủi ở nhiệt độ trung bình", colors: ["Đen", "Be", "Xám", "Navy"] },
  { ten: "Quần Jeans Nữ Skinny High-Rise", dm: "Quần nữ", gia: 520000, giam: 20, cl: "Denim Cotton pha Elastane, co giãn 4 chiều", kd: "Form skinny, cạp cao, ôm đùi và bắp chân", bq: "Giặt lộn trái, nước lạnh, tránh máy sấy", colors: ["Xanh đậm", "Xanh nhạt", "Đen"], sizes: SIZES_FULL },
  { ten: "Quần Culottes Nữ Ống Rộng", dm: "Quần nữ", gia: 380000, giam: 0, cl: "Vải linen pha, thoáng mát mùa hè", kd: "Form ống rộng, cạp thun co giãn", bq: "Giặt tay nhẹ, phơi phẳng", colors: ["Trắng", "Đen", "Be", "Xanh lá nhạt"] },
  { ten: "Áo Khoác Blazer Nữ Oversized", dm: "Áo khoác nữ", gia: 750000, giam: 20, cl: "Vải tweed pha Cotton, dày dặn sang trọng", kd: "Form oversized, vai rộng, 2 túi nắp", bq: "Giặt khô hoặc giặt tay nhẹ, treo phơi", colors: ["Đen", "Be", "Xám nhạt"] },
  { ten: "Áo Khoác Cardigan Nữ Len Mỏng", dm: "Áo khoác nữ", gia: 420000, giam: 15, cl: "Len Acrylic mềm, nhẹ, không xù lông", kd: "Form regular, cài nút, dài quá hông", bq: "Giặt tay ở 30°C, phơi phẳng, không treo", colors: ["Kem", "Hồng pastel", "Xám", "Đen"] },
  { ten: "Áo Khoác Denim Nữ Classic", dm: "Áo khoác nữ", gia: 580000, giam: 10, cl: "Denim Cotton cao cấp, wash vintage", kd: "Form regular, cổ bẻ, túi ngực", bq: "Giặt lộn trái, phơi trong bóng râm", colors: ["Xanh nhạt", "Xanh đậm", "Đen"] },
  { ten: "Mũ Lưỡi Trai Unisex Logo Thêu", dm: "Mũ / Nón", gia: 180000, giam: 10, cl: "Cotton twill, khóa điều chỉnh phía sau", kd: "Form cứng cáp, logo thêu nổi phía trước", bq: "Giặt tay nhẹ, phơi khô tự nhiên", colors: ["Đen", "Trắng", "Navy", "Be"], sizes: ["Free Size"] },
  { ten: "Túi Tote Vải Canvas Unisex", dm: "Túi xách", gia: 250000, giam: 0, cl: "Canvas Cotton dày 16oz, quai chắc chắn", kd: "Dáng tote rộng rãi, in họa tiết thời trang", bq: "Giặt tay, phơi khô tự nhiên", colors: ["Trắng", "Đen", "Kem"], sizes: ["Free Size"] },
  { ten: "Thắt Lưng Da Nam Khóa Kim Loại", dm: "Thắt lưng", gia: 350000, giam: 20, cl: "Da bò thật, khóa hợp kim kẽm cao cấp", kd: "Rộng 3.5cm, mặt khóa kim loại sáng bóng", bq: "Tránh nước, lau bằng khăn mềm, bảo quản nơi khô ráo", colors: ["Đen", "Nâu", "Nâu đậm"], sizes: ["Free Size"] },
  { ten: "Giày Sneaker Unisex Trắng Classic", dm: "Giày dép", gia: 890000, giam: 25, cl: "Da tổng hợp cao cấp, đế cao su chống trượt", kd: "Dáng classic low-top, đế bằng thoải mái", bq: "Lau bằng khăn ẩm, tránh ngâm nước, phơi nơi thoáng", colors: ["Trắng", "Trắng đen", "Đen"], sizes: SHOE_SIZES },
  { ten: "Dép Quai Ngang Thời Trang", dm: "Giày dép", gia: 220000, giam: 0, cl: "EVA cao cấp, nhẹ và êm chân", kd: "Quai ngang rộng, đế chống trượt", bq: "Rửa nước sạch, phơi khô tự nhiên", colors: ["Đen", "Trắng", "Be"], sizes: ["38", "39", "40", "41", "42"] },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    const existing = await Product.countDocuments();
    console.log(`📦 Hiện có ${existing} sản phẩm trong DB`);

    const docs = PRODUCTS.map((p, idx) => ({
      ten_san_pham: p.ten,
      hinh_anh: IMG(`product_${idx}`),
      danh_sach_anh: IMG_LIST(`product_${idx}`),
      gia_goc: p.gia,
      phan_tram_giam_gia: p.giam,
      gia_hien_tai: Math.round(p.gia * (1 - p.giam / 100)),
      danh_muc: p.dm,
      thuong_hieu: pick(BRANDS),
      mo_ta: `${p.ten} - Thiết kế hiện đại, chất liệu cao cấp, phù hợp cho mọi dịp.`,
      chat_lieu: p.cl,
      kieu_dang: p.kd,
      huong_dan_bao_quan: p.bq,
      bien_the: makeVariants(p.colors, p.sizes || SIZES),
      so_luong_ton: rnd(30, 200),
      so_luong_da_ban: rnd(50, 3000),
      sao_danh_gia: +(Math.random() * 1.5 + 3.5).toFixed(1),
      tong_danh_gia: rnd(20, 2000),
      ngay_tao: new Date(2026, rnd(0, 3), rnd(1, 28)),
      trang_thai: "Đang kinh doanh",
    }));

    const result = await Product.insertMany(docs);
    console.log(`🎉 Đã thêm ${result.length} sản phẩm mới!`);

    // Cập nhật sản phẩm cũ thiếu biến thể
    const oldProducts = await Product.find({
      $or: [{ bien_the: { $exists: false } }, { bien_the: { $size: 0 } }],
    });

    if (oldProducts.length > 0) {
      for (const op of oldProducts) {
        const colors = ["Trắng", "Đen", "Xám"].slice(0, rnd(2, 3));
        await Product.updateOne({ _id: op._id }, {
          $set: {
            bien_the: makeVariants(colors, SIZES),
            thuong_hieu: op.thuong_hieu || "NO NAME",
            chat_lieu: op.chat_lieu || "Cotton cao cấp, mềm mại",
            kieu_dang: op.kieu_dang || "Form regular fit, thoải mái",
            huong_dan_bao_quan: op.huong_dan_bao_quan || "Giặt máy ở 30°C, phơi trong bóng râm",
            mo_ta: op.mo_ta || `${op.ten_san_pham} - Chất lượng cao, thiết kế hiện đại.`,
          },
        });
      }
      console.log(`🔄 Đã cập nhật ${oldProducts.length} sản phẩm cũ`);
    }

    const total = await Product.countDocuments();
    console.log(`\n✅ Tổng cộng: ${total} sản phẩm trong database!`);
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Đã ngắt kết nối MongoDB");
  }
}

seed();
