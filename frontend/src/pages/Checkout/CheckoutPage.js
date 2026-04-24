import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import API_BASE from "../../config";
import "./CheckoutPage.css";

const API_AUTH = `${API_BASE}/api/auth`;
const API_CART = `${API_BASE}/api/cart`;
const API_ORDERS = `${API_BASE}/api/orders`;
const API_COUPONS = `${API_BASE}/api/coupons`;

const PHI_SHIP = 20000;

const VOUCHER_DISPLAY = [
  {
    code: "APR20",
    amount: "20k",
    condition: "Đơn từ 499k",
    expiry: "30/04/2026",
  },
  {
    code: "APR60",
    amount: "60k",
    condition: "Đơn từ 799k",
    expiry: "30/04/2026",
  },
  {
    code: "APR90",
    amount: "90k",
    condition: "Đơn từ 1.299k",
    expiry: "30/04/2026",
  },
  {
    code: "APR150",
    amount: "150k",
    condition: "Đơn từ 1.999k",
    expiry: "30/04/2026",
  },
];

const BANK_INFO = {
  ten_ngan_hang: "Ngân hàng TMCP Quân đội (MB)",
  so_tai_khoan: "0906532622",
  chu_tai_khoan: "PHAN QUOC HUY",
  noi_dung: "Thanh toan don hang [ma don]",
  hotline: "0906532622",
};

function formatPrice(v) {
  if (!v && v !== 0) return "0";
  return v.toLocaleString("vi-VN");
}

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const getToken = () => localStorage.getItem("token");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartEmpty, setCartEmpty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [ho_va_ten, setHoVaTen] = useState("");
  const [so_dien_thoai, setSoDienThoai] = useState("");
  const [email, setEmail] = useState("");
  const [dia_chi_chi_tiet, setDiaChiChiTiet] = useState("");
  const [ghi_chu, setGhiChu] = useState("");

  const [phuong_thuc_van_chuyen, setPhuongThucVanChuyen] =
    useState("giao_tan_noi");
  const [hinh_thuc_thanh_toan, setHinhThucThanhToan] = useState("cod");
  const [vnpayLocale, setVnpayLocale] = useState("vn");

  const [voucherInput, setVoucherInput] = useState("");
  const [maVoucher, setMaVoucher] = useState("");
  const [giamGia, setGiamGia] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState("");

  const tamTinh = useMemo(
    () => items.reduce((s, it) => s + it.gia * it.so_luong, 0),
    [items],
  );

  const { phiShip, tongCong } = useMemo(() => {
    const ship = phuong_thuc_van_chuyen === "giao_tan_noi" ? PHI_SHIP : 0;
    return {
      phiShip: ship,
      tongCong: Math.max(0, tamTinh - giamGia + ship),
    };
  }, [tamTinh, giamGia, phuong_thuc_van_chuyen]);

  useEffect(() => {
    let cancelled = false;
    const code = (maVoucher || "").trim();
    if (!code) {
      setGiamGia(0);
      setVoucherMsg("");
      return undefined;
    }
    const token = localStorage.getItem("token");
    if (!token) return undefined;
    (async () => {
      try {
        const res = await axios.post(
          `${API_COUPONS}/preview`,
          { ma: code },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (cancelled) return;
        setGiamGia(Number(res.data.discount) || 0);
        setVoucherMsg(res.data.message || "");
      } catch {
        if (!cancelled) {
          setGiamGia(0);
          setVoucherMsg("Không kiểm tra được mã. Vui lòng thử lại.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maVoucher, tamTinh, items]);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setCartEmpty(false);
    try {
      const cartRes = await axios.get(API_CART, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = cartRes.data.san_pham || [];
      if (!list.length) {
        setItems([]);
        setCartEmpty(true);
        return;
      }
      setItems(list);

      try {
        const profileRes = await axios.get(`${API_AUTH}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = profileRes.data;
        setHoVaTen(u.ho_va_ten || "");
        setSoDienThoai(u.so_dien_thoai || "");
        setEmail(u.email || "");
        if (u.dia_chi) setDiaChiChiTiet(u.dia_chi);
      } catch (profileErr) {
        if (profileErr.response?.status === 401) {
          navigate("/login", { state: { from: location.pathname } });
          return;
        }
        setErrorMsg(
          "Không tải được hồ sơ tài khoản. Vui lòng nhập thông tin thủ công.",
        );
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: location.pathname } });
        return;
      }
      setErrorMsg(
        err.response?.data?.message ||
          "Không tải được giỏ hàng. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyVoucher = () => {
    setMaVoucher(voucherInput.trim());
  };

  const paymentHint = () => {
    if (hinh_thuc_thanh_toan === "cod") {
      return 'Quý khách sẽ thanh toán bằng tiền mặt khi nhận hàng. Vui lòng bấm nút "Đặt hàng" để hoàn tất.';
    }
    if (hinh_thuc_thanh_toan === "chuyen_khoan") {
      return (
        <>
          <p className="checkout-hint-strong">
            Thanh toán qua chuyển khoản ngân hàng (khuyên dùng)
          </p>
          <ul className="checkout-bank-list">
            <li>{BANK_INFO.ten_ngan_hang}</li>
            <li>
              Số TK: <strong>{BANK_INFO.so_tai_khoan}</strong>
            </li>
            <li>
              Chủ TK: <strong>{BANK_INFO.chu_tai_khoan}</strong>
            </li>
            <li>Nội dung CK: ghi mã đơn sau khi đặt hàng</li>
          </ul>
          <p className="checkout-hint-muted">
            Vui lòng bấm nút &quot;Đặt hàng&quot; để hoàn tất. Hoặc liên hệ
            Hotline: <strong>{BANK_INFO.hotline}</strong> để được tư vấn.
          </p>
        </>
      );
    }
    if (hinh_thuc_thanh_toan === "vnpay") {
      return (
        <>
          <p className="checkout-hint-muted">
            Thanh toán qua VNPAY. Sau khi đặt hàng bạn được chuyển tới cổng sandbox
            (giả lập) hoặc cổng VNPAY thật nếu server đã cấu hình TMN và Hash secret.
          </p>
          <p className="checkout-hint-muted">Ngôn ngữ trên cổng VNPAY thật:</p>
          <div className="checkout-lang-row">
            <label>
              <input
                type="radio"
                name="vnp_lang"
                checked={vnpayLocale === "vn"}
                onChange={() => setVnpayLocale("vn")}
              />{" "}
              Tiếng Việt
            </label>
            <label>
              <input
                type="radio"
                name="vnp_lang"
                checked={vnpayLocale === "en"}
                onChange={() => setVnpayLocale("en")}
              />{" "}
              English
            </label>
          </div>
        </>
      );
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    setErrorMsg("");
    if (!ho_va_ten.trim() || !so_dien_thoai.trim() || !email.trim()) {
      setErrorMsg("Vui lòng nhập đủ họ tên, số điện thoại và email.");
      return;
    }
    if (!dia_chi_chi_tiet.trim()) {
      setErrorMsg("Vui lòng nhập địa chỉ nhận hàng.");
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_ORDERS}/checkout`,
        {
          ho_va_ten: ho_va_ten.trim(),
          so_dien_thoai: so_dien_thoai.trim(),
          email: email.trim(),
          dia_chi_chi_tiet: dia_chi_chi_tiet.trim(),
          ghi_chu: ghi_chu.trim(),
          phuong_thuc_van_chuyen,
          hinh_thuc_thanh_toan,
          ma_voucher: maVoucher,
          vnpay_locale: vnpayLocale,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.vnpaySandbox && res.data.ma_don) {
        navigate(
          `/payment/vnpay-sandbox?ma_don=${encodeURIComponent(res.data.ma_don)}`,
        );
        return;
      }

      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
        return;
      }

      window.dispatchEvent(new Event("cartUpdated"));
      const md = res.data.order?.ma_don || "";
      navigate(`/cart?payment=success&ma_don=${encodeURIComponent(md)}`);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Không thể đặt hàng. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="checkout-loading">Đang tải...</div>
        <Footer />
      </>
    );
  }

  if (cartEmpty) {
    return (
      <>
        <Header />
        <div className="checkout-page checkout-empty-cart">
          <h1 className="checkout-title">Thanh toán</h1>
          <p className="checkout-empty-msg">
            Giỏ hàng hiện không có sản phẩm để thanh toán.
          </p>
          <button
            type="button"
            className="btn-back-cart"
            onClick={() => navigate("/cart")}
          >
            Quay lại giỏ hàng
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="checkout-page">
        <h1 className="checkout-title">Thanh toán</h1>

        <div className="checkout-grid">
          <div className="checkout-col-left">
            <section className="checkout-card">
              <h2 className="checkout-section-title">Thông tin đơn hàng</h2>
              <div className="checkout-form-grid">
                <label className="checkout-field full">
                  <span>
                    Họ và tên <span className="req">*</span>
                  </span>
                  <input
                    value={ho_va_ten}
                    onChange={(e) => setHoVaTen(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </label>
                <label className="checkout-field">
                  <span>
                    Số điện thoại <span className="req">*</span>
                  </span>
                  <input
                    value={so_dien_thoai}
                    onChange={(e) => setSoDienThoai(e.target.value)}
                    placeholder="09xxxxxxxx"
                  />
                </label>
                <label className="checkout-field">
                  <span>
                    Email <span className="req">*</span>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </label>
                <label className="checkout-field full">
                  <span>
                    Địa chỉ nhận hàng <span className="req">*</span>
                  </span>
                  <textarea
                    value={dia_chi_chi_tiet}
                    onChange={(e) => setDiaChiChiTiet(e.target.value)}
                    rows={3}
                    placeholder="Ghi đầy đủ: số nhà, đường, phường/xã, tỉnh/thành…"
                  />
                  <span className="checkout-field-hint">
                    Có thể khác hồ sơ tài khoản (ví dụ gửi tặng người khác). Cửa
                    hàng NO NAME tại Đà Nẵng — giao theo địa chỉ bạn nhập ở đây.
                  </span>
                </label>
                <label className="checkout-field full">
                  <span>Ghi chú giao hàng</span>
                  <textarea
                    value={ghi_chu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    rows={2}
                    placeholder="Giao giờ hành chính..."
                  />
                </label>
              </div>
            </section>

            <section className="checkout-card">
              <h2 className="checkout-section-title">Phương thức vận chuyển</h2>
              <label className="checkout-radio-row">
                <input
                  type="radio"
                  name="ship"
                  checked={phuong_thuc_van_chuyen === "giao_tan_noi"}
                  onChange={() => setPhuongThucVanChuyen("giao_tan_noi")}
                />
                <span>
                  Giao hàng tận nơi (từ Đà Nẵng) —{" "}
                  <strong>{formatPrice(PHI_SHIP)}đ</strong>
                </span>
              </label>
              <label className="checkout-radio-row">
                <input
                  type="radio"
                  name="ship"
                  checked={phuong_thuc_van_chuyen === "nhan_tai_cua_hang"}
                  onChange={() => setPhuongThucVanChuyen("nhan_tai_cua_hang")}
                />
                <span>
                  Nhận hàng tại cửa hàng (Đà Nẵng) — <strong>0đ</strong>
                </span>
              </label>
            </section>

            <section className="checkout-card">
              <h2 className="checkout-section-title">Hình thức thanh toán</h2>
              <div className="checkout-pay-options">
                <label
                  className={`checkout-pay-item ${hinh_thuc_thanh_toan === "cod" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={hinh_thuc_thanh_toan === "cod"}
                    onChange={() => setHinhThucThanhToan("cod")}
                  />
                  <div>
                    <strong>Thanh toán khi giao hàng (COD)</strong>
                    <p className="checkout-pay-sub">
                      Kiểm tra hàng trước khi thanh toán. Freeship đơn từ 399k
                      (theo chính sách cửa hàng).
                    </p>
                  </div>
                </label>
                <label
                  className={`checkout-pay-item ${hinh_thuc_thanh_toan === "chuyen_khoan" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={hinh_thuc_thanh_toan === "chuyen_khoan"}
                    onChange={() => setHinhThucThanhToan("chuyen_khoan")}
                  />
                  <div>
                    <strong>Chuyển khoản ngân hàng</strong>
                    <p className="checkout-pay-sub">
                      Khuyên dùng — chuyển khoản theo thông tin sau khi đặt
                      hàng.
                    </p>
                  </div>
                </label>
                <label
                  className={`checkout-pay-item ${hinh_thuc_thanh_toan === "vnpay" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={hinh_thuc_thanh_toan === "vnpay"}
                    onChange={() => setHinhThucThanhToan("vnpay")}
                  />
                  <div className="checkout-pay-with-logo">
                    <strong>VNPAY</strong>
                    <span className="checkout-logo-vnpay">VNPAY</span>
                  </div>
                </label>
              </div>
              <div className="checkout-pay-hint">{paymentHint()}</div>
            </section>

            {errorMsg && <div className="checkout-error">{errorMsg}</div>}
          </div>

          <div className="checkout-col-right">
            <section className="checkout-card checkout-cart-card">
              <div className="checkout-cart-head">
                <h2 className="checkout-section-title">Giỏ hàng</h2>
                <span className="checkout-cart-count">
                  {items.length} sản phẩm
                </span>
              </div>
              <div className="checkout-cart-items">
                {items.map((item) => (
                  <div className="checkout-line" key={item._id}>
                    <div
                      className="checkout-line-img"
                      onClick={() => navigate(`/product/${item.san_pham_id}`)}
                      role="presentation"
                    >
                      {item.hinh_anh ? (
                        <img src={item.hinh_anh} alt="" />
                      ) : (
                        <div className="checkout-line-noimg">
                          <i className="fas fa-image" />
                        </div>
                      )}
                    </div>
                    <div className="checkout-line-body">
                      <div
                        className="checkout-line-name"
                        onClick={() => navigate(`/product/${item.san_pham_id}`)}
                        role="presentation"
                      >
                        {item.ten_san_pham}
                      </div>
                      {(item.mau_sac || item.kich_co) && (
                        <div className="checkout-line-variant">
                          {[item.mau_sac, item.kich_co]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                      <div className="checkout-line-meta">
                        <span>SL: {item.so_luong}</span>
                        <span className="checkout-line-price">
                          {formatPrice(item.gia * item.so_luong)}đ
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="checkout-card">
              <h2 className="checkout-section-title">Ưu đãi — ONLY ONLINE</h2>
              <div className="checkout-voucher-strip">
                {VOUCHER_DISPLAY.map((v) => (
                  <div key={v.code} className="checkout-vchip">
                    <span className="vchip-code">{v.code}</span>
                    <div className="vchip-body">
                      <strong>Giảm {v.amount}</strong>
                      <p>{v.condition}</p>
                      <small>HSD: {v.expiry}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="checkout-voucher-apply">
                <input
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  placeholder="Nhập mã giảm giá"
                />
                <button
                  type="button"
                  className="btn-apply-voucher"
                  onClick={applyVoucher}
                >
                  Áp dụng Voucher
                </button>
              </div>
              {maVoucher.trim() && (
                <p className="checkout-voucher-applied">
                  Đang áp dụng mã: <strong>{maVoucher.trim().toUpperCase()}</strong>
                  {voucherMsg ? (
                    <span style={{ display: "block", marginTop: 6, color: "#b45309", fontWeight: 500 }}>
                      {voucherMsg}
                    </span>
                  ) : giamGia > 0 ? (
                    <span style={{ display: "block", marginTop: 6, color: "#166534", fontWeight: 500 }}>
                      Mã hợp lệ — đã áp dụng giảm {formatPrice(giamGia)}đ
                    </span>
                  ) : null}
                </p>
              )}
            </section>

            <section className="checkout-card checkout-summary">
              <div className="checkout-sum-row">
                <span>Tạm tính</span>
                <span>{formatPrice(tamTinh)}đ</span>
              </div>
              <div className="checkout-sum-row">
                <span>Phí vận chuyển</span>
                <span>{formatPrice(phiShip)}đ</span>
              </div>
              <div className="checkout-sum-row">
                <span>Giảm giá voucher</span>
                <span>-{formatPrice(giamGia)}đ</span>
              </div>
              <div className="checkout-sum-total">
                <span>TỔNG</span>
                <span>{formatPrice(tongCong)}đ</span>
              </div>
              <button
                type="button"
                className="btn-place-order"
                onClick={handlePlaceOrder}
                disabled={submitting}
              >
                {submitting ? "Đang xử lý..." : "ĐẶT HÀNG"}
              </button>
              <button
                type="button"
                className="btn-back-cart"
                onClick={() => navigate("/cart")}
              >
                Quay lại giỏ hàng
              </button>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CheckoutPage;
