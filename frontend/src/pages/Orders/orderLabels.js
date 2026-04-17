export function labelHinhThucThanhToan(v) {
  if (v === "cod") return "COD";
  if (v === "chuyen_khoan") return "Chuyển khoản";
  if (v === "vnpay") return "VNPAY";
  return v || "—";
}

export function labelTrangThaiDon(v) {
  if (v === "cho_xu_ly") return "Đang xử lý";
  if (v === "dang_giao") return "Đang giao";
  if (v === "hoan_thanh") return "Hoàn thành";
  if (v === "huy") return "Đã hủy";
  return v || "—";
}

export function labelTrangThaiThanhToan(v) {
  if (v === "cho_thanh_toan") return "Chờ thanh toán";
  if (v === "da_thanh_toan") return "Đã thanh toán";
  if (v === "that_bai") return "Thất bại";
  if (v === "hoan_tien") return "Hoàn tiền";
  return v || "—";
}

export function iconTrangThaiDon(v) {
  if (v === "cho_xu_ly") return "fa-check-circle";
  if (v === "dang_giao") return "fa-truck";
  if (v === "hoan_thanh") return "fa-flag-checkered";
  if (v === "huy") return "fa-ban";
  return "fa-circle";
}
