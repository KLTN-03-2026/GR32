/**
 * Đường dẫn SPA cho thanh toán: /checkout (hoặc /prefix/checkout khi deploy có PUBLIC_URL).
 */
export function getCheckoutPath() {
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return base ? `${base}/checkout` : "/checkout";
}

/**
 * URL đầy đủ — dùng cho thuộc tính href (điều hướng thuần trình duyệt, không qua React).
 * Ghép chuỗi thay vì new URL() để tránh edge case base/path.
 */
export function getCheckoutFullUrl() {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "/checkout";
  }
  const path = getCheckoutPath();
  const origin = window.location.origin.replace(/\/$/, "");
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

/** Giống /checkout nhưng dùng cho nút trong giỏ — tránh proxy/extension chặn chữ "checkout". */
export function getThanhToanPath() {
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return base ? `${base}/thanh-toan` : "/thanh-toan";
}

export function getThanhToanFullUrl() {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "/thanh-toan";
  }
  const path = getThanhToanPath();
  const origin = window.location.origin.replace(/\/$/, "");
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

/**
 * Đường dẫn ngắn, không chứa từ khóa "checkout/thanh toán" — ít bị extension trình duyệt thường chặn/sửa URL.
 * Dùng cho nút trong giỏ (form GET thuần HTML).
 */
export function getOrderFlowPath() {
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return base ? `${base}/s/x` : "/s/x";
}
