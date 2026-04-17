import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { state: { from: `/orders/${orderId}` } });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API}/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setOrder(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login", { state: { from: `/orders/${orderId}` } });
          return;
        }
        if (!cancelled) {
          setError(err.response?.data?.message || "Không tải được đơn hàng.");
          setOrder(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, navigate]);

  const shipLabel =
    order?.phuong_thuc_van_chuyen === "nhan_tai_cua_hang"
      ? "Nhận tại cửa hàng"
      : "Giao tận nơi";

  return (
    <>
      <Header />
      <div className="order-detail-page">
        <div className="order-detail-inner">
          <Link to="/orders" className="order-detail-back">
            ← Quay lại danh sách đơn
          </Link>

          {loading && <p className="order-detail-loading">Đang tải...</p>}
          {error && !loading && <p className="order-detail-error">{error}</p>}

          {order && !loading && (
            <>
              <div className="order-detail-head">
                <h1>Chi tiết đơn #{order.ma_don}</h1>
                <p className="order-detail-meta">Đặt lúc: {formatDateTime(order.createdAt)}</p>
              </div>

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
                      </tr>
                    </thead>
                    <tbody>
                      {(order.chi_tiet || []).map((line, idx) => (
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
                        </tr>
                      ))}
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
      <Footer />
    </>
  );
};

export default OrderDetailPage;
