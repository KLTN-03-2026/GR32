import ChatbotWidget from "../../components/Chatbot/ChatbotWidget";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import "./InfoPages.css";

const milestones = [
  {
    year: "2022",
    title: "Khởi đầu NO NAME",
    content:
      "NO NAME bắt đầu từ một nhóm nhỏ yêu thời trang tối giản. Chúng tôi thử nghiệm các mẫu cơ bản, tập trung chất liệu và form mặc hằng ngày.",
  },
  {
    year: "2023",
    title: "Mở rộng bộ sưu tập",
    content:
      "Shop mở rộng thêm các dòng polo, jean, phụ kiện theo mùa. Đội ngũ chuẩn hóa quy trình nhập hàng, chụp ảnh và kiểm soát chất lượng.",
  },
  {
    year: "2024",
    title: "Xây dựng website",
    content:
      "Website NO NAME ra đời để khách hàng xem sản phẩm, đặt hàng và theo dõi đơn thuận tiện hơn. Đây cũng là nền tảng cho hệ thống quản trị vận hành tập trung.",
  },
  {
    year: "2026",
    title: "Nâng cấp trải nghiệm AI",
    content:
      "Website được tích hợp chatbot hỗ trợ tra cứu sản phẩm và live chat nhân viên, giúp phản hồi khách hàng nhanh hơn và nhất quán hơn.",
  },
];

const team = [
  {
    name: "Quốc Huy",
    role: "Trưởng nhóm",
    desc: "Định hướng sản phẩm, vận hành tổng thể và kết nối giữa công nghệ với nghiệp vụ bán hàng.",
  },
  {
    name: "Mạnh Khôi",
    role: "Thành viên phát triển",
    desc: "Tham gia xây dựng chức năng quản trị, tối ưu quy trình xử lý dữ liệu sản phẩm và đơn hàng.",
  },
  {
    name: "Hồng Quân",
    role: "Thành viên phát triển",
    desc: "Phụ trách cải thiện trải nghiệm người dùng và phối hợp kiểm thử giao diện trên website.",
  },
  {
    name: "Ngọc Nhi",
    role: "Thành viên nội dung",
    desc: "Xây dựng nội dung mô tả sản phẩm, phối hợp chuẩn hóa thông tin hiển thị và kịch bản hỗ trợ khách.",
  },
  {
    name: "Quỳnh",
    role: "Thành viên vận hành",
    desc: "Theo dõi phản hồi khách hàng, hỗ trợ quy trình chăm sóc khách và cập nhật chính sách dịch vụ.",
  },
];

export default function AboutPage() {
  return (
    <div className="info-page">
      <Header />
      <main className="info-main">
        <section className="info-hero">
          <p className="info-kicker">Về chúng tôi</p>
          <h1>NO NAME - Hành trình từ một ý tưởng nhỏ đến trải nghiệm mua sắm hiện đại</h1>
          <p>
            NO NAME được xây dựng với mục tiêu mang lại các sản phẩm thời trang dễ mặc, dễ phối và phù hợp
            nhu cầu hằng ngày. Song song với cửa hàng, chúng tôi phát triển website để khách hàng mua sắm
            thuận tiện hơn ở mọi nơi.
          </p>
        </section>

        <section className="info-section">
          <h2>Lịch sử hình thành</h2>
          <div className="timeline-grid">
            {milestones.map((m) => (
              <article key={m.year} className="timeline-card">
                <span className="timeline-year">{m.year}</span>
                <h3>{m.title}</h3>
                <p>{m.content}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="info-section">
          <h2>Đội ngũ phát triển</h2>
          <div className="team-grid">
            {team.map((member) => (
              <article key={member.name} className="team-card">
                <div className="team-avatar">{member.name.slice(0, 1)}</div>
                <div>
                  <h3>{member.name}</h3>
                  <p className="team-role">{member.role}</p>
                  <p>{member.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}
