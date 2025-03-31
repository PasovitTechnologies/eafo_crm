import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useTranslation } from "react-i18next";  // 🌍 Import translation hook
import "react-toastify/dist/ReactToastify.css";
import "./AdminLogin.css";
import Navbar from "./Navbar";
import SettingsButton from "./SettingsButton";

const AdminLogin = ({ setIsAuthenticated }) => {
  const { t } = useTranslation();  // 🌍 Initialize translation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("ru");
   const [selectedOS, setSelectedOS] = useState("Webinar");
   const baseUrl = import.meta.env.VITE_BASE_URL;

   
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error(t("login.invalidEmail"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("login.shortPassword"));
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${baseUrl}/api/user/login`, {
        email,
        password,
      });

      if (!response.data) throw new Error("Invalid response from server");

      const { token, role } = response.data;

      if (!token) {
        toast.error(t("login.accessDenied"));
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      toast.success(t("login.success"));
      setIsAuthenticated(true);
      setIsAnimating(true);

    } catch (err) {
      console.error("Login Error:", err);
      toast.error(t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleAnimationComplete = () => {
    const role = localStorage.getItem("role");
    navigate(role === "admin" ? "/admin-dashboard" : "/user-dashboard");
  };

  return (
    <>
    <Navbar/>
    <SettingsButton
            setSelectedLanguage={setSelectedLanguage}
            setSelectedOS={setSelectedOS}
          />
      <ToastContainer position="top-center" />

      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="page-overlay"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            onAnimationComplete={handleAnimationComplete}
          />
        )}
      </AnimatePresence>

      <div className="admin-container">
        <div className="admin-login-box">
          {/* Left Side */}
          <div className="admin-overlay-container">
            <div className="admin-overlay-content">
              <h1 className="admin-welcome">{t("login.welcomeBack")}</h1>
              <p className="admin-description">
                {t("login.enterCredentials")}
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="admin-form-container">
            <h2 className="admin-form-title">{t("login.adminLogin")}</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label className="admin-label" htmlFor="email">
                  {t("login.email")}
                </label>
                <input
                  type="email"
                  id="email"
                  className="admin-input"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label" htmlFor="password">
                  {t("login.password")}
                </label>
                <div className="admin-password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="admin-input password-input"
                    placeholder={t("login.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    className="admin-password-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                  </span>
                </div>
              </div>

              <button type="submit" className="admin-btn" disabled={loading}>
                {loading ? t("login.loggingIn") : t("login.login")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLogin;
