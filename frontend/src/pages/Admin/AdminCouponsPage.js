import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config";
import "./AdminCategoriesPage.css";
import "./AdminCouponsPage.css";

const API = `${API_BASE}/api/admin/coupons`;
const API_CATEGORIES = `${API_BASE}/api/categories`;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function formatPrice(v) {
  if (v == null || Number.isNaN(Number(v))) return "0";
  return Number(v).toLocaleString("vi-VN");
}

function toDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function defaultEndDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

function emptyForm() {
  const s = new Date().toISOString().slice(0, 10);
  return {
    ma: "",
    mo_ta: "",
    loai: "tien_mat",
    gia_tri: "",
    don_toi_thieu: "",
    so_luong: "100",
    ngay_bat_dau: s,
    ngay_ket_thuc: defaultEndDate(),
    hien_thi: true,
    danh_muc_ap_dung: [],
  };
}

function tinhTrangLabel(tt) {
  if (tt === "con_han") return { text: "Còn hạn", cls: "coup-pill coup-pill--ok" };
  if (tt === "het_han") return { text: "Hết hạn", cls: "coup-pill coup-pill--off" };
  if (tt === "het_so_luong") return { text: "Hết số lượng", cls: "coup-pill coup-pill--warn" };
  if (tt === "chua_hieu_luc") return { text: "Chưa hiệu lực", cls: "coup-pill coup-pill--muted" };
  return { text: tt || "—", cls: "coup-pill coup-pill--off" };
}

function formatLoai(loai) {
  return loai === "phan_tram" ? "Giảm theo %" : "Giảm trực tiếp";
}

function formatGiaTri(loai, giaTri) {
  if (loai === "phan_tram") return `${formatPrice(giaTri)}%`;
  return `${formatPrice(giaTri)}đ`;
}

function CouponPreview({ form }) {
  const code = (form.ma || "MÃ").trim().toUpperCase() || "MÃ";
  const min = Number(form.don_toi_thieu) || 0;
  const loai = form.loai === "phan_tram" ? "phan_tram" : "tien_mat";
  const val = Number(form.gia_tri);
  let main = "—";
  if (!Number.isNaN(val) && val >= 0) {
    main = loai === "phan_tram" ? `GIẢM ${formatPrice(val)}%` : `GIẢM ${formatPrice(val)}đ`;
  }
  const end = form.ngay_ket_thuc
    ? new Date(form.ngay_ket_thuc + "T12:00:00").toLocaleDateString("vi-VN")
    : "—";

  return (
    <div className="coup-preview-wrap">
      <h4 className="coup-preview-title">Xem trước coupon</h4>
      <div className="coup-preview-card">
        <div className="coup-preview-left">{code}</div>
        <div className="coup-preview-right">
          <strong>{main}</strong>
          <div className="coup-preview-meta">Đơn từ {formatPrice(min)}đ</div>
          <div className="coup-preview-meta">Mã {code}</div>
          <div className="coup-preview-meta">HSD: {end}</div>
        </div>
      </div>
      <div className="coup-preview-sim">
        <span className="coup-preview-dot" aria-hidden />
        Trạng thái mô phỏng: {form.hien_thi ? "Hiển thị (khách có thể thấy)" : "Ẩn"}
      </div>
    </div>
  );
}

const AdminCouponsPage = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [metaUsed, setMetaUsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API, {
        headers: authHeader(),
        params: {
          q: q || undefined,
          loc: loc || undefined,
          page,
          limit,
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
  }, [q, loc, page, limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(API_CATEGORIES);
        setCategories(res.data || []);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const openAdd = () => {
    setMsg("");
    setEditId(null);
    setMetaUsed(0);
    setForm(emptyForm());
    setModal("form");
  };

  const openEdit = (row) => {
    setMsg("");
    setEditId(row._id);
    setMetaUsed(row.da_su_dung ?? 0);
    setForm({
      ma: row.ma || "",
      mo_ta: row.mo_ta || "",
      loai: row.loai === "phan_tram" ? "phan_tram" : "tien_mat",
      gia_tri: String(row.gia_tri ?? ""),
      don_toi_thieu: String(row.don_toi_thieu ?? ""),
      so_luong: String(row.so_luong ?? ""),
      ngay_bat_dau: toDateInput(row.ngay_bat_dau),
      ngay_ket_thuc: toDateInput(row.ngay_ket_thuc),
      hien_thi: Boolean(row.hien_thi),
      danh_muc_ap_dung: Array.isArray(row.danh_muc_ap_dung) ? [...row.danh_muc_ap_dung] : [],
    });
    setModal("form");
  };

  const closeModal = () => {
    setModal(null);
    setSaving(false);
    setDeleteTarget(null);
  };

  const toggleCategory = (ten) => {
    setForm((f) => {
      const set = new Set(f.danh_muc_ap_dung);
      if (set.has(ten)) set.delete(ten);
      else set.add(ten);
      return { ...f, danh_muc_ap_dung: [...set] };
    });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const body = {
      ma: form.ma.trim().toUpperCase(),
      mo_ta: form.mo_ta.trim(),
      loai: form.loai,
      gia_tri: Number(form.gia_tri),
      don_toi_thieu: Number(form.don_toi_thieu) || 0,
      so_luong: parseInt(form.so_luong, 10),
      ngay_bat_dau: form.ngay_bat_dau,
      ngay_ket_thuc: form.ngay_ket_thuc,
      hien_thi: form.hien_thi,
      danh_muc_ap_dung: form.danh_muc_ap_dung,
    };
    try {
      if (editId) {
        const res = await axios.patch(`${API}/${editId}`, body, { headers: authHeader() });
        setMsg(res.data.message || "Đã lưu.");
      } else {
        const res = await axios.post(API, body, { headers: authHeader() });
        setMsg(res.data.message || "Đã tạo.");
      }
      closeModal();
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Có lỗi xảy ra.");
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setMsg("");
    try {
      await axios.delete(`${API}/${deleteTarget._id}`, { headers: authHeader() });
      setMsg("Đã xóa mã.");
      closeModal();
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Không xóa được.");
    } finally {
      setSaving(false);
    }
  };

  const toggleHienThi = async (row) => {
    setErr("");
    try {
      await axios.patch(`${API}/${row._id}`, { hien_thi: !row.hien_thi }, { headers: authHeader() });
      await fetchList();
    } catch (e) {
      setErr(e.response?.data?.message || "Không cập nhật được trạng thái.");
    }
  };

  const rangeText = (a, b) => {
    const x = a ? new Date(a).toLocaleDateString("vi-VN") : "—";
    const y = b ? new Date(b).toLocaleDateString("vi-VN") : "—";
    return `${x} → ${y}`;
  };

  const showingFrom = useMemo(() => {
    if (!total) return 0;
    return (page - 1) * limit + 1;
  }, [page, limit, total]);

  const showingTo = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  return (
    <div className="acp-page coup-page">
      <div className="acp-head">
        <div>
          <h2 className="acp-title">Quản lý mã giảm giá</h2>
          <p className="acp-sub">Thêm, sửa, xóa mã coupon — Admin / Nhân viên.</p>
        </div>
        <button type="button" className="acp-btn-add" onClick={openAdd}>
          + Thêm mã giảm giá
        </button>
      </div>

      <form className="acp-toolbar" onSubmit={applySearch}>
        <label className="acp-search-label">
          <span>Tìm theo mã hoặc mô tả:</span>
          <div className="acp-search-row">
            <input
              type="search"
              className="acp-input"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="VD: APR20..."
            />
            <button type="submit" className="acp-btn acp-btn--dark">
              Tìm
            </button>
          </div>
        </label>
        <label className="acp-filter-label">
          <span>Tình trạng sử dụng:</span>
          <select
            className="acp-select"
            value={loc}
            onChange={(e) => {
              setLoc(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="con_han">Còn hạn</option>
            <option value="het_han">Hết hạn</option>
            <option value="het_so_luong">Hết số lượng</option>
          </select>
        </label>
      </form>

      {msg && (
        <div
          className={`acp-banner ${msg.includes("Không") || msg.includes("lỗi") ? "acp-banner--err" : "acp-banner--ok"}`}
        >
          {msg}
        </div>
      )}
      {err && <div className="acp-banner acp-banner--err">{err}</div>}

      {loading ? (
        <p className="acp-muted">Đang tải...</p>
      ) : (
        <>
          <div className="acp-table-wrap">
            <table className="acp-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Loại</th>
                  <th>Giá trị</th>
                  <th>Sử dụng</th>
                  <th>Thời gian</th>
                  <th>Tình trạng</th>
                  <th>Hiển thị</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const tt = tinhTrangLabel(row.tinh_trang);
                  const used = row.da_su_dung ?? 0;
                  const cap = Math.max(1, row.so_luong ?? 1);
                  const pct = Math.min(100, Math.round((used / cap) * 100));
                  return (
                    <tr key={row._id}>
                      <td className="acp-mono">{row.ma}</td>
                      <td>{formatLoai(row.loai)}</td>
                      <td>{formatGiaTri(row.loai, row.gia_tri)}</td>
                      <td className="coup-usage-cell">
                        <div className="coup-usage-bar">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <div className="coup-usage-txt">
                          {used}/{cap} mã
                        </div>
                      </td>
                      <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                        {rangeText(row.ngay_bat_dau, row.ngay_ket_thuc)}
                      </td>
                      <td>
                        <span className={tt.cls}>{tt.text}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`coup-toggle ${row.hien_thi ? "coup-toggle--on" : "coup-toggle--off"}`}
                          onClick={() => toggleHienThi(row)}
                        >
                          {row.hien_thi ? "Hiển thị" : "Ẩn"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="coup-icon-btn"
                          title="Sửa"
                          onClick={() => openEdit(row)}
                        >
                          <i className="fas fa-pen" />
                        </button>
                        <button
                          type="button"
                          className="coup-icon-btn coup-icon-del"
                          title="Xóa"
                          onClick={() => {
                            setDeleteTarget(row);
                            setModal("delete");
                          }}
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <p className="acp-muted">Không có mã phù hợp.</p>}
          <div className="coup-summary-foot">
            <span>
              Hiển thị {showingFrom}-{showingTo} trên tổng số {total} mã coupon
            </span>
            {totalPages > 1 && (
              <div className="acp-pager" style={{ margin: 0 }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Trước
                </button>
                <span>
                  Trang {page}/{totalPages}
                </span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Sau
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {modal === "form" && (
        <div className="acp-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="acp-modal coup-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coup-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="acp-modal-head">
              <h3 id="coup-modal-title">{editId ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}</h3>
              <button type="button" className="acp-modal-x" onClick={closeModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <form onSubmit={submitForm} className="acp-modal-body">
              <div className="coup-modal-split">
                <div>
                  <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 14 }}>Thiết lập mã Coupon</p>
                  {editId != null && (
                    <p className="acp-muted" style={{ marginTop: -6, marginBottom: 12 }}>
                      Đã dùng: {metaUsed} — chỉnh sửa sẽ cập nhật lại tình trạng hiển thị.
                    </p>
                  )}
                  <div className="acp-grid2">
                    <label className="acp-field acp-field--full">
                      <span>Tên mã coupon *</span>
                      <input
                        required
                        className="acp-input"
                        value={form.ma}
                        onChange={(e) => setForm((f) => ({ ...f, ma: e.target.value }))}
                        placeholder="VD: SUMMER2024"
                      />
                    </label>
                    <label className="acp-field acp-field--full">
                      <span>Mô tả ngắn *</span>
                      <textarea
                        required
                        rows={2}
                        value={form.mo_ta}
                        onChange={(e) => setForm((f) => ({ ...f, mo_ta: e.target.value }))}
                        placeholder="Mục đích / điều kiện áp dụng..."
                      />
                    </label>
                  </div>
                  <label className="acp-field acp-field--full">
                    <span>Áp dụng cho danh mục (để trống = tất cả sản phẩm trong giỏ)</span>
                    <div className="coup-cat-grid">
                      {categories.map((c) => (
                        <label key={c._id || c.slug}>
                          <input
                            type="checkbox"
                            checked={form.danh_muc_ap_dung.includes(c.ten_danh_muc)}
                            onChange={() => toggleCategory(c.ten_danh_muc)}
                          />
                          {c.ten_danh_muc}
                        </label>
                      ))}
                    </div>
                  </label>
                  <label className="acp-field acp-field--full">
                    <span>Loại giảm giá</span>
                    <div className="coup-type-row">
                      <button
                        type="button"
                        className={`coup-type-btn ${form.loai === "phan_tram" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, loai: "phan_tram" }))}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        className={`coup-type-btn ${form.loai === "tien_mat" ? "active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, loai: "tien_mat" }))}
                      >
                        ₫
                      </button>
                    </div>
                  </label>
                  <div className="acp-grid2">
                    <label className="acp-field">
                      <span>Giá trị giảm *</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        className="acp-input"
                        value={form.gia_tri}
                        onChange={(e) => setForm((f) => ({ ...f, gia_tri: e.target.value }))}
                      />
                    </label>
                    <label className="acp-field">
                      <span>Đơn tối thiểu (đ)</span>
                      <input
                        type="number"
                        min="0"
                        className="acp-input"
                        value={form.don_toi_thieu}
                        onChange={(e) => setForm((f) => ({ ...f, don_toi_thieu: e.target.value }))}
                      />
                    </label>
                    <label className="acp-field">
                      <span>Số lượng phát hành *</span>
                      <input
                        required
                        type="number"
                        min="1"
                        className="acp-input"
                        value={form.so_luong}
                        onChange={(e) => setForm((f) => ({ ...f, so_luong: e.target.value }))}
                      />
                    </label>
                    <label className="acp-field">
                      <span>Ngày bắt đầu *</span>
                      <input
                        required
                        type="date"
                        className="acp-input"
                        value={form.ngay_bat_dau}
                        onChange={(e) => setForm((f) => ({ ...f, ngay_bat_dau: e.target.value }))}
                      />
                    </label>
                    <label className="acp-field">
                      <span>Ngày kết thúc *</span>
                      <input
                        required
                        type="date"
                        className="acp-input"
                        value={form.ngay_ket_thuc}
                        onChange={(e) => setForm((f) => ({ ...f, ngay_ket_thuc: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="acp-field acp-field--full coup-switch-row">
                    <input
                      type="checkbox"
                      checked={form.hien_thi}
                      onChange={(e) => setForm((f) => ({ ...f, hien_thi: e.target.checked }))}
                    />
                    <span>Hiển thị trên cửa hàng (khách áp dụng được khi bật)</span>
                  </label>
                </div>
                <CouponPreview form={form} />
              </div>
              <div className="acp-modal-actions">
                <button type="button" className="acp-btn acp-btn--ghost" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="acp-btn acp-btn--primary" disabled={saving}>
                  {saving ? "Đang lưu..." : editId ? "Lưu mã giảm giá" : "Tạo mã giảm giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "delete" && deleteTarget && (
        <div className="acp-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="acp-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="acp-modal-head">
              <h3>Xóa mã giảm giá</h3>
              <button type="button" className="acp-modal-x" onClick={closeModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <div className="acp-modal-body">
              <p>
                Bạn có chắc muốn xóa mã <strong>{deleteTarget.ma}</strong>? Thao tác không hoàn tác.
              </p>
              <div className="acp-modal-actions">
                <button type="button" className="acp-btn acp-btn--ghost" onClick={closeModal}>
                  Hủy
                </button>
                <button type="button" className="acp-btn acp-btn--del" disabled={saving} onClick={confirmDelete}>
                  {saving ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsPage;
