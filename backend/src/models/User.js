const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    ho_va_ten: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    gioi_tinh: { type: String, required: true },
    so_dien_thoai: { type: String, required: true },
    dia_chi: { type: String, default: "" },
    mat_khau: { type: String, required: true },

    // Trạng thái tài khoản
    da_kich_hoat: { type: Boolean, default: false },
    token_kich_hoat: { type: String },

    // Phân quyền hệ thống
    vai_tro: { type: String, default: "khach_hang" }, // khach_hang, nhan_vien, admin

    /** US18: hoạt động / vô hiệu (đăng nhập bị chặn khi vo_hieu) */
    trang_thai: {
      type: String,
      enum: ["hoat_dong", "vo_hieu"],
      default: "hoat_dong",
    },

    // Cấu trúc Quên mật khẩu (US03/PB03) - ĐÃ ĐỒNG BỘ TÊN TRƯỜNG
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
    collection: "nguoi_dung", // Ép tên bảng trong database là nguoi_dung
  },
);

module.exports = mongoose.model("User", userSchema);
