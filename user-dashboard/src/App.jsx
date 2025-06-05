import React, { useEffect, Suspense, lazy, useState } from "react";
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
import EAFOWaterLoader from "./components/EAFOWaterLoader";
import OfflinePage from "./components/OfflinePage"; // Import the OfflinePage
import PaymentSuccess from "./components/PaymentSuccess";

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


const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
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
  const [authorized, setAuthorized] = React.useState(null);
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  React.useEffect(() => {
    const validate = async () => {
      if (!token || !email) {
        localStorage.clear();
        setAuthorized(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        if (decoded.exp < Date.now() / 1000) {
          localStorage.clear();
          setAuthorized(false);
          return;
        }
      } catch {
        localStorage.clear();
        setAuthorized(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BASE_URL}/api/user/${email}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.clear();
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      } catch (err) {
        console.error("Error validating user:", err);
        localStorage.clear();
        setAuthorized(false);
      }
    };

    validate();
  }, [token, email]);

  if (authorized === null) return <div><EAFOWaterLoader/></div>;

  return authorized ? element : <Navigate to="/" replace />;
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

  const isOnline = useNetworkStatus();

  return (
    <Router>
      {!isOnline ? (
        <OfflinePage />
      ) : (
        <Suspense fallback={<EAFOWaterLoader
          />}>
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
      )}

    </Router>
  );
};

export default App;
