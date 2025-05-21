import React, { useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import { FaArrowLeft } from "react-icons/fa";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import "./AuthForm.css";

const ForgetPasswordPage = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const baseUrl = import.meta.env.VITE_BASE_URL;

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleCheckDetails = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast.error(t("forgetPasswordPage.invalidEmail"));
      return;
    }

    if (!dob) {
      toast.error(t("forgetPasswordPage.enterDob"));
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${baseUrl}/api/user/validate`, {
        email,
        dob,
      });

      if (response.data.success) {
        setShowPasswordFields(true);
        toast.success(t("forgetPasswordPage.detailsVerified"));
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message === "User not found!"
          ? t("forgetPasswordPage.userMatch")
          : t("forgetPasswordPage.enterDob")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("forgetPasswordPage.passwordMismatch"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("forgetPasswordPage.passwordLength"));
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${baseUrl}/api/user/update-password`, {
        email,
        newPassword: password,
      });

      toast.success(t("forgetPasswordPage.passwordUpdated"));
      setTimeout(() => {
        onBackToLogin?.();
      }, 2000);
    } catch (error) {
      toast.error(
        error.response?.data?.message || t("forgetPasswordPage.updateFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="forget-form"
      onSubmit={showPasswordFields ? handleChangePassword : handleCheckDetails}
    >
      <div className="back-button-wrapper">
        <button
          type="button"
          onClick={onBackToLogin}
          className="back-icon-button"
          aria-label={t("forgetPasswordPage.backToLogin")}
        >
          <FaArrowLeft />
        </button>
        <h1>{t("forgetPasswordPage.forgotPassword")}</h1>
      </div>

      <div className="input-box">
        <input
          type="email"
          placeholder={t("forgetPasswordPage.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={!isValidEmail(email) && email ? "error" : ""}
          aria-label={t("forgetPasswordPage.emailAriaLabel")}
        />
      </div>

      <div className="input-box date-input-container">
        <input
          type="text"
          onFocus={(e) => (e.target.type = "date")}
          onBlur={(e) => !e.target.value && (e.target.type = "text")}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
          className={!dob ? "has-placeholder" : ""}
          aria-label={t("forgetPasswordPage.dobAriaLabel")}
        />
        {!dob && (
          <span className="date-placeholder">
            {t("forgetPasswordPage.dobPlaceholder")}
          </span>
        )}
      </div>

      {showPasswordFields && (
        <>
          <div className="input-box">
          <input
  type={showPassword ? "text" : "password"}
  placeholder={t("forgetPasswordPage.passwordPlaceholder")}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
  aria-label={t("forgetPasswordPage.passwordAriaLabel")}
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

          <div className="input-box">
          <input
  type={showPassword ? "text" : "password"}
  placeholder={t("forgetPasswordPage.confirmPasswordPlaceholder")}
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
  required
  aria-label={t("forgetPasswordPage.confirmPasswordAriaLabel")}
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
        </>
      )}

      <button
        type="submit"
        className="button"
        disabled={loading}
        aria-busy={loading}
      >
        {loading
          ? t("forgetPasswordPage.processing")
          : showPasswordFields
          ? t("forgetPasswordPage.changePassword")
          : t("forgetPasswordPage.checkDetails")}
      </button>

      <ToastContainer className="toast-container"/>
    </form>
  );
};

export default ForgetPasswordPage;
