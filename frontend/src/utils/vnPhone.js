export const MSG_INVALID_VN_PHONE =
  "Số điện thoại phải đúng 10 chữ số, bắt đầu bằng 0 (ví dụ 0901234567).";

/** @returns {string|null} */
export function normalizeVnPhone10(input) {
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

export function isValidVnPhone10(input) {
  return normalizeVnPhone10(input) !== null;
}
