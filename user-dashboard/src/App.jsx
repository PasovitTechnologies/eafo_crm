import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import MainPage from "./components/MainPage";
import Dashboard from "./components/Dashboard";
import RegisterPage from "./components/RegisterPage";
import AuthForm from "./components/AuthForm";
import "./i18n"; // Import the i18n configuration
import WebinarPage from "./components/WebinarPage";
import ForgetPasswordPage from "./components/ForgetPasswordPage";
import ScrollingComponent from "./components/ScrollingComponent";
import Forms from "./forms/Forms";
import Profile from "./components/Profile";
import Navbar from "./components/Navbar";
import Webinar from "./components/Webinar";
import WebinarDetails from "./components/WebinarDetails";
import Courses from "./components/Courses";
import CourseDetails from "./components/CourseDetails";
import Enquiry from "./components/Enquiry";
import About from "./components/About";
import { jwtDecode } from "jwt-decode";

// ✅ Token Validation Function
const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    return decoded.exp > Date.now() / 1000; // Check if token hasn't expired
  } catch {
    return false;
  }
};

// 🔥 Auto Redirect Component on Token Expiry
const AutoRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTokenValid()) {
        console.warn("🔒 Token expired! Redirecting to login...");
        localStorage.removeItem("token"); // Clear invalid token
        navigate("/", { replace: true });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval); 
  }, [navigate]);

  return null;
};

// 🔒 Protected Route Component
const PrivateRoute = ({ element }) => {
  return isTokenValid() ? element : <Navigate to="/" replace />;
};

const Layout = ({ children }) => {
  const location = useLocation();

  const navbarPaths = [
    "/",
    "/dashboard",
    "/dashboard/webinars",
    "/dashboard/webinars/",
    "/dashboard/courses",
    "/dashboard/courses/",
    "/profile",
    "/scroll",
    "/forms",
    "/webinars",
    "/dashboard/enquiry",
    "/dashboard/about",
  ];

  const showNavbar = navbarPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AutoRedirect /> {/* ✅ Auto Token Expiry Handler */}
      <Layout>
        <Routes>
          {/* 🔑 Authentication Routes */}
          <Route path="/" element={<AuthForm />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forget-password" element={<ForgetPasswordPage />} />

          {/* 🔒 Protected Routes */}
          <Route
            path="/dashboard"
            element={<PrivateRoute element={<Dashboard />} />}
          />
          <Route
            path="/profile"
            element={<PrivateRoute element={<Profile />} />}
          />
          <Route
            path="/scroll"
            element={<PrivateRoute element={<ScrollingComponent />} />}
          />

          {/* 🎥 Webinars */}
          <Route
            path="/dashboard/webinars"
            element={<PrivateRoute element={<Webinar />} />}
          />
          <Route
            path="/dashboard/webinars/:id"
            element={<PrivateRoute element={<WebinarDetails />} />}
          />
          <Route
            path="/dashboard/webinars/:id/watch-webinar"
            element={<PrivateRoute element={<WebinarPage />} />}
          />

          {/* 📚 Courses & Forms */}
          <Route
            path="/dashboard/courses"
            element={<PrivateRoute element={<Courses />} />}
          />
          <Route
            path="/dashboard/courses/:slug"
            element={<PrivateRoute element={<CourseDetails />} />}
          />
          <Route
            path="/dashboard/courses/:courseName/forms/:formName"
            element={<PrivateRoute element={<Forms />} />}
          />

          {/* 📧 Enquiry & About */}
          <Route
            path="/dashboard/enquiry"
            element={<PrivateRoute element={<Enquiry />} />}
          />
          <Route
            path="/dashboard/about"
            element={<PrivateRoute element={<About />} />}
          />

          {/* 🌐 Catch-All Route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
