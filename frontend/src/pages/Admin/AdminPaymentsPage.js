import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config";
import "./AdminPaymentsPage.css";

const API = `${API_BASE}/api/admin/payments`;

function formatPrice(v) {
  if (!v && v !== 0) return "0";
  return `${v.toLocaleString("vi-VN")} VNĐ`;
}

function formatDt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

const PAY_LABEL = {
  vnpay: "VNPAY",
  cod: "COD",
  chuyen_khoan: "Chuyển khoản",
};

const STATUS_BADGE = {
  cho_thanh_toan: { className: "pay-st-pending", text: "CHỜ THANH TOÁN" },
  da_thanh_toan: { className: "pay-st-paid", text: "ĐÃ THANH TOÁN" },
  that_bai: { className: "pay-st-fail", text: "THẤT BẠI" },
  hoan_tien: { className: "pay-st-refund", text: "ĐÃ HOÀN TIỀN" },
};

const AdminPaymentsPage = () => {
  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [err, setErr] = useState("");

  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setTo(end.toISOString().slice(0, 10));
    setFrom(start.toISOString().slice(0, 10));
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API, {
        headers: authHeader(),
        params: {
          q: q || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 15,
        },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      setErr(e.response?.data?.message || "Không tải được danh sách.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, from, to, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await axios.get(`${API}/${id}`, { headers: authHeader() });
      setDetail(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || "Không tải chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetail(null);

  const confirmOffline = async (id) => {
    if (!window.confirm("Xác nhận đã nhận đủ tiền cho đơn này?")) return;
    setActionBusy(true);
    try {
      await axios.post(`${API}/${id}/confirm-offline`, {}, { headers: authHeader() });
      await fetchList();
      if (detail && String(detail._id) === String(id)) {
        const res = await axios.get(`${API}/${id}`, { headers: authHeader() });
        setDetail(res.data);
      }
    } catch (e) {
      alert(e.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setActionBusy(false);
    }
  };

  const markRefund = async (id) => {
    if (!window.confirm("Đánh dấu đơn đã hoàn tiền?")) return;
    setActionBusy(true);
    try {
      await axios.post(`${API}/${id}/refund`, {}, { headers: authHeader() });
      await fetchList();
      if (detail && String(detail._id) === String(id)) {
        const res = await axios.get(`${API}/${id}`, { headers: authHeader() });
        setDetail(res.data);
      }
    } catch (e) {
      alert(e.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="admin-payments">
      <h1 className="admin-payments-title">Quản lý thanh toán</h1>
      <p className="admin-payments-lead">
        Theo dõi giao dịch, đối soát VNPAY và xác nhận thanh toán COD / chuyển khoản.
      </p>

      <form className="admin-payments-filters" onSubmit={applySearch}>
        <label className="admin-payments-field">
          <span>Tìm kiếm (Mã ĐH, mã GD):</span>
          <input
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="VD: DH..., GDHT..."
          />
        </label>
        <label className="admin-payments-field">
          <span>Lọc theo trạng thái:</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="cho_thanh_toan">Chờ thanh toán</option>
            <option value="da_thanh_toan">Đã thanh toán</option>
            <option value="that_bai">Thất bại</option>
            <option value="hoan_tien">Đã hoàn tiền</option>
          </select>
        </label>
        <label className="admin-payments-field">
          <span>Từ ngày:</span>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="admin-payments-field">
          <span>Đến ngày:</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </label>
        <div className="admin-payments-filter-actions">
          <button type="button" className="btn-pay-ghost" onClick={setLast30Days}>
            30 ngày gần nhất
          </button>
          <button type="submit" className="btn-pay-primary">
            Tìm
          </button>
        </div>
      </form>

      {err && <div className="admin-payments-error">{err}</div>}

      <section className="admin-payments-table-wrap">
        <h2 className="admin-payments-section-title">Danh sách giao dịch thanh toán</h2>
        {loading ? (
          <p className="admin-payments-muted">Đang tải…</p>
        ) : (
          <div className="admin-payments-table-responsive">
            <table className="admin-payments-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã giao dịch HT</th>
                  <th>Mã đơn hàng</th>
                  <th>Tên khách</th>
                  <th>Số tiền</th>
                  <th>Hình thức</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="admin-payments-empty">
                      Không có dữ liệu.
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => {
                    const st = STATUS_BADGE[row.trang_thai_thanh_toan] || STATUS_BADGE.cho_thanh_toan;
                    const offset = (page - 1) * 15;
                    return (
                      <tr key={row._id}>
                        <td>{offset + idx + 1}</td>
                        <td className="mono">{row.ma_giao_dich_hien_thi || row.ma_giao_dich}</td>
                        <td className="mono">{row.ma_don}</td>
                        <td>{row.ho_va_ten}</td>
                        <td>{formatPrice(row.tong_cong)}</td>
                        <td>{PAY_LABEL[row.hinh_thuc_thanh_toan] || row.hinh_thuc_thanh_toan}</td>
                        <td className="nowrap">{formatDt(row.createdAt)}</td>
                        <td>
                          <span className={`pay-badge ${st.className}`}>{st.text}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-pay-link"
                            onClick={() => openDetail(row._id)}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="admin-payments-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <span>
              Trang {page} / {totalPages} ({total} giao dịch)
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        )}
      </section>

      {(detail || detailLoading) && (
        <div className="admin-payments-modal-overlay" role="presentation" onClick={closeDetail}>
          <div
            className="admin-payments-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="admin-payments-modal-close" onClick={closeDetail}>
              ×
            </button>
            {detailLoading && <p>Đang tải…</p>}
            {detail && !detailLoading && (
              <>
                <h3>Chi tiết thanh toán</h3>
                <dl className="admin-payments-dl">
                  <dt>Mã giao dịch HT</dt>
                  <dd>{detail.ma_giao_dich_hien_thi || detail.ma_giao_dich}</dd>
                  <dt>Mã đơn</dt>
                  <dd>{detail.ma_don}</dd>
                  <dt>Khách hàng</dt>
                  <dd>{detail.ho_va_ten}</dd>
                  <dt>Số tiền</dt>
                  <dd>{formatPrice(detail.tong_cong)}</dd>
                  <dt>Hình thức</dt>
                  <dd>{PAY_LABEL[detail.hinh_thuc_thanh_toan]}</dd>
                  <dt>Trạng thái</dt>
                  <dd>
                    <span
                      className={`pay-badge ${
                        STATUS_BADGE[detail.trang_thai_thanh_toan]?.className || ""
                      }`}
                    >
                      {STATUS_BADGE[detail.trang_thai_thanh_toan]?.text || detail.trang_thai_thanh_toan}
                    </span>
                  </dd>
                  <dt>Thời gian tạo</dt>
                  <dd>{formatDt(detail.createdAt)}</dd>
                </dl>

                {detail.hinh_thuc_thanh_toan === "vnpay" && (
                  <div className="admin-payments-vnpay">
                    <h4>Đối soát VNPAY</h4>
                    <dl className="admin-payments-dl small">
                      <dt>Mã GD VNPAY</dt>
                      <dd>{detail.vnpay_transaction_no || "—"}</dd>
                      <dt>Mã phản hồi</dt>
                      <dd>{detail.vnpay_response_code || "—"}</dd>
                      <dt>Ngân hàng</dt>
                      <dd>{detail.vnpay_bank_code || "—"}</dd>
                      <dt>Thời gian TT (PayDate)</dt>
                      <dd>{detail.vnpay_pay_date || "—"}</dd>
                    </dl>
                  </div>
                )}

                <div className="admin-payments-modal-actions">
                  {["cod", "chuyen_khoan"].includes(detail.hinh_thuc_thanh_toan) &&
                    detail.trang_thai_thanh_toan === "cho_thanh_toan" && (
                      <button
                        type="button"
                        className="btn-pay-primary"
                        disabled={actionBusy}
                        onClick={() => confirmOffline(detail._id)}
                      >
                        Xác nhận đã nhận tiền
                      </button>
                    )}
                  {["da_thanh_toan", "that_bai"].includes(detail.trang_thai_thanh_toan) && (
                    <button
                      type="button"
                      className="btn-pay-warn"
                      disabled={actionBusy}
                      onClick={() => markRefund(detail._id)}
                    >
                      Đánh dấu hoàn tiền
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentsPage;
