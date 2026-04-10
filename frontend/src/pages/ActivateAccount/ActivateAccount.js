import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE from "../../config";

const ActivateAccount = () => {
  const { token } = useParams();
  const [message, setMessage] = useState("Đang kích hoạt tài khoản...");
  const [isSuccess, setIsSuccess] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const activate = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/auth/activate/${token}`
        );
        setMessage(res.data.message);
        setIsSuccess(true);
      } catch (err) {
        setMessage(
          err.response?.data?.message || "Lỗi kích hoạt tài khoản!"
        );
        setIsSuccess(false);
      }
    };
    activate();
  }, [token]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>
          {isSuccess ? "\u2705" : message === "Đang kích hoạt tài khoản..." ? "\u23F3" : "\u274C"}
        </div>
        <h2 style={{ marginBottom: "15px" }}>Kích hoạt tài khoản</h2>
        <p style={{ color: isSuccess ? "#28a745" : "#666", fontSize: "15px" }}>
          {message}
        </p>
        {isSuccess && (
          <Link to="/login" style={styles.btn}>
            Đăng nhập ngay
          </Link>
        )}
        <Link to="/" style={{ ...styles.btn, background: "white", color: "#333", border: "1.5px solid #333" }}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fcfcfc",
  },
  card: {
    background: "white",
    padding: "50px 40px",
    borderRadius: "30px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    width: "450px",
    textAlign: "center",
  },
  btn: {
    display: "inline-block",
    marginTop: "20px",
    marginRight: "10px",
    padding: "10px 30px",
    borderRadius: "25px",
    background: "#333",
    color: "white",
    fontWeight: "bold",
    textDecoration: "none",
    fontSize: "14px",
    transition: "0.3s",
  },
};

export default ActivateAccount;
