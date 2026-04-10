import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import "./ProfilePage.css";

const API = `${API_BASE}/api/auth`;

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ho_va_ten: "", so_dien_thoai: "", dia_chi: "" });

  const [showChangePass, setShowChangePass] = useState(false);
  const [passForm, setPassForm] = useState({ mat_khau_cu: "", mat_khau_moi: "", xac_nhan_mat_khau: "" });

  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [passError, setPassError] = useState("");

  const getToken = () => localStorage.getItem("token");

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    fetchProfile(token);
  }, [navigate]);

  const fetchProfile = async (token) => {
    try {
      const res = await axios.get(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setEditForm({
        ho_va_ten: res.data.ho_va_ten || "",
        so_dien_thoai: res.data.so_dien_thoai || "",
        dia_chi: res.data.dia_chi || "",
      });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    setErrorMsg("");
    const { ho_va_ten, so_dien_thoai, dia_chi } = editForm;

    if (!ho_va_ten.trim() || !so_dien_thoai.trim() || !dia_chi.trim()) {
      setErrorMsg("Vui lòng nhập đủ thông tin.");
      return;
    }

    try {
      const res = await axios.put(`${API}/profile`, editForm, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setProfile(res.data.user);
      localStorage.setItem("user", JSON.stringify({
        _id: res.data.user._id,
        ho_va_ten: res.data.user.ho_va_ten,
        email: res.data.user.email,
        vai_tro: res.data.user.vai_tro,
      }));
      setIsEditing(false);
      showToast("Thông tin cá nhân đã được cập nhật thành công!");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Cập nhật thất bại!");
    }
  };

  const handleChangePassword = async () => {
    setPassError("");
    const { mat_khau_cu, mat_khau_moi, xac_nhan_mat_khau } = passForm;

    if (!mat_khau_cu || !mat_khau_moi || !xac_nhan_mat_khau) {
      setPassError("Vui lòng nhập đủ thông tin.");
      return;
    }

    if (mat_khau_moi.length < 6) {
      setPassError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (mat_khau_moi !== xac_nhan_mat_khau) {
      setPassError("Mật khẩu mới không khớp.");
      return;
    }

    try {
      const res = await axios.put(`${API}/change-password`, passForm, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      showToast(res.data.message);
      setPassForm({ mat_khau_cu: "", mat_khau_moi: "", xac_nhan_mat_khau: "" });
      setShowChangePass(false);
    } catch (err) {
      setPassError(err.response?.data?.message || "Đổi mật khẩu thất bại!");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg("");
    if (profile) {
      setEditForm({
        ho_va_ten: profile.ho_va_ten || "",
        so_dien_thoai: profile.so_dien_thoai || "",
        dia_chi: profile.dia_chi || "",
      });
    }
  };

  const handleCancelPass = () => {
    setShowChangePass(false);
    setPassError("");
    setPassForm({ mat_khau_cu: "", mat_khau_moi: "", xac_nhan_mat_khau: "" });
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="profile-loading">Đang tải...</div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      {toast.show && (
        <div className={`profile-toast ${toast.type}`}>
          <i className={`fas ${toast.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="profile-container">
        <h2 className="profile-page-title">Quản lý thông tin cá nhân</h2>

        <div className="profile-content">
          {/* === CỘT TRÁI: THÔNG TIN CÁ NHÂN === */}
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                <i className="fas fa-user"></i>
              </div>
              <div className="profile-avatar-name">{profile?.ho_va_ten}</div>
            </div>

            {!isEditing ? (
              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">HỌ VÀ TÊN</span>
                  <span className="info-value">{profile?.ho_va_ten}</span>
                </div>
                <div className="info-row-inline">
                  <div className="info-col">
                    <span className="info-label">SỐ ĐIỆN THOẠI</span>
                    <span className="info-value">{profile?.so_dien_thoai || "Chưa cập nhật"}</span>
                  </div>
                  <div className="info-col">
                    <span className="info-label">EMAIL</span>
                    <span className="info-value">{profile?.email}</span>
                  </div>
                </div>
                <div className="info-row">
                  <span className="info-label">ĐỊA CHỈ</span>
                  <span className="info-value">{profile?.dia_chi || "Chưa cập nhật"}</span>
                </div>
                <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>
                  <i className="fas fa-cog"></i> Chỉnh sửa thông tin
                </button>
              </div>
            ) : (
              <div className="profile-edit-form">
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    value={editForm.ho_va_ten}
                    onChange={(e) => setEditForm({ ...editForm, ho_va_ten: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    value={editForm.so_dien_thoai}
                    onChange={(e) => setEditForm({ ...editForm, so_dien_thoai: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Địa chỉ</label>
                  <input
                    type="text"
                    value={editForm.dia_chi}
                    onChange={(e) => setEditForm({ ...editForm, dia_chi: e.target.value })}
                  />
                </div>
                {errorMsg && <p className="form-error">{errorMsg}</p>}
                <div className="form-actions">
                  <button className="btn-save" onClick={handleEditSubmit}>Lưu thay đổi</button>
                  <button className="btn-cancel" onClick={handleCancelEdit}>Hủy bỏ</button>
                </div>
              </div>
            )}
          </div>

          {/* === CỘT PHẢI: ĐỔI MẬT KHẨU === */}
          <div className="password-card">
            <h3 className="password-title">
              <i className="fas fa-lock"></i> Thay đổi mật khẩu
            </h3>

            {!showChangePass ? (
              <div className="password-placeholder">
                <p>Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.</p>
                <button className="btn-show-pass-form" onClick={() => setShowChangePass(true)}>
                  Đổi mật khẩu
                </button>
              </div>
            ) : (
              <div className="password-form">
                <div className="form-group">
                  <label>Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={passForm.mat_khau_cu}
                    onChange={(e) => setPassForm({ ...passForm, mat_khau_cu: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu mới</label>
                  <input
                    type="password"
                    value={passForm.mat_khau_moi}
                    onChange={(e) => setPassForm({ ...passForm, mat_khau_moi: e.target.value })}
                    placeholder="••••••••"
                  />
                  <small className="form-hint">* Ít nhất 6 ký tự</small>
                </div>
                <div className="form-group">
                  <label>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={passForm.xac_nhan_mat_khau}
                    onChange={(e) => setPassForm({ ...passForm, xac_nhan_mat_khau: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                {passError && <p className="form-error">{passError}</p>}
                <div className="form-actions">
                  <button className="btn-confirm-pass" onClick={handleChangePassword}>
                    Xác nhận thay đổi
                  </button>
                  <button className="btn-cancel-pass" onClick={handleCancelPass}>
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default ProfilePage;
