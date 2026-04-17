import axios from "axios";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setResendMsg("");
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        mat_khau: matKhau,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const vai_tro = res.data.user.vai_tro;
      if (vai_tro === "admin" || vai_tro === "nhan_vien") {
        window.location.assign(`${window.location.origin}/admin-dashboard`);
        return;
      }
      const raw = location.state?.from;
      const fromPath =
        typeof raw === "string" ? raw : raw?.pathname || "";
      const next =
        fromPath && fromPath !== "/login" ? fromPath : "/home";
      navigate(next, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi đăng nhập!";
      setError(msg);
      if (err.response?.status === 403) {
        setShowResend(true);
      }
    }
  };

  const handleResendActivation = async () => {
    setResendMsg("");
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/resend-activation`,
        { email }
      );
      setResendMsg(res.data.message);
    } catch (err) {
      setResendMsg(err.response?.data?.message || "Lỗi gửi lại email!");
    }
  };

  return (
    <div className="login-wrapper">
      <div
        className="no-name-header"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <strong>NO NAME</strong> <span>Đăng nhập</span>
      </div>

      <div className="login-container">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="card-header-actions">
            <Link to="/" className="back-home-btn" title="Về trang chủ">
              ←
            </Link>
            <h2>Đăng nhập</h2>
          </div>

          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group password-group">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Mật khẩu"
              required
              onChange={(e) => setMatKhau(e.target.value)}
            />
            <span className="eye-icon" onClick={() => setShowPass(!showPass)}>
              {showPass ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>

          <button type="submit" className="btn-login-submit">
            ĐĂNG NHẬP
          </button>

          <div className="login-links">
            <Link to="/forgot-password">Quên mật khẩu</Link>
            <p>
              Bạn chưa có tài khoản?{" "}
              <Link to="/register" className="reg-link">
                Đăng ký
              </Link>
            </p>
          </div>
          {error && <p className="error-text">{error}</p>}
          {showResend && (
            <div className="resend-section">
              <button
                type="button"
                className="btn-resend"
                onClick={handleResendActivation}
              >
                Gửi lại email kích hoạt
              </button>
              {resendMsg && <p className="success-text">{resendMsg}</p>}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
