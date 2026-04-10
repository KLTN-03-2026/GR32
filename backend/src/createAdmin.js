const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const User = require("./models/User");

const ADMIN_DATA = {
  ho_va_ten: "Admin NO NAME",
  email: "admin@noname.vn",
  gioi_tinh: "Nam",
  so_dien_thoai: "0900000000",
  dia_chi: "Hệ thống quản trị NO NAME",
  mat_khau: "admin123",
  da_kich_hoat: true,
  vai_tro: "admin",
};

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Kết nối DB thành công!");

    const existing = await User.findOne({ email: ADMIN_DATA.email });
    if (existing) {
      console.log("⚠️  Tài khoản admin đã tồn tại:");
      console.log(`   Email: ${existing.email}`);
      console.log(`   Vai trò: ${existing.vai_tro}`);
      process.exit(0);
    }

    const admin = await User.create(ADMIN_DATA);
    console.log("\n🎉 Tạo tài khoản Admin thành công!");
    console.log("══════════════════════════════════");
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Mật khẩu: admin123`);
    console.log(`   Vai trò:  ${admin.vai_tro}`);
    console.log("══════════════════════════════════\n");
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
