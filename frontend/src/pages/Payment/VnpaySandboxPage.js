import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../config";
import "./VnpaySandboxPage.css";

const API_ORDERS = `${API_BASE}/api/orders`;

function formatPrice(v) {
  if (!v && v !== 0) return "0";
  return v.toLocaleString("vi-VN");
}

const VnpaySandboxPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const maDon = (searchParams.get("ma_don") || "").trim();

  const [meta, setMeta] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const getToken = () => localStorage.getItem("token");

  const loadMeta = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    if (!maDon) {
      navigate("/cart");
      return;
    }
    setLoadError("");
    try {
      const res = await axios.get(
        `${API_ORDERS}/vnpay-sandbox-order/${encodeURIComponent(maDon)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setMeta(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setLoadError(err.response?.data?.message || "Không tải được thông tin đơn.");
    }
  }, [maDon, navigate]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const postAction = async (path) => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    setActionError("");
    setBusy(true);
    try {
      await axios.post(
        `${API_ORDERS}/${path}`,
        { ma_don: maDon },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (path === "vnpay-sandbox-complete") {
        window.dispatchEvent(new Event("cartUpdated"));
        navigate(`/cart?payment=success&ma_don=${encodeURIComponent(maDon)}`);
      } else {
        navigate("/cart?payment=failed");
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const canPay = meta && meta.trang_thai_thanh_toan === "cho_thanh_toan";

  return (
    <div className="vnpay-sandbox-root">
      <header className="vnpay-sandbox-topbar">
        <div className="vnpay-sandbox-topbar-inner">
          <span className="vnpay-sandbox-brand">VNPAY</span>
          <span className="vnpay-sandbox-badge">SANDBOX</span>
        </div>
      </header>

      <main className="vnpay-sandbox-main">
        <div className="vnpay-sandbox-card">
          <h1 className="vnpay-sandbox-title">Cổng thanh toán trực tuyến</h1>
          <p className="vnpay-sandbox-sub">
            Môi trường giả lập — dùng để kiểm tra luồng đặt hàng, không kết nối cổng VNPAY thật.
          </p>

          {!maDon && <p className="vnpay-sandbox-err">Thiếu mã đơn.</p>}
          {loadError && <p className="vnpay-sandbox-err">{loadError}</p>}
          {actionError && <p className="vnpay-sandbox-err">{actionError}</p>}

          {meta && (
            <>
              <div className="vnpay-sandbox-amount-block">
                <span className="vnpay-sandbox-amount-label">Số tiền thanh toán</span>
                <span className="vnpay-sandbox-amount">{formatPrice(meta.tong_cong)} VND</span>
              </div>

              <ul className="vnpay-sandbox-meta">
                <li>
                  <span>Mã đơn hàng</span>
                  <strong>{meta.ma_don}</strong>
                </li>
                <li>
                  <span>Trạng thái</span>
                  <strong>{meta.trang_thai_thanh_toan}</strong>
                </li>
              </ul>

              <div className="vnpay-sandbox-banks" aria-hidden>
                <span className="vnpay-sandbox-bank-pill">ATM</span>
                <span className="vnpay-sandbox-bank-pill">QR</span>
                <span className="vnpay-sandbox-bank-pill">Thẻ nội địa</span>
              </div>

              {!canPay && (
                <p className="vnpay-sandbox-muted">
                  Đơn không còn ở trạng thái chờ thanh toán. Bạn có thể quay lại giỏ hàng.
                </p>
              )}
            </>
          )}

          <div className="vnpay-sandbox-actions">
            <button
              type="button"
              className="vnpay-sandbox-btn secondary"
              disabled={busy}
              onClick={() => navigate("/cart")}
            >
              Quay lại cửa hàng
            </button>
            {canPay && (
              <>
                <button
                  type="button"
                  className="vnpay-sandbox-btn danger"
                  disabled={busy}
                  onClick={() => postAction("vnpay-sandbox-cancel")}
                >
                  Hủy giao dịch
                </button>
                <button
                  type="button"
                  className="vnpay-sandbox-btn primary"
                  disabled={busy}
                  onClick={() => postAction("vnpay-sandbox-complete")}
                >
                  {busy ? "Đang xử lý…" : "Xác nhận thanh toán"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="vnpay-sandbox-footer">
        <span>© VNPAY — giao diện giả lập cho mục đích học tập / demo</span>
      </footer>
    </div>
  );
};

export default VnpaySandboxPage;
