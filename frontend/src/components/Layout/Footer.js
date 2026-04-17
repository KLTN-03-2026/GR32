import { useState } from "react";
import "./Footer.css";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="site-footer">
      <div className="newsletter-section">
        <div className="newsletter-content">
          <h3>Đăng ký nhận tin</h3>
          <p>
            Cập nhật những sản phẩm mới, nhận thông tin ưu đãi đặc biệt và thông
            tin giảm giá khác.
          </p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Đăng ký</button>
          </form>
          {subscribed && <p className="subscribe-msg">Đăng ký thành công!</p>}
        </div>
      </div>

      <div className="footer-main">
        <div className="footer-col">
          <h4>VỀ NO NAME</h4>
          <p>
            NO NAME - Thương hiệu thời trang cao cấp dành cho tất cả mọi người.
            Chúng tôi cam kết mang đến sản phẩm chất lượng với giá cả hợp lý.
          </p>
        </div>
        <div className="footer-col">
          <h4>Liên hệ</h4>
          <p>
            <i className="fas fa-phone"></i> 0906.532.622
          </p>
          <p>
            <i className="fas fa-envelope"></i> contact@noname.vn
          </p>
          <p>
            <i className="fas fa-map-marker-alt"></i> TP. Đà Nẵng
          </p>
        </div>
        <div className="footer-col">
          <h4>Hỗ trợ</h4>
          <p>Chính sách đổi hàng</p>
          <p>Chính sách bảo hành</p>
          <p>Hướng dẫn mua hàng</p>
        </div>
        <div className="footer-col">
          <h4>Phương thức thanh toán</h4>
          <div className="payment-methods">
            <span>VISA</span>
            <span>MasterCard</span>
            <span>VNPay</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 NO NAME. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
