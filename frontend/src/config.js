/**
 * - Dev (npm start): không set REACT_APP_API_URL → gọi trực tiếp backend :5000.
 * - Docker (nginx proxy /api, /uploads): build với REACT_APP_API_URL="" → cùng origin với trang (vd. :3000).
 */
const API_BASE = process.env.REACT_APP_API_URL ?? "http://localhost:5000";

export default API_BASE;
