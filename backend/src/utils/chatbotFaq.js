const ChatbotFaq = require("../models/ChatbotFaq");

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Khớp FAQ trong MongoDB — ưu tiên thứ tự `thu_tu` */
async function matchFaqFromDb(userText) {
  const n = norm(userText);
  if (!n) return null;
  const items = await ChatbotFaq.find({ hoat_dong: true })
    .sort({ thu_tu: 1, createdAt: 1 })
    .lean();
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

/** Khớp FAQ từ dữ liệu admin — chỉ sử dụng database */
async function matchFaqAsync(userText) {
  return await matchFaqFromDb(userText);
}

module.exports = {
  norm,
  matchFaqFromDb,
  matchFaqAsync,
};
