const crypto = require("crypto");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateTime(d) {
  return (
    d.getFullYear() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds())
  );
}

function buildSignData(vnpParams) {
  const keys = Object.keys(vnpParams)
    .filter((k) => vnpParams[k] !== "" && vnpParams[k] !== undefined && vnpParams[k] !== null)
    .filter((k) => !k.startsWith("vnp_SecureHash"))
    .sort();
  return keys.map((k) => `${k}=${vnpParams[k]}`).join("&");
}

function signHmacSHA512(secret, data) {
  return crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex");
}

/**
 * Tạo URL thanh toán VNPAY (sandbox hoặc production).
 * @see https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop
 */
function createPaymentUrl({
  tmnCode,
  hashSecret,
  payUrl,
  returnUrl,
  ipAddr,
  amountVnd,
  maDon,
  orderInfo,
  locale,
}) {
  const now = new Date();
  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale === "en" ? "en" : "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: maDon,
    vnp_OrderInfo: orderInfo.slice(0, 255),
    vnp_OrderType: "other",
    vnp_Amount: String(Math.round(Number(amountVnd)) * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: (ipAddr || "127.0.0.1").slice(0, 45),
    vnp_CreateDate: formatDateTime(now),
    vnp_ExpireDate: formatDateTime(new Date(now.getTime() + 15 * 60 * 1000)),
  };

  const signData = buildSignData(vnp_Params);
  vnp_Params.vnp_SecureHash = signHmacSHA512(hashSecret, signData);

  const qs = Object.keys(vnp_Params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(vnp_Params[k]))}`)
    .join("&");

  return `${payUrl}?${qs}`;
}

function verifyReturnQuery(query, hashSecret) {
  if (!hashSecret) return false;
  const secureHash = query.vnp_SecureHash;
  if (!secureHash) return false;

  const params = {};
  Object.keys(query).forEach((k) => {
    if (!k.startsWith("vnp_")) return;
    if (k === "vnp_SecureHash" || k === "vnp_SecureHashType") return;
    params[k] = query[k];
  });

  const signData = buildSignData(params);
  const signed = signHmacSHA512(hashSecret, signData);
  try {
    const a = Buffer.from(signed, "utf8");
    const b = Buffer.from(secureHash, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b) && String(query.vnp_ResponseCode) === "00";
  } catch {
    return false;
  }
}

module.exports = { createPaymentUrl, verifyReturnQuery, formatDateTime };
