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

const GREETING_REGEX =
  /\b(chào|xin chào|hi|hello|hey|bạn khỏe|bạn ổn|có ai ở đây|rảnh không|nói chuyện|cảm ơn|thanks|thank you)\b/i;

function isGreetingOrSmallTalk(text) {
  return GREETING_REGEX.test(String(text || ""));
}

function smallTalkReply() {
  return (
    "Xin chào! Mình là trợ lý AI NO NAME. " +
    "Mình hỗ trợ tra cứu sản phẩm, giá, size, tồn kho và chính sách. " +
    "Bạn có thể hỏi: 'shop có áo polo không', 'còn size 32 không', 'ship bao nhiêu', " +
    "hoặc gõ 'gặp nhân viên' nếu cần hỗ trợ trực tiếp."
  );
}

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

function parseMoneyValue(raw, unit) {
  const cleaned = String(raw).trim().replace(/,/g, ".");
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return null;
  const u = String(unit || "").toLowerCase();
  if (u.includes("triệu") || u.includes("trieu") || u === "tr" || u === "t")
    return Math.round(num * 1_000_000);
  if (
    u.includes("k") ||
    u.includes("nghìn") ||
    u.includes("nghin") ||
    u.includes("ngàn") ||
    u.includes("ngan")
  )
    return Math.round(num * 1000);
  if (u.includes("đ") || u.includes("d")) return Math.round(num);
  return num >= 1000 ? Math.round(num) : Math.round(num * 1_000_000);
}

function parseProductFilters(text) {
  const q = String(text || "").toLowerCase();
  const result = {
    keyword: q,
    loai_san_pham: null,
    brands: [],
    mau_sac: null,
    kich_co: null,
    gia_min: null,
    gia_max: null,
  };

  const productTypeMap = {
    "giay|giày|giay dep|giày dép|dep|dép|boot|sandal|sneaker|running|trainer":
      "giay",
    "ao|áo|polo|t-shirt|thun|oversize|cardigan|hoodie|khoacac|khoác|áo sơ mi|ao so mi|somi|áo dài tay|ao dai tay|áo crep|ao crep|crep":
      "ao",
    "quan|quần|jean|jeans|pants|short|shorts|quần dài|quan dai|quần ngắn|quan ngan|quần đùi|quan dui":
      "quan",
    "vay|váy|skirt|đầm|dam|dress": "vay",
    "mu|mũ|non|nón|snapback|bucket|be|bé|be non|turban": "mu",
    "tui|túi|ba lo|balo|túi xách|tui xach|clutch|backpack": "tui",
    van: "an khan",
    "tat|tất|vo|ông|ong": "tat",
    "thao mao|mao|áo thảo|ao thao": "do_thao",
    "tai khoan|account|email": "account",
  };

  const boundary = "(?:^|\s|[.,;:!?])";
  for (const [pattern, type] of Object.entries(productTypeMap)) {
    const rx = new RegExp(`${boundary}(${pattern})${boundary}`, "i");
    if (rx.test(q)) {
      result.loai_san_pham = type;
      break;
    }
  }

  const rangeMatch = q.match(
    /từ\s*([\d.,]+)\s*(triệu|tr|t|k|nghìn|nghin|đ|d)?\s*(đến|den|tới|toi)\s*([\d.,]+)\s*(triệu|tr|t|k|nghìn|nghin|đ|d)?/i,
  );
  if (rangeMatch) {
    result.gia_min = parseMoneyValue(rangeMatch[1], rangeMatch[2]);
    result.gia_max = parseMoneyValue(rangeMatch[4], rangeMatch[5]);
  } else {
    const underMatch = q.match(
      /dưới\s*([\d.,]+)\s*(triệu|tr|t|k|nghìn|nghin|đ|d)?/i,
    );
    if (underMatch) {
      result.gia_max = parseMoneyValue(underMatch[1], underMatch[2]);
    }
    const overMatch = q.match(
      /trên\s*([\d.,]+)\s*(triệu|tr|t|k|nghìn|nghin|đ|d)?/i,
    );
    if (overMatch) {
      result.gia_min = parseMoneyValue(overMatch[1], overMatch[2]);
    }
  }

  const sizeMatch = q.match(
    /(?:size|cỡ|kích\s*cỡ)\s*([0-9]+|xxs|xs|s|m|l|xl|xxl|3xl|4xl)/i,
  );
  if (sizeMatch) {
    result.kich_co = sizeMatch[1].toUpperCase();
  }

  const colorMatch = q.match(/(?:màu|mau)\s*([a-z0-9\săéêôơưũ]+)/i);
  if (colorMatch) {
    result.mau_sac = colorMatch[1].trim();
  }

  return result;
}

async function searchProducts(keyword, filters = {}) {
  const q = String(keyword || "").trim();
  const queryCondition = { trang_thai: { $ne: "ngung_ban" } };

  if (filters.loai_san_pham) {
    const typeHint =
      filters.loai_san_pham === "giay"
        ? /giay|dep|sneaker|boot|sandal|trainer|running/i
        : filters.loai_san_pham === "ao"
          ? /ao|polo|hoodie|cardigan|khoa|blazer|somi|oversize/i
          : filters.loai_san_pham === "quan"
            ? /quan|jean|pants|short/i
            : filters.loai_san_pham === "vay"
              ? /vay|dress|skirt/i
              : filters.loai_san_pham === "mu"
                ? /mu|non|snapback|bucket|turban|be/i
                : null;

    if (typeHint) {
      queryCondition.$or = [
        { ten_san_pham: typeHint },
        { mo_ta: typeHint },
        { danh_muc: typeHint },
      ];
    }
  } else if (q) {
    const words = q
      .split(/\s+/)
      .map((w) => w.trim().replace(/[^\p{L}\p{N}]/gu, ""))
      .filter(
        (w) =>
          w.length >= 2 &&
          !SEARCH_STOPWORDS.has(norm(w)) &&
          !/^(size|cỡ|có|co|nào|nao|không|khong|màu|mau|giá|gia|hàng|hang|shop|bán|ban|cửa|cua|này|nay|ở|o|bên|ben|đây|day)$/i.test(
            w,
          ),
      );
    if (words.length) {
      const rx = new RegExp(words.map(escapeRx).join("|"), "i");
      queryCondition.$or = [
        { ten_san_pham: rx },
        { mo_ta: rx },
        { thuong_hieu: rx },
        { danh_muc: rx },
      ];
    }
  }

  if (filters.brands?.length) {
    queryCondition.thuong_hieu = { $in: filters.brands };
  }

  if (filters.gia_min || filters.gia_max) {
    const priceCond = {};
    if (filters.gia_min) priceCond.$gte = Number(filters.gia_min);
    if (filters.gia_max) priceCond.$lte = Number(filters.gia_max);

    queryCondition.$and = queryCondition.$and || [];
    queryCondition.$and.push({
      $or: [
        { gia_hien_tai: priceCond },
        { "bien_the.gia_ban": priceCond },
        { "bien_the.gia_goc": priceCond },
      ],
    });
  }

  const variantParts = [];
  if (filters.kich_co) {
    variantParts.push({
      bien_the: {
        $elemMatch: {
          kich_co: { $regex: new RegExp(escapeRx(filters.kich_co), "i") },
        },
      },
    });
  }
  if (filters.mau_sac) {
    variantParts.push({
      bien_the: {
        $elemMatch: {
          mau_sac: { $regex: new RegExp(escapeRx(filters.mau_sac), "i") },
        },
      },
    });
  }
  if (variantParts.length) {
    queryCondition.$and = queryCondition.$and
      ? queryCondition.$and.concat(variantParts)
      : variantParts;
  }

  const hasSearchCriteria =
    filters.loai_san_pham ||
    q ||
    filters.brands?.length ||
    filters.gia_min ||
    filters.gia_max ||
    filters.kich_co ||
    filters.mau_sac;
  if (!hasSearchCriteria) return [];

  let list = await Product.find(queryCondition).limit(14).lean();
  if (list.length) return list;

  const hasExplicitFilter =
    filters.loai_san_pham ||
    filters.brands?.length ||
    filters.gia_min ||
    filters.gia_max ||
    filters.kich_co ||
    filters.mau_sac;
  if (hasExplicitFilter) return [];

  if (!q && !filters.loai_san_pham) return [];

  const nq = norm(q || filters.loai_san_pham || "");
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
    const price =
      variant?.gia_ban ?? variant?.gia_goc ?? p.gia_hien_tai ?? p.gia_goc ?? 0;
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
    const ton =
      c.ton_kho > 0
        ? `Còn ${c.ton_kho} sản phẩm`
        : "Đang hết hàng tại biến thể khớp — xem các lựa chọn khác trên trang chi tiết.";
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
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      ten_san_pham: String(parsed.ten_san_pham || "").trim(),
      mau_sac: String(parsed.mau_sac || "").trim(),
      kich_co: String(parsed.kich_co || "").trim(),
      chinh_sach_gap: String(parsed.chinh_sach_gap || "").trim(),
    };
  } catch {
    return {
      intent: "khong_ro",
      confidence: 0.25,
      ten_san_pham: "",
      mau_sac: "",
      kich_co: "",
      chinh_sach_gap: "",
    };
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
    const doc = await ChatSession.findOne({
      session_token: req.params.token,
    }).lean();
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy phiên chat." });
    }
    if (
      doc.nguoi_dung_id &&
      req.user &&
      String(doc.nguoi_dung_id) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "Không có quyền xem phiên chat này." });
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
      return res
        .status(400)
        .json({ message: `Tin nhắn tối đa ${MAX_MESSAGE_LEN} ký tự.` });
    }

    const session = await ChatSession.findOne({ session_token: sessionId });
    if (!session) {
      return res.status(404).json({ message: "Phiên chat không tồn tại." });
    }

    if (
      session.nguoi_dung_id &&
      req.user &&
      String(session.nguoi_dung_id) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "Không có quyền gửi trong phiên này." });
    }

    if (!session.nguoi_dung_id && req.user) {
      session.nguoi_dung_id = req.user._id;
    }

    /** PB23: đã chuyển nhân viên hoặc nhân viên đã tiếp quản — bot không trả lời */
    if (session.handoff || session.staff_takeover) {
      session.messages.push({ role: "user", content: textRaw, at: new Date() });
      while (session.messages.length > MAX_STORED_MESSAGES)
        session.messages.shift();
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
      while (session.messages.length > MAX_STORED_MESSAGES)
        session.messages.shift();
      await session.save();
      return res.json({
        reply: HANDOFF_REPLY,
        products: [],
        handoff: true,
        staff_takeover: Boolean(session.staff_takeover),
        sessionId: session.session_token,
      });
    }

    if (isGreetingOrSmallTalk(textRaw)) {
      const replyText = smallTalkReply();
      session.messages.push({
        role: "assistant",
        content: replyText,
        at: new Date(),
      });
      while (session.messages.length > MAX_STORED_MESSAGES)
        session.messages.shift();
      await session.save();
      return res.json({
        reply: replyText,
        products: [],
        handoff: false,
        staff_takeover: Boolean(session.staff_takeover),
        sessionId: session.session_token,
      });
    }

    let reply = "";
    let products = [];

    // Ưu tiên kiểm tra FAQ trước khi phân loại intent
    const faqHit = await matchFaqAsync(textRaw);
    if (faqHit) {
      reply = `${faqHit.title}: ${faqHit.answer}`;
      session.messages.push({
        role: "assistant",
        content: reply,
        at: new Date(),
      });
      while (session.messages.length > MAX_STORED_MESSAGES)
        session.messages.shift();
      await session.save();
      return res.json({
        reply,
        products: [],
        handoff: session.handoff,
        staff_takeover: Boolean(session.staff_takeover),
        sessionId: session.session_token,
      });
    }

    const apiConfigured = Boolean(process.env.GEMINI_API_KEY);
    if (!apiConfigured) {
      reply =
        "Chatbot AI chưa được cấu hình khóa Gemini (GEMINI_API_KEY). Vui lòng liên hệ quản trị hoặc nhân viên.";
      session.messages.push({
        role: "assistant",
        content: reply,
        at: new Date(),
      });
      while (session.messages.length > MAX_STORED_MESSAGES)
        session.messages.shift();
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
      analysis = {
        intent: "khong_ro",
        confidence: 0.2,
        ten_san_pham: "",
        mau_sac: "",
        kich_co: "",
        chinh_sach_gap: "",
      };
    }

    if (analysis.intent === "chuyen_nhan_vien") {
      await applyHandoff(session, "intent");
      while (session.messages.length > MAX_STORED_MESSAGES)
        session.messages.shift();
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
      } else if (isGreetingOrSmallTalk(textRaw)) {
        const replyText = smallTalkReply();
        session.messages.push({
          role: "assistant",
          content: replyText,
          at: new Date(),
        });
        while (session.messages.length > MAX_STORED_MESSAGES)
          session.messages.shift();
        await session.save();
        return res.json({
          reply: replyText,
          products: [],
          handoff: false,
          staff_takeover: Boolean(session.staff_takeover),
          sessionId: session.session_token,
        });
      } else {
        reply =
          "Mình chưa rõ lắm. Bạn có thể hỏi cụ thể về sản phẩm, giá, size, hoặc chính sách đổi trả / vận chuyển. Gõ 'gặp nhân viên' nếu muốn nhân viên hỗ trợ trực tiếp.";
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
    } else if (
      analysis.intent === "san_pham" ||
      looksLikeProductQuestion(textRaw)
    ) {
      const filters = parseProductFilters(textRaw);
      const hasExplicitSize = /(?:size|cỡ|kích\s*cỡ)\b/i.test(textRaw);
      const hasExplicitColor = /(?:màu|mau)\b/i.test(textRaw);
      const appliedFilters = {
        ...filters,
        kich_co: filters.kich_co || (hasExplicitSize ? analysis.kich_co : null),
        mau_sac:
          filters.mau_sac || (hasExplicitColor ? analysis.mau_sac : null),
      };
      const kw = analysis.ten_san_pham || filters.keyword || textRaw;
      const rawList = await searchProducts(kw, appliedFilters);
      const responseSize = appliedFilters.kich_co;
      const responseColor = appliedFilters.mau_sac;
      products = buildProductCards(rawList, responseColor, responseSize);
      reply =
        buildProductReplyText(products, responseColor, responseSize) ||
        "Hiện không tìm thấy mặt hàng nào khớp yêu cầu. Bạn thử tìm kiếm lại với từ khóa khác hoặc tham khảo các mặt hàng khác trong danh mục nhé.";
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
    while (session.messages.length > MAX_STORED_MESSAGES)
      session.messages.shift();
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
      .select(
        "session_token handoff_at staff_takeover takeover_at nguoi_dung_id updatedAt messages",
      )
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
        last_message: r.messages?.length
          ? r.messages[r.messages.length - 1]
          : null,
      })),
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Không tải được danh sách chuyển nhân viên." });
  }
};
