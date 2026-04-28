import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import OrderReviewModal from "./OrderReviewModal";
import {
  labelHinhThucThanhToan,
  labelTrangThaiDon,
  labelTrangThaiThanhToan,
} from "./orderLabels";
import "./OrderDetailPage.css";

const API = `${API_BASE}/api/orders/mine`;

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return "0";
  return `${Number(n).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [reviewedLineIndices, setReviewedLineIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLineIndex, setReviewLineIndex] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const loadOrder = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate("/login", { state: { from: `/orders/${orderId}` } });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrder(res.data);
      setReviewedLineIndices(res.data.reviewedLineIndices || []);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: `/orders/${orderId}` } });
        return;
      }
      setError(err.response?.data?.message || "Không tải được đơn hàng.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleConfirmReceived = async () => {
    const token = getToken();
    if (!token) return;
    setConfirmBusy(true);
    setToast("");
    try {
      const res = await axios.post(
        `${API}/${orderId}/confirm-received`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setToastOk(true);
      setToast(res.data.message || "Đã xác nhận.");
      await loadOrder();
    } catch (err) {
      setToastOk(false);
      setToast(err.response?.data?.message || "Không xác nhận được.");
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleCancelOrder = async () => {
    const ok = window.confirm(
      "Bạn chắc chắn muốn hủy đơn hàng này? Thao tác không hoàn tác (trừ khi đặt đơn mới).",
    );
    if (!ok) return;
    const token = getToken();
    if (!token) return;
    setCancelBusy(true);
    setToast("");
    try {
      const res = await axios.post(
        `${API}/${orderId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setToastOk(true);
      setToast(res.data.message || "Đã hủy đơn.");
      await loadOrder();
    } catch (err) {
      setToastOk(false);
      setToast(err.response?.data?.message || "Không hủy được đơn.");
    } finally {
      setCancelBusy(false);
    }
  };

  const openReview = (idx) => {
    setReviewLineIndex(idx);
    setReviewOpen(true);
  };

  const handleReviewSubmit = async (payload) => {
    const token = getToken();
    if (!token) return;
    setReviewSubmitting(true);
    setToast("");
    try {
      const res = await axios.post(`${API}/${orderId}/reviews`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToastOk(true);
      setToast(res.data.message || "Đã gửi đánh giá.");
      setReviewOpen(false);
      setReviewLineIndex(null);
      await loadOrder();
    } catch (err) {
      setToastOk(false);
      setToast(err.response?.data?.message || "Gửi đánh giá thất bại.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const shipLabel =
    order?.phuong_thuc_van_chuyen === "nhan_tai_cua_hang"
      ? "Nhận tại cửa hàng"
      : "Giao tận nơi";

  const reviewLine = reviewLineIndex != null && order?.chi_tiet ? order.chi_tiet[reviewLineIndex] : null;

  return (
    <>
      <Header />
      <div className="order-detail-page">
        <div className="order-detail-inner">
          <Link to="/orders" className="order-detail-back">
            ← Quay lại danh sách đơn
          </Link>

          {toast && (
            <div className={`order-detail-toast ${toastOk ? "" : "order-detail-toast--err"}`}>{toast}</div>
          )}

          {loading && <p className="order-detail-loading">Đang tải...</p>}
          {error && !loading && <p className="order-detail-error">{error}</p>}

          {order && !loading && (
            <>
              <div className="order-detail-head">
                <h1>Chi tiết đơn #{order.ma_don}</h1>
                <p className="order-detail-meta">Đặt lúc: {formatDateTime(order.createdAt)}</p>
              </div>

              {order.trang_thai_don === "cho_xu_ly" && (
                <div className="od-cancel-banner">
                  <p>
                    Đơn đang chờ xử lý. Bạn có thể hủy nếu đổi ý
                    {order.trang_thai_thanh_toan === "da_thanh_toan"
                      ? " (đã thanh toán online: cửa hàng sẽ liên hệ hoàn tiền nếu áp dụng)."
                      : "."}
                  </p>
                  <button
                    type="button"
                    className="od-btn-cancel"
                    onClick={handleCancelOrder}
                    disabled={cancelBusy}
                  >
                    {cancelBusy ? "Đang hủy..." : "Hủy đơn hàng"}
                  </button>
                </div>
              )}

              {order.trang_thai_don === "da_giao_hang" && (
                <div className="od-confirm-banner">
                  <p>Đơn đã được giao. Vui lòng xác nhận khi bạn đã nhận được hàng.</p>
                  <button
                    type="button"
                    className="od-btn-confirm"
                    onClick={handleConfirmReceived}
                    disabled={confirmBusy}
                  >
                    {confirmBusy ? "Đang xử lý..." : "Đã nhận được hàng"}
                  </button>
                </div>
              )}

              <div className="order-detail-grid">
                <section className="od-card">
                  <h2>Trạng thái</h2>
                  <dl className="od-dl">
                    <dt>Đơn hàng</dt>
                    <dd>{labelTrangThaiDon(order.trang_thai_don)}</dd>
                    <dt>Thanh toán</dt>
                    <dd>{labelTrangThaiThanhToan(order.trang_thai_thanh_toan)}</dd>
                    <dt>Hình thức thanh toán</dt>
                    <dd>{labelHinhThucThanhToan(order.hinh_thuc_thanh_toan)}</dd>
                  </dl>
                </section>

                <section className="od-card">
                  <h2>Người nhận</h2>
                  <dl className="od-dl">
                    <dt>Họ tên</dt>
                    <dd>{order.ho_va_ten}</dd>
                    <dt>Số điện thoại</dt>
                    <dd>{order.so_dien_thoai}</dd>
                    <dt>Email</dt>
                    <dd>{order.email || "—"}</dd>
                    <dt>Địa chỉ</dt>
                    <dd>{order.dia_chi_chi_tiet || "—"}</dd>
                    <dt>Vận chuyển</dt>
                    <dd>
                      {shipLabel}
                      {order.phuong_thuc_van_chuyen === "giao_tan_noi" && order.phi_van_chuyen
                        ? ` · Phí: ${formatMoney(order.phi_van_chuyen)}`
                        : ""}
                    </dd>
                  </dl>
                </section>
              </div>

              {order.ghi_chu ? (
                <section className="od-card od-note">
                  <h2>Ghi chú</h2>
                  <p>{order.ghi_chu}</p>
                </section>
              ) : null}

              <section className="od-card od-lines">
                <h2>Sản phẩm</h2>
                <div className="od-table-wrap">
                  <table className="od-lines-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Màu / Size</th>
                        <th>Đơn giá</th>
                        <th>SL</th>
                        <th>Thành tiền</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.chi_tiet || []).map((line, idx) => {
                        const canReview =
                          order.trang_thai_don === "hoan_thanh" &&
                          !(reviewedLineIndices || []).includes(idx);
                        const reviewed = (reviewedLineIndices || []).includes(idx);
                        return (
                          <tr key={`${line.san_pham_id}-${idx}`}>
                            <td>
                              <div className="od-line-name">{line.ten_san_pham}</div>
                            </td>
                            <td>
                              {[line.mau_sac, line.kich_co].filter(Boolean).join(" · ") || "—"}
                            </td>
                            <td>{formatMoney(line.gia)}</td>
                            <td>{line.so_luong}</td>
                            <td className="od-line-sub">{formatMoney(line.gia * line.so_luong)}</td>
                            <td className="od-line-actions">
                              {canReview && (
                                <button
                                  type="button"
                                  className="od-btn-review"
                                  onClick={() => openReview(idx)}
                                >
                                  Đánh giá
                                </button>
                              )}
                              {order.trang_thai_don === "hoan_thanh" && reviewed && (
                                <span className="od-reviewed-label">Đã đánh giá</span>
                              )}
                              {order.trang_thai_don !== "hoan_thanh" && (
                                <span className="od-review-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="od-totals">
                  <div className="od-total-row">
                    <span>Tạm tính</span>
                    <span>{formatMoney(order.tam_tinh)}</span>
                  </div>
                  {order.giam_gia > 0 && (
                    <div className="od-total-row discount">
                      <span>Giảm giá {order.ma_voucher ? `(${order.ma_voucher})` : ""}</span>
                      <span>-{formatMoney(order.giam_gia)}</span>
                    </div>
                  )}
                  <div className="od-total-row grand">
                    <span>Tổng cộng</span>
                    <span>{formatMoney(order.tong_cong)}</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <OrderReviewModal
        open={reviewOpen}
        line={reviewLine}
        lineIndex={reviewLineIndex}
        onClose={() => {
          setReviewOpen(false);
          setReviewLineIndex(null);
        }}
        onSubmit={handleReviewSubmit}
        submitting={reviewSubmitting}
      />

      <Footer />
    </>
  );
};

export default OrderDetailPage;
