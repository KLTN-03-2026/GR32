import API_BASE from "../config";

/**
 * Chuẩn hoá path /uploads/... từ giá trị lưu trong MongoDB (relative hoặc full URL máy khác).
 */
export function normalizeStoredUploadPath(stored) {
  if (!stored || typeof stored !== "string") return "";
  const s = stored.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) {
    try {
      const pathname = new URL(s).pathname;
      return pathname.startsWith("/uploads/") ? pathname : "";
    } catch {
      return "";
    }
  }
  if (s.startsWith("/uploads/")) return s;
  if (s.startsWith("uploads/")) return `/${s}`;
  return "";
}

/**
 * URL đầy đủ để <img src> — hỗ trợ cả Cloudinary URLs và local paths.
 */
export function resolveMediaUrl(stored) {
  if (!stored || typeof stored !== "string") return "";
  const s = stored.trim();
  if (!s) return "";
  if (s.startsWith("blob:") || s.startsWith("data:")) return s;

  const apiBase = (API_BASE ?? "").replace(/\/$/, "");

  // Cloudinary URLs - return as-is
  if (/^https?:\/\/res\.cloudinary\.com/i.test(s)) {
    return s;
  }

  // Other external URLs (including old Cloudinary-like URLs)
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.pathname.startsWith("/uploads/")) {
        if (!apiBase) return `${u.pathname}${u.search}${u.hash}`;
        return `${apiBase}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      /* fall through */
    }
    return s;
  }

  // Local uploads paths
  if (s.startsWith("/uploads/")) {
    if (!apiBase) return s;
    return `${apiBase}${s}`;
  }

  if (s.startsWith("uploads/")) {
    const path = `/${s}`;
    if (!apiBase) return path;
    return `${apiBase}${path}`;
  }

  return s;
}
