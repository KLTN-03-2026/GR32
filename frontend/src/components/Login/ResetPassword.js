import axios from "axios";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../config";
import "./Login.css";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      return setMessage("Mật khẩu phải có ít nhất 6 ký tự!");
    }
    if (password !== confirmPassword) {
      return setMessage("Mật khẩu nhập lại không khớp!");
    }

    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/reset-password/${token}`,
        {
          password: password,
        },
      );
      setIsSuccess(true);
      setMessage("Đổi mật khẩu thành công! Chờ 2 giây...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.response?.data?.message || "Đã xảy ra lỗi!");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <form className="login-card" onSubmit={handleReset}>
          <h2>Đặt lại mật khẩu</h2>
          <div className="input-group">
            <input
              type="password"
              placeholder="Mật khẩu mới"
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Xác nhận mật khẩu"
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-login-submit">
            HOÀN TẤT
          </button>
          {message && (
            <p
              style={{
                color: isSuccess ? "green" : "red",
                marginTop: "10px",
                textAlign: "center",
              }}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
