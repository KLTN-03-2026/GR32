const Order = require("../models/Order");

async function generateMaGiaoDich() {
  for (let i = 0; i < 12; i++) {
    const code = `GDHT-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const exists = await Order.exists({ ma_giao_dich: code });
    if (!exists) return code;
  }
  throw new Error("Không tạo được mã giao dịch duy nhất.");
}

function fallbackMaGiaoDich(orderId) {
  if (!orderId) return "";
  const s = String(orderId);
  return `GDHT-${s.slice(-10).toUpperCase()}`;
}

module.exports = { generateMaGiaoDich, fallbackMaGiaoDich };
