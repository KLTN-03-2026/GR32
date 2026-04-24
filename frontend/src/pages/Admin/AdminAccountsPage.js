import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import "./AdminCategoriesPage.css";

const API = `${API_BASE}/api/admin/users`;

const VAI_TRO_LABEL = {
  admin: "Admin",
  nhan_vien: "Nhân viên",
  khach_hang: "Khách hàng",
};

const TRANG_THAI_LABEL = {
  hoat_dong: "Hoạt động",
  vo_hieu: "Vô hiệu hóa",
};

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function currentUserId() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")._id || null;
  } catch {
    return null;
  }
}

const emptyAdd = {
  ho_va_ten: "",
  email: "",
  mat_khau: "",
  xac_nhan_mat_khau: "",
  vai_tro: "khach_hang",
};

const AdminAccountsPage = () => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [modal, setModal] = useState(null);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [editForm, setEditForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const selfId = useMemo(() => currentUserId(), []);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.vai_tro !== "admin") {
        navigate("/admin-dashboard", { replace: true });
        return;
      }
      setAllowed(true);
    } catch {
      navigate("/admin-dashboard", { replace: true });
    }
  }, [navigate]);

  const fetchList = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API, {
        headers: authHeader(),
        params: { q: q || undefined, page, limit: 12 },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      if (e.response?.status === 403) {
        setErr("Bạn không có quyền truy cập.");
        navigate("/admin-dashboard", { replace: true });
      } else {
        setErr(e.response?.data?.message || "Không tải được danh sách.");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [allowed, q, page, navigate]);

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
    setErr("");
    setAddForm({ ...emptyAdd });
    setModal("add");
  };

  const openEdit = (row) => {
    setMsg("");
    setErr("");
    setEditId(row._id);
    setEditForm({
      ho_va_ten: row.ho_va_ten || "",
      email: row.email || "",
      vai_tro: row.vai_tro || "khach_hang",
      trang_thai: row.trang_thai === "vo_hieu" ? "vo_hieu" : "hoat_dong",
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setSaving(false);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await axios.post(
        API,
        {
          ho_va_ten: addForm.ho_va_ten.trim(),
          email: addForm.email.trim(),
          mat_khau: addForm.mat_khau,
          xac_nhan_mat_khau: addForm.xac_nhan_mat_khau,
          vai_tro: addForm.vai_tro,
        },
        { headers: authHeader() },
      );
      setMsg(res.data.message || "Đã thêm.");
      closeModal();
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Thêm tài khoản thất bại");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await axios.patch(`${API}/${editId}`, editForm, { headers: authHeader() });
      setMsg(res.data.message || "Đã cập nhật.");
      closeModal();
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Vui lòng kiểm tra lại thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (row.vai_tro === "admin") {
      window.alert("Bạn không thể xóa tài khoản Admin");
      return;
    }
    const ok = window.confirm("Bạn có chắc chắn muốn xóa tài khoản ra khỏi hệ thống?");
    if (!ok) return;
    setMsg("");
    try {
      await axios.delete(`${API}/${row._id}`, { headers: authHeader() });
      setMsg("Đã xóa tài khoản.");
      await fetchList();
    } catch (e) {
      setMsg(e.response?.data?.message || "Không xóa được.");
    }
  };

  const isSelf = (id) => selfId && String(id) === String(selfId);

  if (!allowed) return null;

  const bannerErr =
    msg &&
    (msg.includes("thất bại") ||
      msg.includes("Vui lòng") ||
      msg.includes("Không") ||
      msg.includes("lỗi"));

  return (
    <div className="acp-page">
      <div className="acp-head">
        <div>
          <h2 className="acp-title">Quản lý tài khoản</h2>
          <p className="acp-sub">Chỉ Admin: danh sách, thêm, sửa, xóa tài khoản (không xóa vai trò Admin).</p>
        </div>
        <button type="button" className="acp-btn-add" onClick={openAdd}>
          + Thêm tài khoản
        </button>
      </div>

      <form className="acp-toolbar" onSubmit={applySearch}>
        <label className="acp-search-label">
          <span>Tìm kiếm tài khoản (tên, email):</span>
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
      </form>

      {msg && (
        <div className={`acp-banner ${bannerErr ? "acp-banner--err" : "acp-banner--ok"}`}>{msg}</div>
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
                  <th>Tên tài khoản</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={row._id}>
                    <td>{(page - 1) * 12 + i + 1}</td>
                    <td>{row.ho_va_ten}</td>
                    <td className="acp-mono">{row.email}</td>
                    <td>{VAI_TRO_LABEL[row.vai_tro] || row.vai_tro}</td>
                    <td>
                      {row.trang_thai === "vo_hieu" ? (
                        <span className="acp-pill acp-pill--off">{TRANG_THAI_LABEL.vo_hieu}</span>
                      ) : (
                        <span className="acp-pill acp-pill--ok">{TRANG_THAI_LABEL.hoat_dong}</span>
                      )}
                    </td>
                    <td>
                      <div className="acp-row-actions">
                        <button type="button" className="acp-btn acp-btn--edit" onClick={() => openEdit(row)}>
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="acp-btn acp-btn--del"
                          disabled={row.vai_tro === "admin"}
                          onClick={() => handleDelete(row)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <p className="acp-muted">Không có tài khoản phù hợp.</p>}
          {totalPages > 1 && (
            <div className="acp-pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trước
              </button>
              <span>
                Trang {page}/{totalPages} ({total} tài khoản)
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {modal === "add" && (
        <div className="acp-modal-overlay" role="presentation" onClick={closeModal}>
          <div className="acp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="acp-modal-head">
              <h3>Thêm tài khoản mới</h3>
              <button type="button" className="acp-modal-x" onClick={closeModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <form onSubmit={submitAdd} className="acp-modal-body">
              <label className="acp-field acp-field--full">
                <span>Tên tài khoản *</span>
                <input
                  required
                  value={addForm.ho_va_ten}
                  onChange={(e) => setAddForm((f) => ({ ...f, ho_va_ten: e.target.value }))}
                  className="acp-input"
                />
              </label>
              <label className="acp-field acp-field--full">
                <span>Email *</span>
                <input
                  required
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  className="acp-input"
                />
              </label>
              <label className="acp-field acp-field--full">
                <span>Mật khẩu * (tối thiểu 6 ký tự)</span>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={addForm.mat_khau}
                  onChange={(e) => setAddForm((f) => ({ ...f, mat_khau: e.target.value }))}
                  className="acp-input"
                />
              </label>
              <label className="acp-field acp-field--full">
                <span>Nhập lại mật khẩu *</span>
                <input
                  required
                  type="password"
                  value={addForm.xac_nhan_mat_khau}
                  onChange={(e) => setAddForm((f) => ({ ...f, xac_nhan_mat_khau: e.target.value }))}
                  className="acp-input"
                />
              </label>
              <label className="acp-field acp-field--full">
                <span>Vai trò</span>
                <select
                  className="acp-select acp-select--block"
                  value={addForm.vai_tro}
                  onChange={(e) => setAddForm((f) => ({ ...f, vai_tro: e.target.value }))}
                >
                  <option value="khach_hang">Khách hàng</option>
                  <option value="nhan_vien">Nhân viên</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="acp-modal-actions">
                <button type="button" className="acp-btn acp-btn--ghost" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="acp-btn acp-btn--primary" disabled={saving}>
                  {saving ? "Đang lưu..." : "Thêm tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "edit" && editForm && (
        <div className="acp-modal-overlay" role="presentation" onClick={closeModal}>
          <div className="acp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="acp-modal-head">
              <h3>Chỉnh sửa tài khoản</h3>
              <button type="button" className="acp-modal-x" onClick={closeModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <form onSubmit={submitEdit} className="acp-modal-body">
              <label className="acp-field acp-field--full">
                <span>Tên tài khoản *</span>
                <input
                  required
                  value={editForm.ho_va_ten}
                  onChange={(e) => setEditForm((f) => ({ ...f, ho_va_ten: e.target.value }))}
                  className="acp-input"
                />
              </label>
              <label className="acp-field acp-field--full">
                <span>Email *</span>
                <input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="acp-input"
                />
              </label>
              <label className="acp-field acp-field--full">
                <span>Vai trò</span>
                <select
                  className="acp-select acp-select--block"
                  value={editForm.vai_tro}
                  disabled={isSelf(editId)}
                  onChange={(e) => setEditForm((f) => ({ ...f, vai_tro: e.target.value }))}
                >
                  <option value="khach_hang">Khách hàng</option>
                  <option value="nhan_vien">Nhân viên</option>
                  <option value="admin">Admin</option>
                </select>
                {isSelf(editId) && (
                  <small className="acp-muted">Không đổi vai trò của chính bạn tại đây.</small>
                )}
              </label>
              <label className="acp-field acp-field--full">
                <span>Trạng thái</span>
                <select
                  className="acp-select acp-select--block"
                  value={editForm.trang_thai}
                  disabled={isSelf(editId)}
                  onChange={(e) => setEditForm((f) => ({ ...f, trang_thai: e.target.value }))}
                >
                  <option value="hoat_dong">{TRANG_THAI_LABEL.hoat_dong}</option>
                  <option value="vo_hieu">{TRANG_THAI_LABEL.vo_hieu}</option>
                </select>
                {isSelf(editId) && (
                  <small className="acp-muted">Không vô hiệu chính tài khoản đang đăng nhập.</small>
                )}
              </label>
              <div className="acp-modal-actions">
                <button type="button" className="acp-btn acp-btn--ghost" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="acp-btn acp-btn--primary" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccountsPage;
