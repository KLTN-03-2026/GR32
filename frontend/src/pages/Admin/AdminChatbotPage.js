import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../config";
import "./AdminChatbotPage.css";

const API = `${API_BASE}/api/chat/admin`;

const FAQ_DM_OPTIONS = [
  { value: "", label: "Tất cả danh mục" },
  { value: "doi_tra", label: "Chính sách đổi trả" },
  { value: "van_chuyen", label: "Vận chuyển" },
  { value: "thanh_toan", label: "Thanh toán" },
  { value: "san_pham", label: "Sản phẩm" },
];

const FAQ_DM_LABEL = FAQ_DM_OPTIONS.reduce((acc, o) => {
  if (o.value) acc[o.value] = o.label;
  return acc;
}, {});

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function playHandoffBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    o.type = "sine";
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.18);
  } catch {
    /* ignore */
  }
}

function formatRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  return `${day} ngày trước`;
}

export default function AdminChatbotPage() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isAdmin = user.vai_tro === "admin";

  const [tab, setTab] = useState(isAdmin ? "faq" : "live");
  const [faqs, setFaqs] = useState([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqErr, setFaqErr] = useState("");
  const [faqInput, setFaqInput] = useState("");
  const [faqQ, setFaqQ] = useState("");
  const [faqCat, setFaqCat] = useState("");
  const [modal, setModal] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessErr, setSessErr] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [detail, setDetail] = useState(null);
  const [staffText, setStaffText] = useState("");
  const [sendingStaff, setSendingStaff] = useState(false);
  const alertedRef = useRef(new Set());

  useEffect(() => {
    const t = setTimeout(() => setFaqQ(faqInput.trim()), 420);
    return () => clearTimeout(t);
  }, [faqInput]);

  const loadFaqs = useCallback(async () => {
    setFaqLoading(true);
    setFaqErr("");
    try {
      const params = {};
      if (faqQ) params.q = faqQ;
      if (faqCat) params.danh_muc = faqCat;
      const r = await axios.get(`${API}/faq`, { headers: authHeader(), params });
      setFaqs(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setFaqErr(e.response?.data?.message || "Không tải được FAQ.");
    } finally {
      setFaqLoading(false);
    }
  }, [faqQ, faqCat]);

  const loadSessions = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/sessions`, { headers: authHeader() });
      const items = r.data?.items || [];
      setSessions(items);
      const needAlert = items.filter((i) => i.needs_attention);
      for (const row of needAlert) {
        const t = row.session_token;
        if (!alertedRef.current.has(t)) {
          alertedRef.current.add(t);
          playHandoffBeep();
          break;
        }
      }
    } catch (e) {
      setSessErr(e.response?.data?.message || "Không tải được phiên chat.");
    }
  }, []);

  useEffect(() => {
    if (tab === "faq" && isAdmin) loadFaqs();
  }, [tab, isAdmin, loadFaqs]);

  useEffect(() => {
    if (tab !== "live") return;
    setSessErr("");
    loadSessions();
    const id = setInterval(loadSessions, 3000);
    return () => clearInterval(id);
  }, [tab, loadSessions]);

  const liveBadge = useMemo(() => sessions.filter((s) => s.needs_attention).length, [sessions]);

  const loadDetail = useCallback(async (token) => {
    if (!token) {
      setDetail(null);
      return;
    }
    try {
      const r = await axios.get(`${API}/sessions/${encodeURIComponent(token)}`, {
        headers: authHeader(),
      });
      setDetail(r.data);
    } catch {
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedToken) {
      setDetail(null);
      return;
    }
    loadDetail(selectedToken);
    const id = setInterval(() => loadDetail(selectedToken), 2500);
    return () => clearInterval(id);
  }, [selectedToken, loadDetail]);

  const openCreate = () => {
    setModal({
      mode: "create",
      danh_muc: "doi_tra",
      cau_hoi_mau: "",
      cau_tra_loi: "",
    });
  };

  const openEdit = (row) => {
    setModal({
      mode: "edit",
      id: row._id,
      danh_muc: row.danh_muc || "san_pham",
      cau_hoi_mau: row.cau_hoi_mau,
      cau_tra_loi: row.cau_tra_loi,
    });
  };

  const saveModal = async () => {
    if (!modal) return;
    const cau_hoi_mau = String(modal.cau_hoi_mau || "").trim();
    const cau_tra_loi = String(modal.cau_tra_loi || "").trim();
    const danh_muc = String(modal.danh_muc || "").trim();
    if (!cau_hoi_mau || !cau_tra_loi) {
      window.alert("Câu hỏi mẫu và câu trả lời không được để trống.");
      return;
    }
    try {
      const body = { cau_hoi_mau, cau_tra_loi, danh_muc, tu_khoa: [] };
      if (modal.mode === "create") {
        await axios.post(`${API}/faq`, body, {
          headers: { ...authHeader(), "Content-Type": "application/json" },
        });
      } else {
        await axios.put(`${API}/faq/${modal.id}`, body, {
          headers: { ...authHeader(), "Content-Type": "application/json" },
        });
      }
      setModal(null);
      loadFaqs();
    } catch (e) {
      window.alert(e.response?.data?.message || "Lưu thất bại.");
    }
  };

  const deleteFaq = async (row) => {
    if (!window.confirm(`Xóa FAQ: "${row.cau_hoi_mau}"?`)) return;
    try {
      await axios.delete(`${API}/faq/${row._id}`, { headers: authHeader() });
      loadFaqs();
    } catch (e) {
      window.alert(e.response?.data?.message || "Xóa thất bại.");
    }
  };

  const takeover = async () => {
    if (!selectedToken) return;
    try {
      await axios.post(
        `${API}/sessions/${encodeURIComponent(selectedToken)}/takeover`,
        {},
        { headers: { ...authHeader(), "Content-Type": "application/json" } },
      );
      await loadSessions();
      await loadDetail(selectedToken);
    } catch (e) {
      window.alert(e.response?.data?.message || "Không tiếp quản được.");
    }
  };

  const endSupport = async () => {
    if (!selectedToken || !window.confirm("Kết thúc hỗ trợ? Khách có thể tiếp tục chat với AI.")) return;
    try {
      await axios.post(
        `${API}/sessions/${encodeURIComponent(selectedToken)}/end-support`,
        {},
        { headers: { ...authHeader(), "Content-Type": "application/json" } },
      );
      await loadSessions();
      await loadDetail(selectedToken);
    } catch (e) {
      window.alert(e.response?.data?.message || "Thao tác thất bại.");
    }
  };

  const deleteSession = async (token) => {
    if (!token) return;
    if (
      !window.confirm(
        "Xóa vĩnh viễn phiên chat này khỏi hệ thống quản trị? Lịch sử tin nhắn sẽ mất. Khách vẫn có thể giữ phiên cũ trên trình duyệt cho đến khi họ bấm «Cuộc trò chuyện mới».",
      )
    ) {
      return;
    }
    try {
      await axios.delete(`${API}/sessions/${encodeURIComponent(token)}`, { headers: authHeader() });
      alertedRef.current.delete(token);
      if (selectedToken === token) {
        setSelectedToken("");
        setDetail(null);
        setStaffText("");
      }
    } catch (e) {
      window.alert(e.response?.data?.message || "Không xóa được phiên.");
    } finally {
      await loadSessions();
    }
  };

  const sendStaff = async () => {
    const text = staffText.trim();
    if (!text || !selectedToken || sendingStaff) return;
    if (text.length > 500) {
      window.alert("Tối đa 500 ký tự.");
      return;
    }
    setSendingStaff(true);
    try {
      await axios.post(
        `${API}/sessions/${encodeURIComponent(selectedToken)}/message`,
        { text },
        { headers: { ...authHeader(), "Content-Type": "application/json" } },
      );
      setStaffText("");
      await loadDetail(selectedToken);
      await loadSessions();
    } catch (e) {
      window.alert(e.response?.data?.message || "Gửi thất bại.");
    } finally {
      setSendingStaff(false);
    }
  };

  return (
    <div className="cb-admin-page">
      <h2 className="cb-admin-title">Quản lý Chatbot AI</h2>

      <div className="cb-admin-tabs">
        {isAdmin && (
          <button
            type="button"
            className={`cb-admin-tab ${tab === "faq" ? "active" : ""}`}
            onClick={() => setTab("faq")}
          >
            Dữ liệu AI (FAQ)
          </button>
        )}
        <button
          type="button"
          className={`cb-admin-tab cb-admin-tab--live ${tab === "live" ? "active" : ""}`}
          onClick={() => setTab("live")}
        >
          Live chat
          {liveBadge > 0 && <span className="cb-tab-badge">{liveBadge}</span>}
        </button>
      </div>

      {!isAdmin && tab === "faq" && (
        <div className="cb-admin-muted">Chỉ Admin quản lý FAQ. Vui lòng dùng tab Live chat.</div>
      )}

      {isAdmin && tab === "faq" && (
        <>
          <div className="cb-faq-toolbar-row">
            <div className="cb-faq-search-wrap">
              <input
                type="search"
                className="cb-faq-search-input"
                placeholder="Tìm câu hỏi hoặc từ khóa"
                value={faqInput}
                onChange={(e) => setFaqInput(e.target.value)}
                aria-label="Tìm FAQ"
              />
              <button type="button" className="cb-faq-search-btn" onClick={() => setFaqQ(faqInput.trim())}>
                <i className="fas fa-search" aria-hidden />
              </button>
            </div>
            <select
              className="cb-faq-cat-select"
              value={faqCat}
              onChange={(e) => setFaqCat(e.target.value)}
              aria-label="Danh mục"
            >
              {FAQ_DM_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="button" className="cb-btn cb-btn-primary" onClick={openCreate}>
              + Thêm mới
            </button>
          </div>

          {faqErr && <p className="cb-err">{faqErr}</p>}
          {faqLoading && <p className="cb-muted">Đang tải…</p>}
          {!faqLoading && (
            <div className="cb-faq-table-wrap">
              <table className="cb-faq-table">
                <thead>
                  <tr>
                    <th className="cb-col-num">#</th>
                    <th>Câu hỏi mẫu</th>
                    <th>Câu trả lời</th>
                    <th className="cb-col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {faqs.map((row, idx) => (
                    <tr key={row._id}>
                      <td className="cb-col-num">{idx + 1}</td>
                      <td>
                        <div className="cb-faq-q">{row.cau_hoi_mau}</div>
                        <div className="cb-faq-dm-pill">{FAQ_DM_LABEL[row.danh_muc] || "—"}</div>
                      </td>
                      <td className="cb-faq-a">{row.cau_tra_loi}</td>
                      <td className="cb-col-actions">
                        <div className="cb-row-actions">
                          <button type="button" className="cb-link-btn" onClick={() => openEdit(row)}>
                            Sửa
                          </button>
                          <button type="button" className="cb-link-btn danger" onClick={() => deleteFaq(row)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "live" && (
        <div className="cb-live-root">
          {sessErr && <p className="cb-err">{sessErr}</p>}

          <div className="cb-live-section-head">
            <h3 className="cb-live-section-title">Phiên đang hoạt động</h3>
            <span className="cb-live-pill">{sessions.length} phiên</span>
          </div>

          <div className="cb-live-cards">
            {sessions.length === 0 && <div className="cb-admin-muted">Chưa có phiên gần đây.</div>}
            {sessions.map((s) => (
              <div
                key={s.session_token}
                className={`cb-session-card-wrap ${selectedToken === s.session_token ? "selected" : ""} ${
                  s.ui_status?.urgent ? "urgent" : ""
                }`}
              >
                <button
                  type="button"
                  className="cb-session-card"
                  onClick={() => setSelectedToken(s.session_token)}
                >
                  <div className="cb-session-avatar" aria-hidden>
                    {s.khach_initials || "K"}
                  </div>
                  <div className="cb-session-body">
                    <div className="cb-session-name">{s.khach_ten || "Khách"}</div>
                    <div className="cb-session-preview">
                      {s.preview ? String(s.preview).slice(0, 120) : "—"}
                      {s.preview && String(s.preview).length > 120 ? "…" : ""}
                    </div>
                    <div className="cb-session-meta">
                      <span className="cb-time">{formatRelative(s.updatedAt)}</span>
                      <span
                        className={`cb-status-chip ${s.ui_status?.key === "need_staff" ? "need" : s.ui_status?.key === "staff" ? "staff" : "ai"}`}
                      >
                        {s.ui_status?.label || "—"}
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="cb-session-delete"
                  title="Xóa phiên"
                  aria-label="Xóa phiên chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.session_token);
                  }}
                >
                  <i className="fas fa-trash-alt" aria-hidden />
                </button>
              </div>
            ))}
          </div>

          {selectedToken && detail && (
            <div className="cb-live-overlay">
              <button
                type="button"
                className="cb-live-overlay-backdrop"
                aria-label="Đóng"
                onClick={() => setSelectedToken("")}
              />
              <div className="cb-live-panel" role="dialog" aria-modal="true">
                <div className="cb-live-panel-head">
                  <div className="cb-live-panel-user">
                    <div className="cb-session-avatar lg">{detail.khach_initials || "K"}</div>
                    <div>
                      <div className="cb-live-panel-name">{detail.khach_ten || "Khách"}</div>
                      <div className="cb-live-panel-sub">{detail.session_subtitle || "—"}</div>
                    </div>
                  </div>
                  <div className="cb-live-panel-actions">
                    {!detail.staff_takeover && (
                      <button type="button" className="cb-btn cb-btn-dark" onClick={takeover}>
                        Tiếp quản
                      </button>
                    )}
                    {detail.staff_takeover && (
                      <button type="button" className="cb-btn cb-btn-outline" onClick={endSupport}>
                        Kết thúc hỗ trợ
                      </button>
                    )}
                    <button
                      type="button"
                      className="cb-btn cb-btn-danger"
                      title="Xóa phiên khỏi hệ thống"
                      onClick={() => deleteSession(detail.session_token)}
                    >
                      Xóa phiên
                    </button>
                    <button
                      type="button"
                      className="cb-icon-close"
                      aria-label="Đóng"
                      onClick={() => setSelectedToken("")}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>

                <div className="cb-live-panel-msgs">
                  {(detail.messages || []).map((m, idx) => (
                    <div
                      key={`${idx}-${m.at}`}
                      className={`cb-panel-msg ${m.role === "user" ? "user" : m.role === "staff" ? "staff" : "ai"}`}
                    >
                      <div className="cb-panel-msg-ava" aria-hidden />
                      <div>
                        <div className="cb-panel-msg-label">
                          {m.role === "staff"
                            ? "Nhân viên"
                            : m.role === "user"
                              ? "Khách"
                              : "Trợ lý AI"}
                        </div>
                        <div className="cb-panel-msg-bubble">{m.content}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cb-live-panel-foot">
                  <input
                    type="text"
                    className="cb-panel-input"
                    placeholder="Nhập tin nhắn"
                    value={staffText}
                    maxLength={500}
                    disabled={!detail.staff_takeover || sendingStaff}
                    onChange={(e) => setStaffText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendStaff();
                    }}
                  />
                  <button
                    type="button"
                    className="cb-btn cb-btn-primary"
                    disabled={!detail.staff_takeover || sendingStaff || !staffText.trim()}
                    onClick={sendStaff}
                  >
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="cb-modal-overlay" role="dialog" aria-modal="true">
          <div className="cb-modal cb-modal-lg">
            <button type="button" className="cb-modal-x" onClick={() => setModal(null)} aria-label="Đóng">
              <i className="fas fa-times" />
            </button>
            <h3>{modal.mode === "create" ? "Thêm câu hỏi mới" : "Chỉnh sửa câu hỏi"}</h3>
            <div className="cb-field">
              <label>Danh mục</label>
              <select
                value={modal.danh_muc}
                onChange={(e) => setModal({ ...modal, danh_muc: e.target.value })}
              >
                {FAQ_DM_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cb-field">
              <label>Câu hỏi mẫu *</label>
              <input
                placeholder="Ví dụ: chính sách đổi trả như thế nào"
                value={modal.cau_hoi_mau}
                onChange={(e) => setModal({ ...modal, cau_hoi_mau: e.target.value })}
              />
            </div>
            <div className="cb-field">
              <label>Câu trả lời tương ứng *</label>
              <textarea
                placeholder="Nhập nội dung trả lời chi tiết..."
                value={modal.cau_tra_loi}
                onChange={(e) => setModal({ ...modal, cau_tra_loi: e.target.value })}
              />
            </div>
            <div className="cb-modal-actions">
              <button type="button" className="cb-btn cb-btn-outline" onClick={() => setModal(null)}>
                Hủy
              </button>
              <button type="button" className="cb-btn cb-btn-dark" onClick={saveModal}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
