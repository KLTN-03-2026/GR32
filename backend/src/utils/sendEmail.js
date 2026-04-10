const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1. Tạo transporter (Người vận chuyển)
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Huy dùng Gmail cho tiện nhé
    auth: {
      user: process.env.EMAIL_USER, // Email của shop Huy
      pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng (không phải pass đăng nhập)
    },
  });

  // 2. Định nghĩa nội dung Email
  const mailOptions = {
    from: `NO NAME Shop <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3. Thực hiện gửi mail
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
