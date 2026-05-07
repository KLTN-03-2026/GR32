import axios from "axios";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../../config";
import "./ChatbotWidget.css";

const API = `${API_BASE}/api/chat`;
const STORAGE_KEY = "noname_chat_session_id";
const MAX_LEN = 500;
/** Khoảng cách tính là “đang xem tin mới nhất” — không tự cuộn khi đã kéo lên xa hơn */
const NEAR_BOTTOM_PX = 80;

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatPrice(n) {
  const v = Number(n) || 0;
  return `${v.toLocaleString("vi-VN")}đ`;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [booting, setBooting] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [staffTakeover, setStaffTakeover] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const bootedRef = useRef(false);
  const messagesScrollRef = useRef(null);
  /** true = tin nhắn mới / poll sẽ tự cuộn xuống đáy */
  const stickToBottomRef = useRef(true);

  const updateScrollAnchoring = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    stickToBottomRef.current = nearBottom;
    const hasOverflow = el.scrollHeight > el.clientHeight + 12;
    setShowJumpToBottom(Boolean(hasOverflow && !nearBottom));
  }, []);

  const scrollToLatest = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    requestAnimationFrame(() => {
      updateScrollAnchoring();
    });
  }, [updateScrollAnchoring]);

  useLayoutEffect(() => {
    if (!open || minimized || booting) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    updateScrollAnchoring();
  }, [messages, open, minimized, booting, updateScrollAnchoring]);

  useEffect(() => {
    if (!open || minimized) return;
    if (bootedRef.current) return;
    bootedRef.current = true;
    setBooting(true);

    (async () => {
      const headers = authHeaders();
      let sid = sessionId || localStorage.getItem(STORAGE_KEY);
      try {
        if (sid) {
          const r = await axios.get(`${API}/session/${sid}`, { headers });
          setSessionId(sid);
          localStorage.setItem(STORAGE_KEY, sid);
          setMessages(Array.isArray(r.data.messages) ? r.data.messages : []);
          setHandoff(Boolean(r.data.handoff));
          setStaffTakeover(Boolean(r.data.staff_takeover));
          setBooting(false);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        sid = "";
      }

      try {
        const r = await axios.post(`${API}/session`, {}, { headers });
        const id = r.data.sessionId;
        localStorage.setItem(STORAGE_KEY, id);
        setSessionId(id);
        setMessages(Array.isArray(r.data.messages) ? r.data.messages : []);
        setHandoff(Boolean(r.data.handoff));
        setStaffTakeover(Boolean(r.data.staff_takeover));
      } catch {
        setMessages([
          {
            role: "assistant",
            content: "Không kết nối được máy chủ chat. Vui lòng thử lại sau.",
            at: new Date(),
          },
        ]);
      } finally {
        setBooting(false);
      }
    })();
  }, [open, minimized]);

  useEffect(() => {
    if (!open || minimized || !sessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await axios.get(`${API}/session/${sessionId}`, { headers: authHeaders() });
        if (cancelled) return;
        setMessages(Array.isArray(r.data.messages) ? r.data.messages : []);
        setHandoff(Boolean(r.data.handoff));
        setStaffTakeover(Boolean(r.data.staff_takeover));
      } catch {
        /* giữ state hiện tại */
      }
    };
    const id = setInterval(poll, 4000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, minimized, sessionId]);

  useEffect(() => {
    if (!open || minimized) return;
    const el = messagesScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateScrollAnchoring());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, minimized, updateScrollAnchoring]);

  const handleTogglePanel = () => {
    if (!open) {
      bootedRef.current = false;
      setMinimized(false);
      stickToBottomRef.current = true;
    }
    setOpen(!open);
  };

  const handleClose = () => {
    setOpen(false);
    setMinimized(false);
  };

  const startNewChat = async () => {
    if (resetting || booting || sending || !open || minimized) return;
    if (
      !window.confirm(
        "Bắt đầu cuộc trò chuyện mới? Lịch sử hiện tại sẽ không còn hiển thị trên thiết bị này (cuộc cũ vẫn có thể lưu trên hệ thống).",
      )
    ) {
      return;
    }
    setResetting(true);
    setInput("");
    localStorage.removeItem(STORAGE_KEY);
    setBooting(true);
    try {
      const r = await axios.post(
        `${API}/session`,
        {},
        { headers: { ...authHeaders(), "Content-Type": "application/json" } },
      );
      const id = r.data.sessionId;
      localStorage.setItem(STORAGE_KEY, id);
      setSessionId(id);
      setMessages(Array.isArray(r.data.messages) ? r.data.messages : []);
      setHandoff(Boolean(r.data.handoff));
      setStaffTakeover(Boolean(r.data.staff_takeover));
    } catch {
      setSessionId("");
      setMessages([
        {
          role: "assistant",
          content: "Không tạo được phiên chat mới. Vui lòng thử lại sau.",
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setBooting(false);
      setResetting(false);
      stickToBottomRef.current = true;
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || text.length > MAX_LEN || !sessionId || sending || booting || resetting) return;

    stickToBottomRef.current = true;
    setSending(true);
    setInput("");
    const userMsg = { role: "user", content: text, at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);

    try {
      const r = await axios.post(
        `${API}/message`,
        { sessionId, text },
        { headers: { ...authHeaders(), "Content-Type": "application/json" } },
      );
      const reply = r.data.reply != null ? String(r.data.reply) : "";
      const silent = Boolean(r.data.silent);
      const hasProducts = Array.isArray(r.data.products) && r.data.products.length > 0;
      if (!silent || reply.trim() || hasProducts) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: reply,
            products: r.data.products || [],
            at: new Date().toISOString(),
          },
        ]);
      }
      setHandoff(Boolean(r.data.handoff));
      setStaffTakeover(Boolean(r.data.staff_takeover));
      if (silent) {
        try {
          const sync = await axios.get(`${API}/session/${sessionId}`, { headers: authHeaders() });
          setMessages(Array.isArray(sync.data.messages) ? sync.data.messages : []);
          setStaffTakeover(Boolean(sync.data.staff_takeover));
        } catch {
          /* giữ UI đã append user */
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Không gửi được tin nhắn.";
      setMessages((m) => [...m, { role: "assistant", content: msg, at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        type="button"
        className="cb-widget-fab"
        onClick={handleTogglePanel}
        aria-label="Mở trợ lý AI"
      >
        <i className="fas fa-comments" aria-hidden />
        <span className="cb-widget-fab-label">Trợ lý AI</span>
      </button>

      {open && !minimized && (
        <div className="cb-widget-panel" role="dialog" aria-label="Cửa sổ trợ lý AI">
          <div className="cb-widget-head">
            <div className="cb-widget-head-left">
              <div className="cb-widget-avatar" aria-hidden>
                <span className="cb-widget-avatar-glyph" />
              </div>
              <div className="cb-widget-head-text">
                <span className="cb-widget-title">NO NAME</span>
                <span className="cb-widget-subtitle">Trợ lý AI</span>
              </div>
            </div>
            <div className="cb-widget-head-actions">
              <button
                type="button"
                className="cb-widget-new-chat"
                aria-label="Cuộc trò chuyện mới"
                title="Cuộc trò chuyện mới"
                disabled={booting || sending || resetting}
                onClick={startNewChat}
              >
                <i className="fas fa-rotate-right" aria-hidden />
              </button>
              <button type="button" aria-label="Thu nhỏ" onClick={() => setMinimized(true)}>
                <i className="fas fa-minus" />
              </button>
              <button type="button" aria-label="Đóng" onClick={handleClose}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          <div className="cb-messages-wrap">
            <div
              ref={messagesScrollRef}
              className="cb-widget-messages"
              onScroll={updateScrollAnchoring}
            >
              {booting && (
                <div className="cb-widget-loading" role="status">
                  <span className="cb-widget-loading-dot" />
                  <span className="cb-widget-loading-dot" />
                  <span className="cb-widget-loading-dot" />
                </div>
              )}
              {!booting &&
                messages.map((msg, idx) => (
                  <div
                    key={`${idx}-${msg.at}-${msg.role}`}
                    className={`cb-msg-row ${
                      msg.role === "user" ? "user" : msg.role === "staff" ? "staff" : "bot"
                    }`}
                  >
                    <div className="cb-msg-ava" aria-hidden />
                    <div>
                      {msg.role === "staff" && (
                        <div className="cb-msg-label">Nhân viên</div>
                      )}
                      <div className="cb-msg-bubble">{msg.content}</div>
                      {msg.role === "assistant" && msg.products?.length > 0 && (
                        <div className="cb-product-cards">
                          {msg.products.map((p) => (
                            <Link
                              key={p._id}
                              to={p.detailPath || `/product/${p._id}`}
                              className="cb-product-card"
                            >
                              <img src={p.hinh_anh || "https://via.placeholder.com/52"} alt="" />
                              <div className="cb-product-meta">
                                <strong>{p.ten_san_pham}</strong>
                                <span>
                                  {formatPrice(p.gia_hien_tai)}
                                  {p.ton_kho != null ? ` · Tồn: ${p.ton_kho}` : ""}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            {showJumpToBottom && (
              <button
                type="button"
                className="cb-scroll-bottom-btn"
                aria-label="Xuống tin mới nhất"
                title="Xuống tin mới nhất"
                onClick={scrollToLatest}
              >
                <i className="fas fa-chevron-down" aria-hidden />
              </button>
            )}
          </div>

          <div className="cb-widget-foot">
            {handoff || staffTakeover ? (
              <div className={`cb-handoff-note ${staffTakeover ? "cb-handoff-note--live" : ""}`}>
                <i className="fas fa-headset cb-handoff-note-icon" aria-hidden />
                <span>
                  {staffTakeover
                    ? handoff
                      ? "Nhân viên đang hỗ trợ — tin của bạn được gửi trực tiếp tới đội ngũ."
                      : "Nhân viên đã tham gia — tin của bạn được chuyển tới nhân viên."
                    : "Đang chờ nhân viên tiếp nhận. Bạn vẫn có thể gửi tin nhắn."}
                </span>
              </div>
            ) : null}
            <div className="cb-input-row">
              <div className="cb-input-wrap">
                <button type="button" className="cb-icon-btn" aria-hidden tabIndex={-1}>
                  <i className="far fa-smile" />
                </button>
                <input
                  type="text"
                  placeholder="Nhập tin nhắn"
                  maxLength={MAX_LEN}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={sending || booting || resetting || !sessionId}
                  aria-label="Nội dung tin nhắn"
                />
                <button type="button" className="cb-icon-btn" aria-hidden tabIndex={-1}>
                  <i className="fas fa-paperclip" />
                </button>
              </div>
              <button
                type="button"
                className="cb-send-btn"
                aria-label="Gửi"
                disabled={sending || booting || resetting || !input.trim() || !sessionId}
                onClick={sendMessage}
              >
                <i className="fas fa-paper-plane" />
              </button>
            </div>
            <div className="cb-char-hint">
              <button type="button" className="cb-new-chat-link" onClick={startNewChat} disabled={booting || sending || resetting}>
                Cuộc trò chuyện mới
              </button>
              <span className="cb-char-count">{input.length}/{MAX_LEN}</span>
            </div>
          </div>
        </div>
      )}

      {open && minimized && (
        <button
          type="button"
          className="cb-widget-panel cb-widget-panel--minimized"
          onClick={() => setMinimized(false)}
        >
          <span className="cb-widget-minimized-label">
            <i className="fas fa-comments cb-widget-minimized-ico" aria-hidden />
            Trợ lý AI · nhấn để mở
          </span>
          <i className="fas fa-chevron-up cb-widget-minimized-chevron" aria-hidden />
        </button>
      )}
    </>
  );
}
