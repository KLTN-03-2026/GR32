import {
  Link,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useSearchParams,
} from "react-router-dom";

import ForgotPassword from "./components/Login/ForgotPassword";
import Login from "./components/Login/Login";
import ResetPassword from "./components/Login/ResetPassword";
import Register from "./components/Register/Register";
import ActivateAccount from "./pages/ActivateAccount/ActivateAccount";
import AdminDashboardHome from "./pages/Admin/AdminDashboardHome";
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminProductForm from "./pages/Admin/AdminProductForm";
import AdminProducts from "./pages/Admin/AdminProducts";
import AdminPaymentsPage from "./pages/Admin/AdminPaymentsPage";
import AdminOrdersPage from "./pages/Admin/AdminOrdersPage";
import AdminReviewsPage from "./pages/Admin/AdminReviewsPage";
import AdminCategoriesPage from "./pages/Admin/AdminCategoriesPage";
import AdminBrandsPage from "./pages/Admin/AdminBrandsPage";
import AdminAccountsPage from "./pages/Admin/AdminAccountsPage";
import AdminCouponsPage from "./pages/Admin/AdminCouponsPage";
import AdminReportsPage from "./pages/Admin/AdminReportsPage";
import CartPage from "./pages/Cart/CartPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import VnpaySandboxPage from "./pages/Payment/VnpaySandboxPage";
import CategoryPage from "./pages/Category/CategoryPage";
import Home from "./pages/Home/Home";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import ProductsPage from "./pages/Products/ProductsPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import MyOrdersPage from "./pages/Orders/MyOrdersPage";
import OrderDetailPage from "./pages/Orders/OrderDetailPage";
import SearchPage from "./pages/Search/SearchPage";

function RedirectVnpayDemoToSandbox() {
  const [searchParams] = useSearchParams();
  const q = searchParams.toString();
  return (
    <Navigate
      to={q ? `/payment/vnpay-sandbox?${q}` : "/payment/vnpay-sandbox"}
      replace
    />
  );
}

function NotFound() {
  return (
    <div
      style={{
        padding: "80px 24px",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22 }}>Không tìm thấy trang</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Đường dẫn không khớp với ứng dụng.
      </p>
      <Link to="/" style={{ color: "#222", fontWeight: 600 }}>
        Về trang chủ
      </Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. TRANG CHỦ */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />

        {/* 2. HỆ THỐNG TÀI KHOẢN */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/activate/:token" element={<ActivateAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* 3. SẢN PHẨM & TÌM KIẾM */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/danh-muc/:slug" element={<CategoryPage />} />
        <Route path="/ve-chung-toi" element={<Navigate to="/" replace />} />
        <Route path="/ho-tro" element={<Navigate to="/" replace />} />

        {/* 4. KHÁCH HÀNG */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/thanh-toan" element={<CheckoutPage />} />
        <Route path="/s/x" element={<CheckoutPage />} />
        <Route path="/payment/vnpay-demo" element={<RedirectVnpayDemoToSandbox />} />
        <Route path="/payment/vnpay-sandbox" element={<VnpaySandboxPage />} />

        {/* 5. HỆ THỐNG QUẢN TRỊ (Admin / Nhân viên) */}
        <Route path="/admin-dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboardHome />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="brands" element={<AdminBrandsPage />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/edit/:id" element={<AdminProductForm />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="accounts" element={<AdminAccountsPage />} />
        </Route>

        {/* 6. 404 — không redirect về / (tránh che lỗi route, trông như “về trang chủ”) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
