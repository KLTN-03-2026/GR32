import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import "./Register.css";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ho_va_ten: "",
    email: "",
    gioi_tinh: "",
    so_dien_thoai: "",
    mat_khau: "",
    nhap_lai_mat_khau: "",
  });

  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (formData.mat_khau.length < 6) {
      setMsg("Mật khẩu phải có ít nhất 6 ký tự!");
      setIsErr(true);
      return;
    }

    if (formData.mat_khau !== formData.nhap_lai_mat_khau) {
      setMsg("Mật khẩu nhập lại không khớp!");
      setIsErr(true);
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/register`,
        formData,
      );
      setMsg(res.data.message);
      setIsErr(false);
    } catch (err) {
      setMsg(err.response?.data?.message || "Lỗi đăng ký!");
      setIsErr(true);
    }
  };

  return (
    <div className="register-wrapper">
      {/* Header NO NAME góc trên bên trái */}
      <div
        className="no-name-header"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <strong>NO NAME</strong> <span>Đăng ký</span>
      </div>

      <div className="register-container">
        <form className="register-card" onSubmit={handleSubmit}>
          {/* KHỐI TIÊU ĐỀ CÓ NÚT QUAY LẠI CHUẨN UX */}
          <div className="card-header-actions">
            <Link to="/" className="back-home-btn" title="Về trang chủ">
              ←
            </Link>
            <h2>Đăng ký</h2>
          </div>

          <span className="note-text">* Trường thông tin bắt buộc</span>

          <div className="input-group">
            <input
              type="text"
              placeholder="Họ và tên*"
              required
              onChange={(e) =>
                setFormData({ ...formData, ho_va_ten: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <input
              type="email"
              placeholder="Email*"
              required
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <select
              required
              onChange={(e) =>
                setFormData({ ...formData, gioi_tinh: e.target.value })
              }
            >
              <option value="">Chọn giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>

          <div className="input-group">
            <input
              type="text"
              placeholder="Số điện thoại*"
              required
              onChange={(e) =>
                setFormData({ ...formData, so_dien_thoai: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Mật khẩu*"
              required
              onChange={(e) =>
                setFormData({ ...formData, mat_khau: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Nhập lại mật khẩu*"
              required
              onChange={(e) =>
                setFormData({ ...formData, nhap_lai_mat_khau: e.target.value })
              }
            />
          </div>

          <button type="submit" className="btn-register-submit">
            ĐĂNG KÝ
          </button>

          {msg && (
            <p className={isErr ? "error-text" : "success-text"}>{msg}</p>
          )}

          <div className="register-footer">
            <p>
              Đã có tài khoản?{" "}
              <Link to="/login" className="login-link">
                Đăng nhập
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
