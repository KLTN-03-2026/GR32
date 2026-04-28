import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config";
import "./AdminCategoriesPage.css";

const API = `${API_BASE}/api/admin/categories`;

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

const emptyForm = {
  ten_danh_muc: "",
  slug: "",
  mo_ta: "",
  trang_thai: "hoat_dong",
};

const AdminCategoriesPage = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [meta, setMeta] = useState({ ma_danh_muc: "", ngay_tao: "", so_san_pham: 0 });
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API, {
        headers: authHeader(),
        params: {
          q: q || undefined,
          trang_thai: trangThai || undefined,
          page,
          limit: 12,
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
  }, [q, trangThai, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const openAdd = () => {
    setMsg("");
    setEditId(null);
    setForm({ ...emptyForm });
    setMeta({ ma_danh_muc: "(Tự sinh)", ngay_tao: new Date().toISOString(), so_san_pham: 0 });
    setModal("add");
  };

  const openEdit = async (row) => {
    setMsg("");
    setEditId(row._id);
    setForm({
      ten_danh_muc: row.ten_danh_muc || "",
      slug: row.slug || "",
      mo_ta: row.mo_ta || "",
      trang_thai: row.trang_thai || "hoat_dong",
    });
    setMeta({
      ma_danh_muc: row.ma_danh_muc || "",
      ngay_tao: row.ngay_tao,
      so_san_pham: row.so_san_pham ?? 0,
    });
    setModal("edit");
    try {
      const res = await axios.get(`${API}/${row._id}`, { headers: authHeader() });
      setMeta((m) => ({
        ...m,
        so_san_pham: res.data.so_san_pham ?? m.so_san_pham,
        ngay_tao: res.data.ngay_tao || m.ngay_tao,
      }));
    } catch {
      /* giữ từ bảng */
    }
  };

  const closeModal = () => {
    setModal(null);
    setSaving(false);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const body = {
      ten_danh_muc: form.ten_danh_muc.trim(),
      mo_ta: form.mo_ta.trim(),
      trang_thai: form.trang_thai,
    };
    const slugTrim = form.slug.trim();
    if (slugTrim) body.slug = slugTrim;
    try {
      if (editId) {
        const res = await axios.patch(`${API}/${editId}`, body, { headers: authHeader() });
        setMsg(res.data.message || "Đã lưu.");
      } else {
        const res = await axios.post(API, body, { headers: authHeader() });
        setMsg(res.data.message || "Đã thêm.");
      }
      closeModal();
      await fetchList();
    } catch (e) {
      const m = e.response?.data?.message;
      setMsg(m || "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  };

  const repairTree = async () => {
    const ok = window.confirm(
      "Gán lại cha cho các danh mục con chuẩn (Nam/Nữ/Phụ kiện): ví dụ Giày dép → Phụ kiện, không nằm dưới Quần. Tiếp tục?",
    );
    if (!ok) return;
    setMsg("");
    try {
      const res = await axios.post(`${API}/repair-tree`, {}, { headers: authHeader() });
      const parts = [res.data.message];
      if (res.data.updates?.length) parts.push(`Đã sửa: ${res.data.updates.join("; ")}`);
      if (res.data.skipped?.length) {
        parts.push(
          `Bỏ qua: ${res.data.skipped.map((s) => (typeof s === "string" ? s : JSON.stringify(s))).join("; ")}`,
        );
      }
      setMsg(parts.join(" "));
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Không chạy được sửa cây danh mục.");
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm("Bạn có chắc chắn muốn xóa danh mục khỏi hệ thống?");
    if (!ok) return;
    setMsg("");
    try {
      await axios.delete(`${API}/${row._id}`, { headers: authHeader() });
      setMsg("Đã xóa danh mục.");
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Không xóa được.");
    }
  };

  return (
    <div className="acp-page">
      <div className="acp-head">
        <div>
          <h2 className="acp-title">Quản lý danh mục</h2>
          <p className="acp-sub">
            Thêm, sửa, xóa danh mục. Cây trên trang sản phẩm lấy theo <strong>parent_id</strong> — nếu con bị gán nhầm cha
            (vd. Giày dép dưới Quần), bấm <strong>Sửa cây chuẩn</strong> sau khi đã có 3 danh mục gốc Nam/Nữ/Phụ kiện
            (slug <code>thoi-trang-nam</code>, <code>thoi-trang-nu</code>, <code>phu-kien</code>).
          </p>
        </div>
        <div className="acp-head-actions">
          <button type="button" className="acp-btn acp-btn--outline" onClick={repairTree}>
            Sửa cây chuẩn (Nam / Nữ / Phụ kiện)
          </button>
          <button type="button" className="acp-btn-add" onClick={openAdd}>
            + Thêm danh mục
          </button>
        </div>
      </div>

      <form className="acp-toolbar" onSubmit={applySearch}>
        <label className="acp-search-label">
          <span>Tìm kiếm (Mã DM, Tên DM):</span>
          <div className="acp-search-row">
            <input
              type="search"
              className="acp-input"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Nhập từ khóa..."
            />
            <button type="submit" className="acp-btn acp-btn--dark">
              Tìm
            </button>
          </div>
        </label>
        <label className="acp-filter-label">
          <span>Lọc theo trạng thái:</span>
          <select
            className="acp-select"
            value={trangThai}
            onChange={(e) => {
              setTrangThai(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="hoat_dong">Hoạt động</option>
            <option value="ngung_hoat_dong">Ngừng hoạt động</option>
          </select>
        </label>
      </form>

      {msg && (
        <div
          className={`acp-banner ${msg.includes("Không") || msg.includes("lỗi") || msg.includes("thất bại") ? "acp-banner--err" : "acp-banner--ok"}`}
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
                  <th>#</th>
                  <th>Mã danh mục</th>
                  <th>Tên danh mục</th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th>Số SP</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={row._id}>
                    <td>{(page - 1) * 12 + i + 1}</td>
                    <td className="acp-mono">{row.ma_danh_muc}</td>
                    <td>{row.ten_danh_muc}</td>
                    <td className="acp-mono acp-slug">{row.slug}</td>
                    <td className="acp-desc" title={row.mo_ta}>
                      {row.mo_ta}
                    </td>
                    <td>{row.so_san_pham ?? 0}</td>
                    <td>
                      {row.trang_thai === "hoat_dong" ? (
                        <span className="acp-pill acp-pill--ok">Hoạt động</span>
                      ) : (
                        <span className="acp-pill acp-pill--off">Ngừng hoạt động</span>
                      )}
                    </td>
                    <td>
                      <div className="acp-row-actions">
                        <button type="button" className="acp-btn acp-btn--edit" onClick={() => openEdit(row)}>
                          Sửa
                        </button>
                        <button type="button" className="acp-btn acp-btn--del" onClick={() => handleDelete(row)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <p className="acp-muted">Không có danh mục phù hợp.</p>}
          {totalPages > 1 && (
            <div className="acp-pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trước
              </button>
              <span>
                Trang {page}/{totalPages} ({total} mục)
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="acp-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="acp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="acp-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="acp-modal-head">
              <h3 id="acp-modal-title">{modal === "add" ? "Thêm danh mục" : "Chỉnh sửa danh mục"}</h3>
              <button type="button" className="acp-modal-x" onClick={closeModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <form onSubmit={submitForm} className="acp-modal-body">
              <div className="acp-grid2">
                <label className="acp-field">
                  <span>Mã danh mục</span>
                  <input type="text" readOnly value={meta.ma_danh_muc} className="acp-input acp-input--ro" />
                </label>
                <label className="acp-field">
                  <span>Ngày</span>
                  <input type="text" readOnly value={formatDate(meta.ngay_tao)} className="acp-input acp-input--ro" />
                </label>
                <label className="acp-field">
                  <span>Tên danh mục *</span>
                  <input
                    required
                    value={form.ten_danh_muc}
                    onChange={(e) => setForm((f) => ({ ...f, ten_danh_muc: e.target.value }))}
                    placeholder="VD: Giày nam"
                  />
                </label>
                <label className="acp-field">
                  <span>Số sản phẩm</span>
                  <input type="text" readOnly value={String(meta.so_san_pham)} className="acp-input acp-input--ro" />
                </label>
              </div>
              <label className="acp-field acp-field--full">
                <span>Slug (URL) — để trống để hệ thống tự tạo</span>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="VD: giay-nam"
                  className="acp-input"
                />
              </label>
              <label className="acp-field acp-field--full">
                <span>Trạng thái</span>
                <select
                  value={form.trang_thai}
                  onChange={(e) => setForm((f) => ({ ...f, trang_thai: e.target.value }))}
                  className="acp-select acp-select--block"
                >
                  <option value="hoat_dong">Hoạt động</option>
                  <option value="ngung_hoat_dong">Ngừng hoạt động</option>
                </select>
              </label>
              <label className="acp-field acp-field--full">
                <span>Mô tả *</span>
                <textarea
                  required
                  rows={4}
                  value={form.mo_ta}
                  onChange={(e) => setForm((f) => ({ ...f, mo_ta: e.target.value }))}
                  placeholder="Mô tả danh mục..."
                />
              </label>
              <div className="acp-modal-actions">
                <button type="button" className="acp-btn acp-btn--ghost" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="acp-btn acp-btn--primary" disabled={saving}>
                  {saving ? "Đang lưu..." : modal === "add" ? "Thêm danh mục" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesPage;
