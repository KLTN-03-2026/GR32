import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API_BASE from "../../config";
import "./Header.css";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setCartCount(0);
    }
  }, [location]);

  const fetchCartCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/api/cart/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartCount(res.data.totalItems || 0);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    if (user) fetchCartCount();
  }, [user]);

  useEffect(() => {
    const onCartUpdated = () => fetchCartCount();
    window.addEventListener("cartUpdated", onCartUpdated);
    return () => window.removeEventListener("cartUpdated", onCartUpdated);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchInput = (value) => {
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/products/search?q=${encodeURIComponent(value)}`
        );
        const results = res.data.slice(0, 6);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${searchQuery}`);
    }
  };

  const handleSuggestionClick = (productName) => {
    setSearchQuery(productName);
    setShowSuggestions(false);
    navigate(`/search?q=${productName}`);
  };

  const handleLogout = () => {
    if (window.confirm("Bạn muốn đăng xuất?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setCartCount(0);
      navigate("/login");
    }
  };

  return (
    <header className="main-header">
      <div className="header-logo" onClick={() => navigate("/")}>
        NO NAME
      </div>

      <nav className="header-nav">
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
        >
          TRANG CHỦ
        </Link>
        <Link
          to="/products"
          className={`nav-link ${location.pathname === "/products" ? "active" : ""}`}
        >
          SẢN PHẨM
        </Link>
        <div className="nav-dropdown">
          <span
            className={`nav-link dropdown-trigger ${location.pathname.startsWith("/danh-muc") ? "active" : ""}`}
          >
            DANH MỤC <i className="fas fa-chevron-down dropdown-arrow"></i>
          </span>
          <div className="dropdown-menu">
            <div className="dropdown-col">
              <h4>Thời trang Nam</h4>
              <Link to="/danh-muc/ao-thun-nam">Áo thun nam</Link>
              <Link to="/danh-muc/ao-polo-nam">Áo polo nam</Link>
              <Link to="/danh-muc/quan-jean-nam">Quần jean nam</Link>
              <Link to="/danh-muc/quan-short-nam">Quần short nam</Link>
            </div>
            <div className="dropdown-col">
              <h4>Thời trang Nữ</h4>
              <Link to="/danh-muc/ao-thun-nu">Áo thun nữ</Link>
              <Link to="/danh-muc/dam-vay">Đầm / Váy</Link>
              <Link to="/danh-muc/quan-nu">Quần nữ</Link>
              <Link to="/danh-muc/ao-khoac-nu">Áo khoác nữ</Link>
            </div>
            <div className="dropdown-col">
              <h4>Phụ kiện</h4>
              <Link to="/danh-muc/mu-non">Mũ / Nón</Link>
              <Link to="/danh-muc/tui-xach">Túi xách</Link>
              <Link to="/danh-muc/that-lung">Thắt lưng</Link>
              <Link to="/danh-muc/giay-dep">Giày dép</Link>
            </div>
          </div>
        </div>
        <Link to="/ve-chung-toi" className="nav-link">
          VỀ CHÚNG TÔI
        </Link>
        <Link to="/ho-tro" className="nav-link">
          HỖ TRỢ
        </Link>
      </nav>

      <div className="header-right-section">
        <div className="search-wrapper" ref={searchRef}>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            <button type="submit">
              <i className="fas fa-search"></i>
            </button>
          </form>

          {showSuggestions && (
            <ul className="search-suggestions">
              {suggestions.map((item) => (
                <li
                  key={item._id}
                  onClick={() => handleSuggestionClick(item.ten_san_pham)}
                >
                  <i className="fas fa-search suggestion-icon"></i>
                  <span>{item.ten_san_pham}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="header-actions">
          {user ? (
            <div className="header-icons">
              {(user.vai_tro === "admin" || user.vai_tro === "nhan_vien") && (
                <i
                  className="fas fa-tools"
                  onClick={() => {
                    window.location.assign(`${window.location.origin}/admin-dashboard`);
                  }}
                  title="Trang quản trị"
                ></i>
              )}
              <div
                className={`nav-dropdown header-account-dropdown ${
                  location.pathname === "/profile" || location.pathname.startsWith("/orders")
                    ? "account-nav-active"
                    : ""
                }`}
              >
                <span
                  className="dropdown-trigger header-account-trigger"
                  title="Tài khoản"
                >
                  <i className="fas fa-user-circle" />
                  <i className="fas fa-chevron-down dropdown-arrow account-dropdown-arrow" />
                </span>
                <div className="dropdown-menu header-account-menu">
                  <div className="dropdown-col header-account-col">
                    <Link
                      to="/profile"
                      className={
                        location.pathname === "/profile" ? "header-account-link active" : "header-account-link"
                      }
                    >
                      Quản lý thông tin cá nhân
                    </Link>
                    <Link
                      to="/orders"
                      className={
                        location.pathname.startsWith("/orders")
                          ? "header-account-link active"
                          : "header-account-link"
                      }
                    >
                      Quản lý đơn hàng
                    </Link>
                  </div>
                </div>
              </div>
              <div className="cart-wrapper" onClick={() => navigate("/cart")}>
                <i className="fas fa-shopping-cart"></i>
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </div>
              <i
                className="fas fa-sign-out-alt"
                onClick={handleLogout}
                title="Đăng xuất"
              ></i>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="nav-link">
                ĐĂNG NHẬP
              </Link>
              <span className="divider">|</span>
              <Link to="/register" className="nav-link">
                ĐĂNG KÝ
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
