const mongoose = require("mongoose");

const FAQ_DM = ["doi_tra", "van_chuyen", "thanh_toan", "san_pham"];

const chatbotFaqSchema = new mongoose.Schema(
  {
    cau_hoi_mau: { type: String, required: true, trim: true },
    cau_tra_loi: { type: String, required: true, trim: true },
    danh_muc: {
      type: String,
      enum: FAQ_DM,
      default: "san_pham",
    },
    /** Từ khóa bổ sung để khớp tin nhắn khách (không dấu/thường so khớp ở tầng util) */
    tu_khoa: { type: [String], default: [] },
    thu_tu: { type: Number, default: 0 },
    hoat_dong: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "chatbot_faq" },
);

module.exports = mongoose.model("ChatbotFaq", chatbotFaqSchema);
