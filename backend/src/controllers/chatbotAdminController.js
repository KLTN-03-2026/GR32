const ChatbotFaq = require("../models/ChatbotFaq");
const ChatbotAuditLog = require("../models/ChatbotAuditLog");
const ChatSession = require("../models/ChatSession");
const { FAQ_ENTRIES, norm } = require("../utils/chatbotFaq");

const MAX_STAFF_MSG = 500;
const ALLOWED_DM = ["doi_tra", "van_chuyen", "thanh_toan", "san_pham"];

const END_SUPPORT_MSG =
  "Nhân viên đã kết thúc phiên hỗ trợ. Bạn có thể tiếp tục hỏi trợ lý AI.";

function pickCustomerName(populatedUser) {
  if (populatedUser && typeof populatedUser === "object" && populatedUser.ho_va_ten) {
    const n = String(populatedUser.ho_va_ten).trim();
    return n || "Khách";
  }
  return "Khách";
}

function initialsFromName(name) {
  const s = String(name || "").trim();
  if (!s || s === "Khách") return "K";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function lastUserSnippet(messages) {
  if (!messages?.length) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return String(messages[i].content || "");
  }
  return String(messages[messages.length - 1]?.content || "");
}

function uiStatus(s) {
  if (s.handoff && !s.staff_takeover) {
    return { key: "need_staff", label: "Cần hỗ trợ", urgent: true };
  }
  if (s.staff_takeover) {
    return { key: "staff", label: "Nhân viên hỗ trợ", urgent: false };
  }
  return { key: "ai", label: "AI đang xử lý", urgent: false };
}

function detailHeadline(doc) {
  if (doc.staff_takeover) return "Nhân viên đang hỗ trợ";
  if (doc.handoff) return "Chờ nhân viên / cần tiếp quản";
  return "Phiên AI đang xử lý";
}

async function seedDefaultFaqsIfEmpty() {
  const n = await ChatbotFaq.countDocuments();
  if (n > 0) return;
  for (let i = 0; i < FAQ_ENTRIES.length; i++) {
    const e = FAQ_ENTRIES[i];
    await ChatbotFaq.create({
      cau_hoi_mau: e.title,
      cau_tra_loi: e.answer,
      tu_khoa: e.keys,
      danh_muc: e.danh_muc || "san_pham",
      thu_tu: i,
      hoat_dong: true,
    });
  }
}

async function logAudit(hanh_dong, nguoiId, chiTiet) {
  await ChatbotAuditLog.create({
    hanh_dong,
    nguoi_thuc_hien_id: nguoiId,
    chi_tiet: chiTiet || {},
  });
}

/** GET /api/chat/admin/faq */
exports.listFaq = async (req, res) => {
  try {
    await seedDefaultFaqsIfEmpty();
    await ChatbotFaq.updateMany(
      { $or: [{ danh_muc: { $exists: false } }, { danh_muc: null }, { danh_muc: "" }] },
      { $set: { danh_muc: "san_pham" } },
    );

    const dm = String(req.query.danh_muc || "").trim();
    const filter = {};
    if (dm && ALLOWED_DM.includes(dm)) filter.danh_muc = dm;

    let rows = await ChatbotFaq.find(filter).sort({ thu_tu: 1, createdAt: 1 }).lean();

    const qRaw = String(req.query.q || "").trim();
    if (qRaw) {
      const n = norm(qRaw);
      rows = rows.filter(
        (r) =>
          norm(r.cau_hoi_mau).includes(n) ||
          norm(r.cau_tra_loi).includes(n) ||
          (r.tu_khoa || []).some((k) => norm(k).includes(n)),
      );
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tải được FAQ." });
  }
};

/** POST /api/chat/admin/faq */
exports.createFaq = async (req, res) => {
  try {
    const cau_hoi_mau = String(req.body.cau_hoi_mau || "").trim();
    const cau_tra_loi = String(req.body.cau_tra_loi || "").trim();
    const danh_muc = String(req.body.danh_muc || "").trim();
    if (!cau_hoi_mau || !cau_tra_loi) {
      return res.status(400).json({ message: "Câu hỏi mẫu và câu trả lời không được để trống." });
    }
    if (!ALLOWED_DM.includes(danh_muc)) {
      return res.status(400).json({ message: "Danh mục không hợp lệ." });
    }
    let tu_khoa = req.body.tu_khoa;
    if (typeof tu_khoa === "string") {
      tu_khoa = tu_khoa
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (!Array.isArray(tu_khoa)) {
      tu_khoa = [];
    }
    const thu_tu = Number(req.body.thu_tu);
    const doc = await ChatbotFaq.create({
      cau_hoi_mau,
      cau_tra_loi,
      danh_muc,
      tu_khoa,
      thu_tu: Number.isFinite(thu_tu) ? thu_tu : 0,
      hoat_dong: req.body.hoat_dong !== false,
    });
    await logAudit("faq_tao", req.user._id, { faq_id: String(doc._id), cau_hoi_mau });
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tạo được FAQ." });
  }
};

/** PUT /api/chat/admin/faq/:id */
exports.updateFaq = async (req, res) => {
  try {
    const doc = await ChatbotFaq.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy FAQ." });
    const cau_hoi_mau = String(req.body.cau_hoi_mau ?? doc.cau_hoi_mau).trim();
    const cau_tra_loi = String(req.body.cau_tra_loi ?? doc.cau_tra_loi).trim();
    if (!cau_hoi_mau || !cau_tra_loi) {
      return res.status(400).json({ message: "Câu hỏi mẫu và câu trả lời không được để trống." });
    }
    const danh_muc = String(req.body.danh_muc ?? doc.danh_muc ?? "san_pham").trim();
    if (!ALLOWED_DM.includes(danh_muc)) {
      return res.status(400).json({ message: "Danh mục không hợp lệ." });
    }
    doc.cau_hoi_mau = cau_hoi_mau;
    doc.cau_tra_loi = cau_tra_loi;
    doc.danh_muc = danh_muc;
    if (typeof req.body.tu_khoa === "string") {
      doc.tu_khoa = req.body.tu_khoa
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(req.body.tu_khoa)) {
      doc.tu_khoa = req.body.tu_khoa.map(String);
    }
    if (req.body.thu_tu != null && Number.isFinite(Number(req.body.thu_tu))) {
      doc.thu_tu = Number(req.body.thu_tu);
    }
    if (typeof req.body.hoat_dong === "boolean") doc.hoat_dong = req.body.hoat_dong;
    await doc.save();
    await logAudit("faq_sua", req.user._id, { faq_id: String(doc._id), cau_hoi_mau });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không cập nhật được FAQ." });
  }
};

/** DELETE /api/chat/admin/faq/:id */
exports.deleteFaq = async (req, res) => {
  try {
    const doc = await ChatbotFaq.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy FAQ." });
    await logAudit("faq_xoa", req.user._id, {
      faq_id: String(doc._id),
      cau_hoi_mau: doc.cau_hoi_mau,
    });
    res.json({ message: "Đã xóa." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không xóa được FAQ." });
  }
};

function sessionPriority(s) {
  if (s.handoff && !s.staff_takeover) return 3;
  if (s.staff_takeover) return 2;
  return 1;
}

/** GET /api/chat/admin/sessions */
exports.listSessions = async (req, res) => {
  try {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const rows = await ChatSession.find({
      $or: [{ updatedAt: { $gte: since } }, { handoff: true }, { staff_takeover: true }],
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .select(
        "session_token handoff handoff_at staff_takeover takeover_at takeover_by nguoi_dung_id updatedAt createdAt messages",
      )
      .populate("takeover_by", "ho_va_ten email")
      .populate("nguoi_dung_id", "ho_va_ten email")
      .lean();

    const sorted = [...rows].sort((a, b) => {
      const d = sessionPriority(b) - sessionPriority(a);
      if (d !== 0) return d;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json({
      items: sorted.map((r) => {
        const khach_ten = pickCustomerName(r.nguoi_dung_id);
        const st = uiStatus(r);
        return {
          session_token: r.session_token,
          handoff: r.handoff,
          handoff_at: r.handoff_at,
          staff_takeover: r.staff_takeover,
          takeover_at: r.takeover_at,
          takeover_by: r.takeover_by,
          nguoi_dung_id: r.nguoi_dung_id,
          updatedAt: r.updatedAt,
          createdAt: r.createdAt,
          last_message: r.messages?.length ? r.messages[r.messages.length - 1] : null,
          message_count: r.messages?.length || 0,
          needs_attention: Boolean(r.handoff && !r.staff_takeover),
          khach_ten,
          khach_initials: initialsFromName(khach_ten),
          preview: lastUserSnippet(r.messages || []),
          ui_status: st,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tải được phiên chat." });
  }
};

/** GET /api/chat/admin/sessions/:token */
exports.getSessionAdmin = async (req, res) => {
  try {
    const doc = await ChatSession.findOne({ session_token: req.params.token })
      .populate("takeover_by", "ho_va_ten email")
      .populate("nguoi_dung_id", "ho_va_ten email")
      .lean();
    if (!doc) return res.status(404).json({ message: "Không tìm thấy phiên." });
    const khach_ten = pickCustomerName(doc.nguoi_dung_id);
    res.json({
      session_token: doc.session_token,
      handoff: doc.handoff,
      handoff_at: doc.handoff_at,
      staff_takeover: doc.staff_takeover,
      takeover_at: doc.takeover_at,
      takeover_by: doc.takeover_by,
      nguoi_dung_id: doc.nguoi_dung_id,
      messages: doc.messages || [],
      updatedAt: doc.updatedAt,
      khach_ten,
      khach_initials: initialsFromName(khach_ten),
      session_subtitle: detailHeadline(doc),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải chi tiết phiên." });
  }
};

/** POST /api/chat/admin/sessions/:token/takeover */
exports.takeoverSession = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ session_token: req.params.token });
    if (!session) return res.status(404).json({ message: "Không tìm thấy phiên." });
    if (session.staff_takeover) {
      return res.status(400).json({ message: "Phiên đã được tiếp quản." });
    }
    session.staff_takeover = true;
    session.takeover_at = new Date();
    session.takeover_by = req.user._id;
    await session.save();
    await logAudit("tiep_quan", req.user._id, { session_token: session.session_token });
    res.json({
      message: "Đã tiếp quản.",
      session_token: session.session_token,
      staff_takeover: session.staff_takeover,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tiếp quản được." });
  }
};

/** POST /api/chat/admin/sessions/:token/end-support */
exports.endSupport = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ session_token: req.params.token });
    if (!session) return res.status(404).json({ message: "Không tìm thấy phiên." });
    if (!session.staff_takeover) {
      return res.status(400).json({ message: "Phiên chưa ở trạng thái nhân viên hỗ trợ." });
    }
    session.staff_takeover = false;
    session.handoff = false;
    session.takeover_by = null;
    session.takeover_at = null;
    session.messages.push({
      role: "assistant",
      content: END_SUPPORT_MSG,
      at: new Date(),
    });
    while (session.messages.length > 60) session.messages.shift();
    await session.save();
    await logAudit("ket_thuc_ho_tro", req.user._id, { session_token: session.session_token });
    res.json({
      message: "Đã kết thúc hỗ trợ.",
      session_token: session.session_token,
      staff_takeover: session.staff_takeover,
      handoff: session.handoff,
      messages: session.messages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không kết thúc được phiên." });
  }
};

/** POST /api/chat/admin/sessions/:token/message */
exports.staffMessage = async (req, res) => {
  try {
    const textRaw = String(req.body.text || "").trim();
    if (!textRaw) {
      return res.status(400).json({ message: "Tin nhắn không được để trống." });
    }
    if (textRaw.length > MAX_STAFF_MSG) {
      return res.status(400).json({ message: `Tối đa ${MAX_STAFF_MSG} ký tự.` });
    }
    const session = await ChatSession.findOne({ session_token: req.params.token });
    if (!session) return res.status(404).json({ message: "Không tìm thấy phiên." });
    if (!session.staff_takeover) {
      return res.status(400).json({ message: "Vui lòng Tiếp quản trước khi gửi tin." });
    }
    session.messages.push({
      role: "staff",
      content: textRaw,
      at: new Date(),
    });
    while (session.messages.length > 60) session.messages.shift();
    await session.save();
    await logAudit("nhan_vien_tra_loi", req.user._id, {
      session_token: session.session_token,
      do_dai: textRaw.length,
    });
    res.json({
      message: "Đã gửi.",
      messages: session.messages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không gửi được tin nhắn." });
  }
};

/** DELETE /api/chat/admin/sessions/:token */
exports.deleteSession = async (req, res) => {
  try {
    const token = req.params.token;
    const doc = await ChatSession.findOneAndDelete({ session_token: token });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy phiên." });
    await logAudit("xoa_phien_chat", req.user._id, { session_token: token });
    res.json({ message: "Đã xóa phiên chat." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không xóa được phiên chat." });
  }
};
