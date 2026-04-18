import { useEffect, useMemo, useState } from "react";
import "./OrderReviewModal.css";

const STAR_LABELS = {
  1: "Rất tệ",
  2: "Tệ",
  3: "Bình thường",
  4: "Tốt",
  5: "Tuyệt vời",
};

const QUICK_TAGS = ["Chất lượng tốt", "Giao hàng nhanh", "Sẽ mua lại", "Size chuẩn"];

export default function OrderReviewModal({
  open,
  onClose,
  line,
  lineIndex,
  onSubmit,
  submitting,
}) {
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setStars(5);
      setTags([]);
      setText("");
      setErr("");
    }
  }, [open, lineIndex]);

  const starLabel = useMemo(() => STAR_LABELS[stars] || "", [stars]);

  if (!open || !line) return null;

  const toggleTag = (t) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setErr("Vui lòng nhập nội dung đánh giá");
      return;
    }
    setErr("");
    onSubmit({ line_index: lineIndex, so_sao: stars, noi_dung: trimmed, tags });
  };

  return (
    <div
      className="orm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="orm-panel">
        <h2 id="orm-title" className="orm-title">
          Đánh giá sản phẩm
        </h2>

        <div className="orm-product">
          {line.hinh_anh ? (
            <img src={line.hinh_anh} alt="" className="orm-thumb" />
          ) : (
            <div className="orm-thumb orm-thumb-ph">
              <i className="fas fa-image" />
            </div>
          )}
          <div>
            <div className="orm-pname">{line.ten_san_pham}</div>
            <div className="orm-pmeta">
              {[line.mau_sac, line.kich_co].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>

        <div className="orm-block">
          <label className="orm-label">Chất lượng sản phẩm</label>
          <div className="orm-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                className={`orm-star ${s <= stars ? "on" : ""}`}
                onClick={() => setStars(s)}
                aria-label={`${s} sao`}
              >
                <i className="fas fa-star" />
              </button>
            ))}
          </div>
          <p className="orm-star-hint">
            {starLabel} — {stars} sao
          </p>
        </div>

        <div className="orm-block">
          <span className="orm-label">Gợi ý nhanh</span>
          <div className="orm-tags">
            {QUICK_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                className={`orm-tag ${tags.includes(t) ? "active" : ""}`}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="orm-block">
          <label className="orm-label" htmlFor="orm-text">
            Nội dung đánh giá
          </label>
          <textarea
            id="orm-text"
            className="orm-textarea"
            rows={5}
            maxLength={1000}
            placeholder="Chia sẻ của bạn..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="orm-count">{text.length}/1000 Ký tự</div>
        </div>

        {err && <p className="orm-error">{err}</p>}

        <div className="orm-actions">
          <button type="button" className="orm-btn ghost" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button type="button" className="orm-btn primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </div>
      </div>
    </div>
  );
}
