const mongoose = require("mongoose");

const chatbotAuditLogSchema = new mongoose.Schema(
  {
    hanh_dong: {
      type: String,
      enum: [
        "faq_tao",
        "faq_sua",
        "faq_xoa",
        "tiep_quan",
        "nhan_vien_tra_loi",
        "ket_thuc_ho_tro",
        "xoa_phien_chat",
      ],
      required: true,
    },
    nguoi_thuc_hien_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    chi_tiet: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "chatbot_audit_log" },
);

module.exports = mongoose.model("ChatbotAuditLog", chatbotAuditLogSchema);
