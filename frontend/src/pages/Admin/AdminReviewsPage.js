import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config";
import "./AdminReviewsPage.css";

const API = `${API_BASE}/api/admin/reviews`;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function initials(name) {
  const p = String(name || "").trim().split(/\s+/);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function formatDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

function isVisibleRow(r) {
  if (r.trang_thai === "an") return false;
  if (r.trang_thai === "da_xoa") return false;
  return true;
}

function StarRow({ value }) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  return (
    <span className="arp-stars" aria-label={`${v} sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= v ? "arp-star on" : "arp-star"}>
          ★
        </span>
      ))}
    </span>
  );
}

const AdminReviewsPage = () => {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(8);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [soSao, setSoSao] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState({});

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/stats`, { headers: authHeader() });
      setStats(res.data);
    } catch {
      setStats(null);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API, {
        headers: authHeader(),
        params: {
          q: q || undefined,
          trang_thai: trangThai || undefined,
          so_sao: soSao || undefined,
          page,
          limit,
        },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      setErr(e.response?.data?.message || "Không tải được danh sách đánh giá.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, trangThai, soSao, page, limit]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const patchReview = async (id, body) => {
    setBusyId(id);
    setMsg("");
    try {
      const res = await axios.patch(`${API}/${id}`, body, { headers: authHeader() });
      setMsg(res.data.message || "Đã cập nhật.");
      await fetchList();
      await fetchStats();
    } catch (e) {
      setMsg(e.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const saveReply = async (id) => {
    const text = String(replyDraft[id] ?? "").trim();
    await patchReview(id, { phan_hoi_shop: text });
    setReplyDraft((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Xóa vĩnh viễn đánh giá này khỏi hệ thống? (Khách sẽ có thể đánh giá lại dòng đơn đó.)")) {
      return;
    }
    setBusyId(id);
    setMsg("");
    try {
      const res = await axios.delete(`${API}/${id}`, { headers: authHeader() });
      setMsg(res.data.message || "Đã xóa.");
      await fetchList();
      await fetchStats();
    } catch (e) {
      setMsg(e.response?.data?.message || "Không xóa được.");
    } finally {
      setBusyId(null);
    }
  };

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="arp-page">
      <h2 className="arp-title">Quản lý đánh giá</h2>
      <p className="arp-hint">
        Phản hồi khách, ẩn hoặc xóa nội dung không phù hợp. Đánh giá bị ẩn hoặc xóa không còn hiển thị trên trang sản phẩm.
      </p>

      {stats && (
        <div className="arp-stats">
          <div className="arp-stat-card">
            <span className="arp-stat-label">Tổng đánh giá</span>
            <strong className="arp-stat-val">{stats.tong_danh_gia}</strong>
          </div>
          <div className="arp-stat-card">
            <span className="arp-stat-label">Đang hiển thị</span>
            <strong className="arp-stat-val arp-stat-val--ok">{stats.dang_hien_thi}</strong>
          </div>
          <div className="arp-stat-card">
            <span className="arp-stat-label">Chờ xử lý</span>
            <strong className="arp-stat-val arp-stat-val--warn">{stats.cho_xu_ly}</strong>
          </div>
          <div className="arp-stat-card">
            <span className="arp-stat-label">Đã ẩn</span>
            <strong className="arp-stat-val arp-stat-val--bad">{stats.da_an}</strong>
          </div>
        </div>
      )}

      <form className="arp-toolbar" onSubmit={applySearch}>
        <div className="arp-search-wrap">
          <input
            type="search"
            className="arp-input"
            placeholder="Tìm theo sản phẩm hoặc mã đơn hàng"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
          <button type="submit" className="arp-search-btn" aria-label="Tìm">
            <i className="fas fa-search" />
          </button>
        </div>
        <select
          className="arp-select"
          value={trangThai}
          onChange={(e) => {
            setTrangThai(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="hien_thi">Đang hiển thị</option>
          <option value="an">Đã ẩn</option>
        </select>
        <div className="arp-star-filters">
          <button
            type="button"
            className={`arp-star-all ${soSao === "" ? "active" : ""}`}
            onClick={() => {
              setSoSao("");
              setPage(1);
            }}
          >
            Tất cả sao
          </button>
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              type="button"
              className={`arp-star-btn ${soSao === String(n) ? "active" : ""}`}
              onClick={() => {
                setSoSao(String(n));
                setPage(1);
              }}
              aria-label={`${n} sao`}
            >
              {n} <span className="arp-sym">★</span>
            </button>
          ))}
        </div>
      </form>

      {msg && <div className="arp-msg">{msg}</div>}
      {err && <div className="arp-err">{err}</div>}

      {loading ? (
        <p className="arp-loading">Đang tải...</p>
      ) : (
        <>
          <div className="arp-list">
            {items.map((r) => {
              const vis = isVisibleRow(r);
              const maDon = r.don_hang_id?.ma_don || "";
              const tenSp = r.san_pham_id?.ten_san_pham || "Sản phẩm";
              const pid = typeof r.san_pham_id === "object" ? r.san_pham_id?._id : r.san_pham_id;
              const draftKey = r._id;

              return (
                <article key={r._id} className={`arp-card ${vis ? "" : "arp-card--dim"}`}>
                  <div className="arp-card-head">
                    <div className="arp-avatar">{initials(r.ho_ten)}</div>
                    <div className="arp-card-head-mid">
                      <div className="arp-card-title-row">
                        <span className="arp-name">{r.ho_ten}</span>
                        {vis ? (
                          <span className="arp-badge arp-badge--ok">Hiển thị</span>
                        ) : (
                          <span className="arp-badge arp-badge--muted">Đã ẩn</span>
                        )}
                        {maDon && <span className="arp-badge arp-badge--order">ĐH-{maDon}</span>}
                      </div>
                      <div className="arp-sub">
                        <button
                          type="button"
                          className="arp-link-prod"
                          onClick={() => pid && window.open(`/product/${pid}`, "_blank")}
                        >
                          {tenSp}
                        </button>
                        <span className="arp-time">{formatDt(r.ngay_tao)}</span>
                      </div>
                      <StarRow value={r.so_sao} />
                    </div>
                  </div>
                  <p className="arp-content">{r.noi_dung}</p>

                  <div className="arp-reply-edit">
                    <textarea
                      className="arp-textarea"
                      rows={2}
                      placeholder="Nhập phản hồi (ví dụ: Shop cảm ơn bạn đã tin tưởng...)"
                      value={replyDraft[draftKey] !== undefined ? replyDraft[draftKey] : r.phan_hoi_shop || ""}
                      onChange={(e) =>
                        setReplyDraft((prev) => ({ ...prev, [draftKey]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="arp-btn arp-btn--primary"
                      disabled={busyId === r._id}
                      onClick={() => saveReply(r._id)}
                    >
                      {busyId === r._id ? "..." : "Lưu phản hồi"}
                    </button>
                  </div>

                  <div className="arp-actions">
                    {vis ? (
                      <button
                        type="button"
                        className="arp-btn"
                        disabled={busyId === r._id}
                        onClick={() => patchReview(r._id, { trang_thai: "an" })}
                      >
                        Ẩn
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="arp-btn arp-btn--primary"
                        disabled={busyId === r._id}
                        onClick={() => patchReview(r._id, { trang_thai: "hien_thi" })}
                      >
                        Hiển thị
                      </button>
                    )}
                    <button
                      type="button"
                      className="arp-btn arp-btn--danger"
                      disabled={busyId === r._id}
                      onClick={() => deleteReview(r._id)}
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {items.length === 0 && <p className="arp-empty">Không có đánh giá nào.</p>}

          <div className="arp-pager">
            <span className="arp-pager-info">
              Hiển thị {total === 0 ? 0 : `${start}–${end}`}/{total} đánh giá
            </span>
            <div className="arp-pager-btns">
              <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>
                «
              </button>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹
              </button>
              <span className="arp-pager-cur">
                {page}/{totalPages || 1}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                »
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReviewsPage;
