import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config";
import "./AdminOrdersPage.css";

const API = `${API_BASE}/api/admin/orders`;

const STATUS_LABEL = {
  cho_xu_ly: "Đang xử lý",
  dang_giao: "Đang vận chuyển",
  da_giao_hang: "Đã giao hàng",
  hoan_thanh: "Hoàn thành",
  huy: "Đã hủy",
};

function formatMoney(n) {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("vi-VN")}đ`;
}

function formatDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

const AdminOrdersPage = () => {
  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API, {
        headers: authHeader(),
        params: { q: q || undefined, trang_thai_don: status || undefined, page, limit: 15 },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      setErr(e.response?.data?.message || "Không tải được danh sách đơn.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const patchStatus = async (orderId, trang_thai_don) => {
    setBusyId(orderId);
    setMsg("");
    try {
      const res = await axios.patch(
        `${API}/${orderId}/status`,
        { trang_thai_don },
        { headers: authHeader() },
      );
      setMsg(res.data.message || "Đã cập nhật.");
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Không cập nhật được.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="aop-page">
      <h2 className="aop-title">Đơn hàng</h2>
      <p className="aop-hint">
        Sau khi shipper báo đã giao, chuyển đơn từ <strong>Đang vận chuyển</strong> sang{" "}
        <strong>Đã giao hàng</strong>. Khách xác nhận nhận hàng trên web để hoàn thành.
      </p>

      <form className="aop-toolbar" onSubmit={applySearch}>
        <input
          type="search"
          className="aop-input"
          placeholder="Mã đơn..."
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <select
          className="aop-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">[Tất cả trạng thái]</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" className="aop-btn">
          Tìm
        </button>
      </form>

      {msg && <div className="aop-msg">{msg}</div>}
      {err && <div className="aop-err">{err}</div>}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <div className="aop-table-wrap">
            <table className="aop-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Ngày</th>
                  <th>Tổng</th>
                  <th>Trạng thái</th>
                  <th>Đổi trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <OrderRow
                    key={o._id}
                    order={o}
                    busy={busyId === o._id}
                    onSave={(st) => patchStatus(o._id, st)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <p className="aop-empty">Không có đơn.</p>}
          {totalPages > 1 && (
            <div className="aop-pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trước
              </button>
              <span>
                Trang {page}/{totalPages} ({total} đơn)
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderRow({ order, onSave, busy }) {
  const [sel, setSel] = useState(order.trang_thai_don);

  useEffect(() => {
    setSel(order.trang_thai_don);
  }, [order.trang_thai_don]);

  return (
    <tr>
      <td className="aop-ma">{order.ma_don}</td>
      <td>{formatDt(order.createdAt)}</td>
      <td>{formatMoney(order.tong_cong)}</td>
      <td>
        <span className="aop-st">{STATUS_LABEL[order.trang_thai_don] || order.trang_thai_don}</span>
      </td>
      <td>
        <div className="aop-row-act">
          <select
            className="aop-select-sm"
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            disabled={busy}
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="aop-btn-sm"
            disabled={busy || sel === order.trang_thai_don}
            onClick={() => onSave(sel)}
          >
            {busy ? "..." : "Lưu"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default AdminOrdersPage;
