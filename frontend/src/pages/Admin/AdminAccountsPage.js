import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import { normalizeVnPhone10, MSG_INVALID_VN_PHONE } from "../../utils/vnPhone";
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

function isErrMessage(m) {
  if (!m) return false;
  return (
    m.includes("thất bại") ||
    m.includes("Vui lòng") ||
    m.includes("Không") ||
    m.includes("lỗi") ||
    m.includes("Số điện thoại phải")
  );
}

const emptyAdd = {
  ho_va_ten: "",
  email: "",
  so_dien_thoai: "",
  dia_chi: "",
  mat_khau: "",
  xac_nhan_mat_khau: "",
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
  const [editRoleLabel, setEditRoleLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [listTab, setListTab] = useState("khach_hang");

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
        params: { q: q || undefined, page, limit: 12, vai_tro: listTab },
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
  }, [allowed, q, page, navigate, listTab]);

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
    setEditRoleLabel(VAI_TRO_LABEL[row.vai_tro] || row.vai_tro || "—");
    setEditForm({
      ho_va_ten: row.ho_va_ten || "",
      email: row.email || "",
      so_dien_thoai:
        row.so_dien_thoai && String(row.so_dien_thoai).trim() && row.so_dien_thoai !== "Chưa cập nhật"
          ? String(row.so_dien_thoai).trim()
          : "",
      dia_chi: row.dia_chi || "",
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
    setMsg("");
    const phoneNorm = normalizeVnPhone10(addForm.so_dien_thoai);
    if (!phoneNorm) {
      setMsg(MSG_INVALID_VN_PHONE);
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(
        API,
        {
          ho_va_ten: addForm.ho_va_ten.trim(),
          email: addForm.email.trim(),
          so_dien_thoai: phoneNorm,
          dia_chi: addForm.dia_chi.trim(),
          mat_khau: addForm.mat_khau,
          xac_nhan_mat_khau: addForm.xac_nhan_mat_khau,
        },
        { headers: authHeader() },
      );
      setMsg(res.data.message || "Đã thêm.");
      closeModal();
      setListTab("nhan_vien");
      setPage(1);
    } catch (e) {
      setMsg(e.response?.data?.message || "Thêm nhân viên thất bại");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setMsg("");
    const phoneNorm = normalizeVnPhone10(editForm.so_dien_thoai);
    if (!phoneNorm) {
      setMsg(MSG_INVALID_VN_PHONE);
      return;
    }
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API}/${editId}`,
        {
          ho_va_ten: editForm.ho_va_ten.trim(),
          email: editForm.email.trim(),
          so_dien_thoai: phoneNorm,
          dia_chi: editForm.dia_chi.trim(),
          trang_thai: editForm.trang_thai,
        },
        { headers: authHeader() },
      );
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

  const switchListTab = (tab) => {
    setListTab(tab);
    setPage(1);
    setModal(null);
    setMsg("");
  };

  if (!allowed) return null;

  const bannerErr = msg && isErrMessage(msg);

  return (
    <div className="acp-page">
      <div className="acp-head">
        <div className="acp-head-main">
          <h2 className="acp-title">Quản lý tài khoản</h2>
          <p className="acp-sub">
            Phân tách khách hàng và nhân viên. Thêm nhân viên chỉ ở tab nhân viên; sửa tài khoản không đổi vai trò (vai trò cố định theo loại tài khoản).
          </p>
          <div className="acp-account-tabs">
            <button
              type="button"
              className={`acp-account-tab${listTab === "khach_hang" ? " acp-account-tab--active" : ""}`}
              onClick={() => switchListTab("khach_hang")}
            >
              Danh sách khách hàng
            </button>
            <button
              type="button"
              className={`acp-account-tab${listTab === "nhan_vien" ? " acp-account-tab--active" : ""}`}
              onClick={() => switchListTab("nhan_vien")}
            >
              Danh sách nhân viên
            </button>
          </div>
        </div>
        {listTab === "nhan_vien" && (
          <button type="button" className="acp-btn-add" onClick={openAdd}>
            + Thêm nhân viên
          </button>
        )}
      </div>

      <form className="acp-toolbar" onSubmit={applySearch}>
        <label className="acp-search-label">
          <span>Tìm kiếm (tên, email, SĐT, địa chỉ):</span>
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
                  <th>Số điện thoại</th>
                  <th>Địa chỉ</th>
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
                    <td className="acp-mono">{row.so_dien_thoai || "—"}</td>
                    <td className="acp-ellipsis" title={row.dia_chi || ""}>
                      {row.dia_chi ? (row.dia_chi.length > 40 ? `${row.dia_chi.slice(0, 40)}…` : row.dia_chi) : "—"}
                    </td>
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
              <h3>Thêm nhân viên</h3>
              <button type="button" className="acp-modal-x" onClick={closeModal} aria-label="Đóng">
                ×
              </button>
            </div>
            <form onSubmit={submitAdd} className="acp-modal-body">
              <p className="acp-muted" style={{ marginTop: 0 }}>
                Tài khoản mới sẽ có vai trò <strong>Nhân viên</strong> (đăng nhập khu admin theo quyền nhân viên).
              </p>
              {msg && isErrMessage(msg) && (
                <div className="acp-banner acp-banner--err" role="alert" style={{ marginBottom: "0.75rem" }}>
                  {msg}
                </div>
              )}
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
                <span>Số điện thoại *</span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={addForm.so_dien_thoai}
                  onChange={(e) => setAddForm((f) => ({ ...f, so_dien_thoai: e.target.value }))}
                  className="acp-input"
                  placeholder="VD: 0901234567 hoặc +84901234567"
                />
                <small className="acp-muted">Đúng 10 số Việt Nam, bắt đầu bằng 0.</small>
              </label>
              <label className="acp-field acp-field--full">
                <span>Địa chỉ</span>
                <textarea
                  rows={3}
                  value={addForm.dia_chi}
                  onChange={(e) => setAddForm((f) => ({ ...f, dia_chi: e.target.value }))}
                  className="acp-input"
                  placeholder="Địa chỉ liên hệ (có thể để trống)"
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
              <div className="acp-modal-actions">
                <button type="button" className="acp-btn acp-btn--ghost" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="acp-btn acp-btn--primary" disabled={saving}>
                  {saving ? "Đang lưu..." : "Thêm nhân viên"}
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
              {msg && isErrMessage(msg) && (
                <div className="acp-banner acp-banner--err" role="alert" style={{ marginBottom: "0.75rem" }}>
                  {msg}
                </div>
              )}
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
                <span>Số điện thoại *</span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={editForm.so_dien_thoai}
                  onChange={(e) => setEditForm((f) => ({ ...f, so_dien_thoai: e.target.value }))}
                  className="acp-input"
                  placeholder="VD: 0901234567 hoặc +84901234567"
                />
                <small className="acp-muted">Đúng 10 số Việt Nam, bắt đầu bằng 0.</small>
              </label>
              <label className="acp-field acp-field--full">
                <span>Địa chỉ</span>
                <textarea
                  rows={3}
                  value={editForm.dia_chi}
                  onChange={(e) => setEditForm((f) => ({ ...f, dia_chi: e.target.value }))}
                  className="acp-input"
                  placeholder="Địa chỉ liên hệ / giao hàng (có thể để trống)"
                />
              </label>
              <div className="acp-readonly-field">
                <span>Vai trò</span>
                {editRoleLabel} (không chỉnh được)
              </div>
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
