import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const navigate = useNavigate();

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/forgot-password`,
        { email },
      );
      setMsg(res.data.message);
      setIsErr(false);
    } catch (err) {
      setMsg(err.response?.data?.message || "Lỗi hệ thống");
      setIsErr(true);
    }
  };

  return (
    <div className="forgot-wrapper">
      <div className="no-name-header">
        <strong>NO NAME</strong> <span>Đặt lại mật khẩu</span>
      </div>
      <div className="forgot-card">
        <div className="card-header">
          <span className="back-arrow" onClick={() => navigate("/login")}>
            ←
          </span>
          <h2>Đặt lại mật khẩu</h2>
        </div>
        <p className="instruction">
          Nhập địa chỉ email của bạn và chúng tôi sẽ gửi cho bạn một liên kết để
          đặt lại mật khẩu của bạn.
        </p>
        <form onSubmit={handleSend}>
          <input
            type="email"
            placeholder="Email"
            required
            onChange={(e) => setEmail(e.target.value)}
            className="capsule-input"
          />
          <button type="submit" className="btn-capsule">
            Đặt lại mật khẩu
          </button>
        </form>
        {msg && <p className={isErr ? "err-msg" : "success-msg"}>{msg}</p>}
      </div>
    </div>
  );
};
export default ForgotPassword;
