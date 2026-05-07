const { randomUUID } = require("crypto");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ChatSession = require("../models/ChatSession");
const Product = require("../models/Product");
const { matchFaqAsync, norm } = require("../utils/chatbotFaq");

const MAX_MESSAGE_LEN = 500;
const MAX_STORED_MESSAGES = 60;

const WELCOME =
  "Xin chào! Tôi là trợ lý AI NO NAME. Bạn có thể hỏi giá, tồn kho theo màu/size, hoặc chính sách đổi trả — vận chuyển. Nếu cần nhân viên, gõ «gặp nhân viên».";

const HANDOFF_REPLY =
  "Hệ thống đang kết nối bạn với nhân viên tư vấn, vui lòng đợi trong giây lát.";

const HANDOFF_REGEX =
  /gặp\s*nhân\s*viên|tu\s*van\s*viên|tư\s*vấn\s*viên|nói\s*chuyện\s*với\s*nhân\s*viên|chuyển\s*sang\s*nhân\s*viên|hotline\s*người\s*thật/i;

/** Tin nhắn có vẻ hỏi hàng / giá / size — không handoff chỉ vì Gemini “không rõ” */
const PRODUCT_QUESTION_HINT =
  /áo|quần|polo|jean|kaki|cardigan|hoodie|sơ\s*mi|sommi|giày|dép|túi|balo|váy|đầm|khoác|blazer|quần\s*đùi|đồ\s*bộ|thời\s*trang|mũ|nón|snapback|bucket|tất|vớ|khăn|kính|phụ\s*kiện|size|màu|giá|tồn|còn\s*hàng|hết\s*hàng|có\s*bán|bán\s*không|cửa\s*hàng|shop|ở\s*đây\s*có|chỗ\s*này\s*có|bên\s*bạn\s*có|bên\s*này\s*có|\bcó\s+gì\s+bán\b|\bcó\s+bán\s+gì\b/i;

/** Ưu tiên chính sách nếu rõ ràng — tránh nhầm với san_pham */
const POLICY_STRONG_HINT =
  /đổi\s*trả|hoàn\s*tiền|phí\s*ship|vận\s*chuyển|giao\s*hàng|thanh\s*toán|vnpay|\bcod\b|khiếu\s*nại|bảo\s*hành/i;

function looksLikeProductQuestion(text) {
  const s = String(text || "");
  if (POLICY_STRONG_HINT.test(s)) return false;
  return PRODUCT_QUESTION_HINT.test(s);
}

const SEARCH_STOPWORDS = new Set([
  "co",
  "ban",
  "shop",
  "cua",
  "hang",
  "ben",
  "cho",
  "khong",
  "gi",
  "vay",
  "nao",
  "minh",
  "toi",
  "em",
  "anh",
  "chi",
  "va",
  "the",
  "la",
  "mot",
  "nay",
  "duoc",
  "cac",
  "bay",
]);

function escapeRx(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function searchProducts(keyword) {
  const q = String(keyword || "").trim();
  if (!q) return [];
  const rx = new RegExp(escapeRx(q), "i");
  let list = await Product.find({
    trang_thai: { $ne: "ngung_ban" },
    $or: [{ ten_san_pham: rx }, { mo_ta: rx }, { thuong_hieu: rx }, { danh_muc: rx }],
  })
    .limit(14)
    .lean();
  if (list.length) return list;
  const nq = norm(q);
  const all = await Product.find({ trang_thai: { $ne: "ngung_ban" } })
    .limit(100)
    .select(
      "ten_san_pham hinh_anh gia_hien_tai gia_goc chat_lieu bien_the so_luong_ton mo_ta trang_thai thuong_hieu danh_muc",
    )
    .lean();
  const byPhrase = all.filter(
    (p) =>
      norm(p.ten_san_pham).includes(nq) ||
      norm(p.mo_ta || "").includes(nq) ||
      norm(p.thuong_hieu || "").includes(nq),
  );
  if (byPhrase.length) return byPhrase.slice(0, 10);

  const words = nq
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !SEARCH_STOPWORDS.has(w));
  if (!words.length) return [];

  const scored = [];
  for (const p of all) {
    const hay = `${norm(p.ten_san_pham)} ${norm(p.mo_ta || "")} ${norm(p.thuong_hieu || "")} ${norm(p.danh_muc || "")}`;
    let score = 0;
    for (const w of words) {
      if (hay.includes(w)) score += 1;
    }
    if (score > 0) scored.push({ p, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map((x) => x.p);
}

function pickVariantStock(product, mauRaw, sizeRaw) {
  const variants = product.bien_the || [];
  const mau = norm(mauRaw);
  const size = norm(sizeRaw);
  const score = (v) => {
    let s = 0;
    const vm = norm(v.mau_sac);
    const vk = norm(v.kich_co);
    if (mau && vm && (vm.includes(mau) || mau.includes(vm))) s += 2;
    if (size && vk && (vk.includes(size) || size.includes(vk))) s += 2;
    return s;
  };
  let best = null;
  let bestScore = -1;
  for (const v of variants) {
    const sc = score(v);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  if (bestScore > 0 && best) {
    return { variant: best, stock: Number(best.so_luong) || 0 };
  }
  if (variants.length === 1) {
    const v = variants[0];
    return { variant: v, stock: Number(v.so_luong) || 0 };
  }
  return { variant: null, stock: Number(product.so_luong_ton) || 0 };
}

function buildProductCards(products, mau, size) {
  return products.slice(0, 5).map((p) => {
    const { variant, stock } = pickVariantStock(p, mau, size);
    const price = p.gia_hien_tai ?? p.gia_goc ?? 0;
    return {
      _id: String(p._id),
      ten_san_pham: p.ten_san_pham,
      hinh_anh: p.hinh_anh || "",
      gia_hien_tai: price,
      chat_lieu: p.chat_lieu || "",
      ton_kho: stock,
      mau_variant: variant?.mau_sac || null,
      size_variant: variant?.kich_co || null,
      detailPath: `/product/${p._id}`,
    };
  });
}

function formatMoney(n) {
  const v = Number(n) || 0;
  return `${v.toLocaleString("vi-VN")}đ`;
}

function buildProductReplyText(cards, mau, size) {
  if (!cards.length) return null;
  const lines = cards.map((c, i) => {
    const variantHint =
      c.mau_variant || c.size_variant
        ? ` (${[c.mau_variant, c.size_variant].filter(Boolean).join(" · ")})`
        : "";
    const ton = c.ton_kho > 0 ? `Còn ${c.ton_kho} sản phẩm` : "Đang hết hàng tại biến thể khớp — xem các lựa chọn khác trên trang chi tiết.";
    const cl = c.chat_lieu ? `Chất liệu: ${c.chat_lieu}. ` : "";
    return `${i + 1}. ${c.ten_san_pham}${variantHint} — Giá: ${formatMoney(c.gia_hien_tai)}. ${cl}${ton}`;
  });
  let head = "";
  if (mau || size) {
    head = `Thông tin theo yêu cầu (màu/size): ${[mau, size].filter(Boolean).join(", ") || "chưa rõ"}.\n`;
  }
  return `${head}${lines.join("\n")}\n\nBạn có thể mở thẻ sản phẩm bên dưới để xem chi tiết và đặt hàng.`;
}

async function geminiAnalyzeIntent(userText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      intent: "khong_ro",
      confidence: 0,
      ten_san_pham: "",
      mau_sac: "",
      kich_co: "",
      chinh_sach_gap: "",
    };
  }
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.12,
    },
  });
  const prompt = `Bạn là bộ phân loại ý định khách hàng cửa hàng quần áo NO NAME (Việt Nam).
Đọc tin nhắn và trả về DUY NHẤT một JSON hợp lệ (không markdown), các khóa:
{
  "intent": "san_pham" | "chinh_sach" | "chuyen_nhan_vien" | "khong_ro",
  "confidence": số từ 0 đến 1,
  "ten_san_pham": chuỗi tên sản phẩm gợi ý hoặc "",
  "mau_sac": chuỗi màu hoặc "",
  "kich_co": chuỗi size (S,M,L,XL,...) hoặc "",
  "chinh_sach_gap": từ khóa chủ đề chính sách hoặc ""
}
Quy tắc:
- san_pham: hỏi giá, còn hàng, size, màu, mua; **mọi câu có/không có loại đồ** (áo polo, quần jean, mũ/nón, phụ kiện…), ví dụ «shop có áo polo nam không», «ở đây có mũ không», «bên bạn bán khoác không» → luôn san_pham, confidence >= 0.75, điền ten_san_pham là cụm tìm kiếm ngắn (vd: «áo polo nam», «mũ»).
- chinh_sach: đổi trả, hoàn tiền, vận chuyển, thanh toán, bảo hành.
- chuyen_nhan_vien: muốn người thật, khiếu nại phức tạp.
- khong_ro: chỉ khi thực sự không liên quan shop/quần áo/chính sách.

Tin nhắn khách (văn bản thuần, có thể có xuống dòng): ${JSON.stringify(userText)}`;

  const result = await model.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(raw);
    return {
      intent: parsed.intent || "khong_ro",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      ten_san_pham: String(parsed.ten_san_pham || "").trim(),
      mau_sac: String(parsed.mau_sac || "").trim(),
      kich_co: String(parsed.kich_co || "").trim(),
      chinh_sach_gap: String(parsed.chinh_sach_gap || "").trim(),
    };
  } catch {
    return { intent: "khong_ro", confidence: 0.25, ten_san_pham: "", mau_sac: "", kich_co: "", chinh_sach_gap: "" };
  }
}

async function applyHandoff(session, reason) {
  session.handoff = true;
  session.handoff_at = new Date();
  session.staff_alerted = true;
  session.messages.push({
    role: "assistant",
    content: HANDOFF_REPLY,
    at: new Date(),
  });
  await session.save();
  return HANDOFF_REPLY;
}

exports.createSession = async (req, res) => {
  try {
    const token = randomUUID();
    const doc = await ChatSession.create({
      session_token: token,
      nguoi_dung_id: req.user?._id || null,
      messages: [{ role: "assistant", content: WELCOME, at: new Date() }],
    });
    res.status(201).json({
      sessionId: doc.session_token,
      messages: doc.messages,
      handoff: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tạo được phiên chat." });
  }
};

exports.getSession = async (req, res) => {
  try {
    const doc = await ChatSession.findOne({ session_token: req.params.token }).lean();
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy phiên chat." });
    }
    if (doc.nguoi_dung_id && req.user && String(doc.nguoi_dung_id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền xem phiên chat này." });
    }
    res.json({
      sessionId: doc.session_token,
      messages: doc.messages || [],
      handoff: doc.handoff,
      staff_takeover: Boolean(doc.staff_takeover),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi tải phiên chat." });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const sessionId = String(req.body.sessionId || "").trim();
    const textRaw = String(req.body.text || "").trim();
    if (!sessionId) {
      return res.status(400).json({ message: "Thiếu phiên chat." });
    }
    if (!textRaw) {
      return res.status(400).json({ message: "Tin nhắn không được để trống." });
    }
    if (textRaw.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({ message: `Tin nhắn tối đa ${MAX_MESSAGE_LEN} ký tự.` });
    }

    const session = await ChatSession.findOne({ session_token: sessionId });
    if (!session) {
      return res.status(404).json({ message: "Phiên chat không tồn tại." });
    }

    if (session.nguoi_dung_id && req.user && String(session.nguoi_dung_id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Không có quyền gửi trong phiên này." });
    }

    if (!session.nguoi_dung_id && req.user) {
      session.nguoi_dung_id = req.user._id;
    }

    /** PB23: đã chuyển nhân viên hoặc nhân viên đã tiếp quản — bot không trả lời */
    if (session.handoff || session.staff_takeover) {
      session.messages.push({ role: "user", content: textRaw, at: new Date() });
      while (session.messages.length > MAX_STORED_MESSAGES) session.messages.shift();
      await session.save();
      return res.json({
        reply: "",
        silent: true,
        products: [],
        handoff: Boolean(session.handoff),
        staff_takeover: Boolean(session.staff_takeover),
        sessionId: session.session_token,
      });
    }

    session.messages.push({ role: "user", content: textRaw, at: new Date() });

    if (HANDOFF_REGEX.test(textRaw)) {
      await applyHandoff(session, "keyword");
      while (session.messages.length > MAX_STORED_MESSAGES) session.messages.shift();
      await session.save();
      return res.json({
        reply: HANDOFF_REPLY,
        products: [],
        handoff: true,
        staff_takeover: Boolean(session.staff_takeover),
        sessionId: session.session_token,
      });
    }

    let reply = "";
    let products = [];

    const apiConfigured = Boolean(process.env.GEMINI_API_KEY);
    if (!apiConfigured) {
      reply =
        "Chatbot AI chưa được cấu hình khóa Gemini (GEMINI_API_KEY). Vui lòng liên hệ quản trị hoặc nhân viên.";
      session.messages.push({ role: "assistant", content: reply, at: new Date() });
      while (session.messages.length > MAX_STORED_MESSAGES) session.messages.shift();
      await session.save();
      return res.json({
        reply,
        products: [],
        handoff: false,
        staff_takeover: Boolean(session.staff_takeover),
        sessionId: session.session_token,
      });
    }

    let analysis = {
      intent: "khong_ro",
      confidence: 0.5,
      ten_san_pham: "",
      mau_sac: "",
      kich_co: "",
      chinh_sach_gap: "",
    };
    try {
      analysis = await geminiAnalyzeIntent(textRaw);
    } catch (e) {
      console.error("Gemini error:", e.message);
      analysis = { intent: "khong_ro", confidence: 0.2, ten_san_pham: "", mau_sac: "", kich_co: "", chinh_sach_gap: "" };
    }

    if (analysis.intent === "chuyen_nhan_vien") {
      await applyHandoff(session, "intent");
      while (session.messages.length > MAX_STORED_MESSAGES) session.messages.shift();
      await session.save();
      return res.json({
        reply: HANDOFF_REPLY,
        products: [],
        handoff: true,
        staff_takeover: Boolean(session.staff_takeover),
        sessionId: session.session_token,
      });
    }

    if (analysis.intent === "khong_ro" && analysis.confidence < 0.36) {
      if (looksLikeProductQuestion(textRaw)) {
        analysis.intent = "san_pham";
        analysis.confidence = 0.55;
        if (!analysis.ten_san_pham) analysis.ten_san_pham = textRaw;
      } else {
        await applyHandoff(session, "low_conf");
        while (session.messages.length > MAX_STORED_MESSAGES) session.messages.shift();
        await session.save();
        return res.json({
          reply: HANDOFF_REPLY,
          products: [],
          handoff: true,
          staff_takeover: Boolean(session.staff_takeover),
          sessionId: session.session_token,
        });
      }
    }

    if (analysis.intent === "chinh_sach") {
      const haystack = `${textRaw} ${analysis.chinh_sach_gap}`;
      const hit = await matchFaqAsync(haystack);
      if (hit) {
        reply = `${hit.title}: ${hit.answer}`;
      } else {
        reply =
          "NO NAME hiện hỗ trợ đổi trả trong 7 ngày (sản phẩm nguyên tem), giao hàng COD/chuyển khoản/VNPAY. Bạn muốn biết chi tiết phần nào (đổi trả, ship, thanh toán)? Hoặc gõ «gặp nhân viên» để được hỗ trợ trực tiếp.";
      }
    } else if (analysis.intent === "san_pham" || looksLikeProductQuestion(textRaw)) {
      const kw = analysis.ten_san_pham || textRaw;
      const rawList = await searchProducts(kw);
      products = buildProductCards(rawList, analysis.mau_sac, analysis.kich_co);
      reply =
        buildProductReplyText(products, analysis.mau_sac, analysis.kich_co) ||
        "Hiện không tìm thấy sản phẩm khớp mô tả. Bạn thử gọi tên rõ hơn hoặc xem danh mục trên website nhé.";
    } else {
      reply =
        "Mình chưa hiểu rõ yêu cầu. Bạn có thể hỏi cụ thể về một sản phẩm (tên, màu, size) hoặc chính sách đổi trả / vận chuyển. Gõ «gặp nhân viên» nếu cần hỗ trợ trực tiếp.";
    }

    session.messages.push({
      role: "assistant",
      content: reply,
      products: products.length ? products : undefined,
      at: new Date(),
    });
    while (session.messages.length > MAX_STORED_MESSAGES) session.messages.shift();
    await session.save();

    res.json({
      reply,
      products,
      handoff: session.handoff,
      staff_takeover: Boolean(session.staff_takeover),
      sessionId: session.session_token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không xử lý được tin nhắn." });
  }
};

/** PB22: báo hiệu phiên chờ nhân viên — dùng cho màn quản trị sau */
exports.listHandoffs = async (req, res) => {
  try {
    const rows = await ChatSession.find({
      handoff: true,
      staff_alerted: true,
    })
      .sort({ handoff_at: -1 })
      .limit(50)
      .select("session_token handoff_at staff_takeover takeover_at nguoi_dung_id updatedAt messages")
      .lean();

    res.json({
      total: rows.length,
      items: rows.map((r) => ({
        session_token: r.session_token,
        handoff_at: r.handoff_at,
        staff_takeover: Boolean(r.staff_takeover),
        takeover_at: r.takeover_at,
        nguoi_dung_id: r.nguoi_dung_id,
        updatedAt: r.updatedAt,
        last_message: r.messages?.length ? r.messages[r.messages.length - 1] : null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không tải được danh sách chuyển nhân viên." });
  }
};
