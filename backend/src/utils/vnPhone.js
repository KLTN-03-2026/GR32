/** Thông báo lỗi thống nhất khi SĐT không đúng 10 số VN. */
const PHONE_INVALID_MSG =
  "Số điện thoại phải đúng 10 chữ số Việt Nam (bắt đầu bằng 0, ví dụ 0901234567).";

/**
 * Chuẩn hóa SĐT VN: chỉ giữ số; hỗ trợ đầu +84 / 84.
 * @returns {string|null} Chuỗi 10 số dạng 0xxxxxxxxx hoặc null nếu không hợp lệ.
 */
function normalizeVnPhone10(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("84") && d.length >= 10) {
    d = `0${d.slice(2)}`;
  }
  if (d.length === 9 && /^[3-9]/.test(d)) {
    d = `0${d}`;
  }
  if (d.length === 10 && /^0\d{9}$/.test(d)) return d;
  return null;
}

function isValidVnPhone10(input) {
  return normalizeVnPhone10(input) !== null;
}

module.exports = {
  normalizeVnPhone10,
  isValidVnPhone10,
  PHONE_INVALID_MSG,
};
