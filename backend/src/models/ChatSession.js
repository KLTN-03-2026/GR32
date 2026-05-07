const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    session_token: { type: String, required: true, unique: true, index: true },
    nguoi_dung_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    handoff: { type: Boolean, default: false },
    handoff_at: { type: Date, default: null },
    staff_alerted: { type: Boolean, default: false },
    /** PB23: nhân viên đã tiếp quản — bot không trả lời tự động */
    staff_takeover: { type: Boolean, default: false },
    takeover_at: { type: Date, default: null },
    takeover_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    messages: {
      type: [
        {
          role: { type: String, enum: ["user", "assistant", "staff"], required: true },
          content: { type: String, required: true },
          products: { type: [mongoose.Schema.Types.Mixed], default: undefined },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, collection: "chat_session" },
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
