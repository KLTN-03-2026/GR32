/** FAQ mặc định (PB22) — dùng khi MongoDB chưa có bản ghi */
const FAQ_ENTRIES = [
  {
    danh_muc: "doi_tra",
    keys: ["đổi trả", "đổi hàng", "trả hàng", "hoàn tiền"],
    title: "Đổi / trả hàng",
    answer:
      "NO NAME hỗ trợ đổi size/màu trong 7 ngày nếu sản phẩm còn nguyên tem, chưa giặt và có hóa đơn. Vui lòng giữ nguyên bao bì và liên hệ hotline cửa hàng để được hướng dẫn chi tiết.",
  },
  {
    danh_muc: "van_chuyen",
    keys: ["vận chuyển", "ship", "giao hàng", "phí ship"],
    title: "Vận chuyển",
    answer:
      "Đơn có giao tận nơi và nhận tại cửa hàng. Phí vận chuyển hiển thị khi thanh toán (ví dụ giao tận nơi có phí ship theo chính sách hiện hành trên website).",
  },
  {
    danh_muc: "thanh_toan",
    keys: ["thanh toán", "cod", "chuyển khoản", "vnpay"],
    title: "Thanh toán",
    answer:
      "Cửa hàng hỗ trợ COD (thanh toán khi nhận), chuyển khoản và thanh toán VNPAY khi đặt hàng online qua website.",
  },
  {
    danh_muc: "san_pham",
    keys: ["kích hoạt", "tài khoản", "email"],
    title: "Tài khoản",
    answer:
      "Sau khi đăng ký, bạn cần kích hoạt tài khoản qua email. Nếu không thấy mail, kiểm tra hộp thư rác hoặc yêu cầu gửi lại link kích hoạt tại trang đăng nhập.",
  },
];

const ChatbotFaq = require("../models/ChatbotFaq");

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Khớp FAQ tĩnh (keyword cũ) */
function matchFaqStatic(userText) {
  const n = norm(userText);
  for (const entry of FAQ_ENTRIES) {
    if (entry.keys.some((k) => n.includes(norm(k)))) {
      return { title: entry.title, answer: entry.answer };
    }
  }
  return null;
}

/** Khớp FAQ trong MongoDB (PB23) — ưu tiên thứ tự `thu_tu` */
async function matchFaqFromDb(userText) {
  const n = norm(userText);
  if (!n) return null;
  const items = await ChatbotFaq.find({ hoat_dong: true }).sort({ thu_tu: 1, createdAt: 1 }).lean();
  for (const item of items) {
    const q = norm(item.cau_hoi_mau);
    if (q.length >= 2 && n.includes(q)) {
      return { title: item.cau_hoi_mau, answer: item.cau_tra_loi };
    }
    const kws = Array.isArray(item.tu_khoa) ? item.tu_khoa : [];
    for (const k of kws) {
      const nk = norm(k);
      if (nk.length >= 2 && n.includes(nk)) {
        return { title: item.cau_hoi_mau, answer: item.cau_tra_loi };
      }
    }
  }
  return null;
}

/** PB22 + PB23: ưu tiên dữ liệu quản trị, fallback FAQ tĩnh */
async function matchFaqAsync(userText) {
  const fromDb = await matchFaqFromDb(userText);
  if (fromDb) return fromDb;
  return matchFaqStatic(userText);
}

module.exports = {
  FAQ_ENTRIES,
  norm,
  matchFaq: matchFaqStatic,
  matchFaqFromDb,
  matchFaqAsync,
};
