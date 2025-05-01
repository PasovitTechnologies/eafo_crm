import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import "./AuthForm.css";

const LoginPage = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const baseUrl = import.meta.env.VITE_BASE_URL;

  const notify = {
    success: (message) =>
      toast.success(message, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "toast-notification",
      }),
    error: (message) =>
      toast.error(message, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "toast-notification",
      }),
    info: (message) =>
      toast.info(message, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "toast-notification",
      }),
  };

  const validateToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      const isValid = decoded.exp > Date.now() / 1000;

      if (!isValid) {
        localStorage.removeItem("token");
        toast.error(t("loginPage.sessionExpired"));
      }

      setIsLoggedIn(isValid);
      return isValid;
    } catch (error) {
      console.error("Token validation failed:", error);
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      toast.error(t("loginPage.invalidToken"));
      return false;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      toast.info(t("loginPage.checkingSession"));
      validateToken(token);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      toast.success(t("loginPage.welcomeBack"));
      setTimeout(() => navigate("/dashboard"), 1500);
    }
  }, [isLoggedIn, navigate]);

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast.error(t("loginPage.validEmail"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("loginPage.validPassword"));
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${baseUrl}/api/user/login`, {
        email,
        password,
      });

      const { token } = response.data;
      if (!token) throw new Error(t("loginPage.invalidResponse"));

      localStorage.setItem("token", token);
      localStorage.setItem("email", email);
      setIsLoggedIn(true);

      toast.success(t("loginPage.loginSuccess"));
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || t("loginPage.loginFailed");
      toast.error(errorMessage);
      if (error.response?.status === 401) setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email && password;

  return (
    <div
      className="auth-container"
      style={{
        zIndex: 10,
        padding: "16px",
        borderRadius: "8px",
        minWidth: "22rem",
        width:"100%"
      }}
    >
      <ToastContainer className="toast-container" style={{ color: "#fff" }} />
      <form
        onSubmit={handleSubmit}
        className="login-form"
        style={{ zIndex: 20 }}
      >
        <h1>{t("auth.login")}</h1>

        <div className="input-box">
          <input
            type="email"
            placeholder={t("loginPage.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label={t("loginPage.emailAriaLabel")}
          />
        </div>

        <div className="input-box">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t("loginPage.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label={t("loginPage.passwordAriaLabel")}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={
              showPassword
                ? t("loginPage.hidePassword")
                : t("loginPage.showPassword")
            }
            style={{ zIndex: 30 }}
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>

        {/* Forgot Password Link */}
        <div className="forgot-password-link" style={{ textAlign: "right", marginBottom: "1rem" }}>
          <button
            type="button"
            className="text-button"
            onClick={onSwitchToForgotPassword}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              fontSize: "0.9rem",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            {t("auth.forgotPassword")}
          </button>
        </div>

        <button
          type="submit"
          className="button"
          disabled={loading || !isFormValid}
          aria-busy={loading}
        >
          {loading ? t("loginPage.loading") : t("loginPage.loginButton")}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
