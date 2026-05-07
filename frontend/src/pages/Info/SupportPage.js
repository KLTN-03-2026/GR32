import ChatbotWidget from "../../components/Chatbot/ChatbotWidget";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import "./InfoPages.css";

const supportItems = [
  {
    title: "Địa chỉ cửa hàng",
    value:
      "NO NAME Store, H12/3 K456 đường Hoàng Diệu, phường Hòa Cường  TP Đà Nẵng",
  },
  {
    title: "Hotline",
    value: "0906 532 622",
  },
  {
    title: "Email hỗ trợ",
    value: "admin@noname.vn",
  },
  {
    title: "Giờ làm việc",
    value: "08:30 - 21:30 (Thứ 2 đến Chủ nhật)",
  },
];

export default function SupportPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [location.hash]);

  return (
    <div className="info-page">
      <Header />
      <main className="info-main">
        <section className="info-hero">
          <p className="info-kicker">Hỗ trợ khách hàng</p>
          <h1>NO NAME luôn sẵn sàng đồng hành cùng bạn</h1>
          <p>
            Nếu cần tư vấn sản phẩm, hỗ trợ đơn hàng hoặc giải đáp chính sách
            đổi trả - vận chuyển, bạn có thể liên hệ trực tiếp qua các kênh bên
            dưới.
          </p>
        </section>

        <section className="info-section">
          <h2>Thông tin liên hệ</h2>
          <div className="support-grid">
            {supportItems.map((item) => (
              <article key={item.title} className="support-card">
                <h3>{item.title}</h3>
                <p>{item.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="info-section">
          <h2>Nội dung hỗ trợ</h2>
          <div className="support-topic-links">
            <Link to="/ho-tro#doi-tra">Chính sách đổi hàng</Link>
            <Link to="/ho-tro#bao-hanh">Chính sách bảo hành</Link>
            <Link to="/ho-tro#huong-dan-mua-hang">Hướng dẫn mua hàng</Link>
          </div>
        </section>

        <section id="doi-tra" className="info-section info-detail">
          <h2>Chính sách đổi hàng</h2>
          <ul>
            <li>Hỗ trợ đổi size hoặc màu trong vòng 7 ngày kể từ khi nhận hàng.</li>
            <li>Sản phẩm còn tem, chưa giặt, chưa qua chỉnh sửa và có hóa đơn mua hàng.</li>
            <li>Không áp dụng đổi với sản phẩm thuộc chương trình xả kho hoặc ghi chú không đổi trả.</li>
            <li>Liên hệ hotline để được hướng dẫn gửi hàng đổi và xác nhận tồn kho trước khi xử lý.</li>
          </ul>
        </section>

        <section id="bao-hanh" className="info-section info-detail">
          <h2>Chính sách bảo hành</h2>
          <ul>
            <li>NO NAME hỗ trợ bảo hành lỗi kỹ thuật đường may trong 30 ngày từ ngày mua.</li>
            <li>Không bảo hành hư hỏng do sử dụng sai cách, tác động nhiệt hoặc hóa chất mạnh.</li>
            <li>Thời gian xử lý bảo hành từ 3 - 7 ngày làm việc tùy tình trạng sản phẩm.</li>
            <li>Khách vui lòng cung cấp mã đơn hàng và hình ảnh lỗi để được kiểm tra nhanh.</li>
          </ul>
        </section>

        <section id="huong-dan-mua-hang" className="info-section info-detail">
          <h2>Hướng dẫn mua hàng</h2>
          <ol>
            <li>Chọn sản phẩm và biến thể (size, màu) phù hợp.</li>
            <li>Thêm vào giỏ hàng và kiểm tra lại thông tin trước khi thanh toán.</li>
            <li>Nhập mã ưu đãi (nếu có), chọn phương thức thanh toán mong muốn.</li>
            <li>Hoàn tất đặt hàng và theo dõi trạng thái đơn tại trang tài khoản.</li>
          </ol>
        </section>

        <section className="info-section info-note">
          <h2>Gợi ý hỗ trợ nhanh</h2>
          <ul>
            <li>Tra cứu tình trạng đơn hàng trong mục tài khoản của bạn.</li>
            <li>
              Nhắn trực tiếp qua chatbot ở góc phải để được phản hồi nhanh.
            </li>
            <li>
              Với các vấn đề khẩn cấp, vui lòng gọi hotline để đội ngũ chăm sóc
              khách hàng ưu tiên xử lý.
            </li>
          </ul>
        </section>
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}
