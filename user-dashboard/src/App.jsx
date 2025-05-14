import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./i18n";
import Document from "./components/Document";

// ✅ Lazy-loaded components
const Dashboard = lazy(() => import("./components/Dashboard"));
const RegisterPage = lazy(() => import("./components/RegisterPage"));
const AuthForm = lazy(() => import("./components/AuthForm"));
const WebinarPage = lazy(() => import("./components/WebinarPage"));
const ForgetPasswordPage = lazy(() => import("./components/ForgetPasswordPage"));
const Forms = lazy(() => import("./forms/Forms"));
const Profile = lazy(() => import("./components/Profile"));
const Navbar = lazy(() => import("./components/Navbar"));
const Webinar = lazy(() => import("./components/Webinar"));
const WebinarDetails = lazy(() => import("./components/WebinarDetails"));
const Courses = lazy(() => import("./components/Courses"));
const CourseDetails = lazy(() => import("./components/CourseDetails"));
const Enquiry = lazy(() => import("./components/Enquiry"));
const About = lazy(() => import("./components/About"));

// ✅ Token Validation Function
const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

// 🔐 Auto Redirect on Token Expiry
const AutoRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTokenValid()) {
        console.warn("🔒 Token expired! Redirecting to login...");
        localStorage.removeItem("token");
        navigate("/", { replace: true });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  return null;
};

// 🔐 Protected Route
const PrivateRoute = ({ element }) => {
  return isTokenValid() ? element : <Navigate to="/" replace />;
};

// 🧭 Layout with Conditional Navbar
const Layout = ({ children }) => {
  const location = useLocation();

  const navbarPaths = [
    "/",  "/dashboard/webinars", "/dashboard/webinars/",
    "/dashboard/courses", "/dashboard/courses/", "/profile", "/scroll",
    "/forms", "/webinars", "/dashboard/enquiry", "/dashboard/about",
  ];



  const showNavbar = location.pathname !== "/dashboard";

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
};

// 🎬 Main App Component
const App = () => {
  return (
    <Router>
      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
        <Layout>
          <Routes>
            {/* 🔑 Public Routes */}
            <Route path="/" element={<AuthForm />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forget-password" element={<ForgetPasswordPage />} />

            {/* 🔒 Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute element={<><AutoRedirect /><Dashboard /></>} />
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute element={<><AutoRedirect /><Profile /></>} />
              }
            />
            <Route
              path="/dashboard/webinars"
              element={
                <PrivateRoute element={<><AutoRedirect /><Webinar /></>} />
              }
            />
            <Route
              path="/dashboard/webinars/:id"
              element={
                <PrivateRoute element={<><AutoRedirect /><WebinarDetails /></>} />
              }
            />
            <Route
              path="/dashboard/webinars/:id/watch-webinar"
              element={
                <PrivateRoute element={<><AutoRedirect /><WebinarPage /></>} />
              }
            />
            <Route
              path="/dashboard/courses"
              element={
                <PrivateRoute element={<><AutoRedirect /><Courses /></>} />
              }
            />
            <Route
              path="/dashboard/courses/:slug"
              element={
                <PrivateRoute element={<><AutoRedirect /><CourseDetails /></>} />
              }
            />
            <Route
              path="/dashboard/courses/:courseName/forms/:formName"
              element={
                <PrivateRoute element={<><AutoRedirect /><Forms /></>} />
              }
            />
            <Route
              path="/dashboard/enquiry"
              element={
                <PrivateRoute element={<><AutoRedirect /><Enquiry /></>} />
              }
            />
            <Route
              path="/dashboard/about"
              element={
                <PrivateRoute element={<><AutoRedirect /><About /></>} />
              }
            />
            <Route
              path="/dashboard/document"
              element={
                <PrivateRoute element={<><AutoRedirect /><Document /></>} />
              }
            />

            {/* 🌐 Catch-All */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Suspense>
    </Router>
  );
};

export default App;
