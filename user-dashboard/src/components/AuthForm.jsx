import React, { useEffect, useState } from "react";
import "./AuthForm.css";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ForgetPasswordPage from "./ForgetPasswordPage";
import { useTranslation } from "react-i18next";
import HelpPopup from "./HelpPopup";
import EAFOWaterLoader from "./EAFOWaterLoader";
import ContactUs from "./ContactUs";

const AuthForm = () => {
  const [activePanel, setActivePanel] = useState("login");
  const [isActive, setIsActive] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [loading, setLoading] = useState(true);  // <-- loading state
  const { t } = useTranslation();

  // Run once on mount - 3 seconds loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const toggleForms = () => {
    setIsActive(!isActive);
    if (!isActive) setActivePanel("login");
  };

  const showRegister = () => {
    setActivePanel("register");
    setIsActive(true);
  };

  const showForgotPassword = () => {
    setActivePanel("forgot");
    setIsActive(false);
  };

  const showLogin = () => {
    setActivePanel("login");
    setIsActive(false);
  };

  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup);
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener("resize", checkScreenSize);
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  if (loading) {
    return (
     <EAFOWaterLoader/>
    );
  }

  return (
    <div className="intro-page">
      <ContactUs/>
      <div className="auth-page">
        {showHelpPopup && <HelpPopup onClose={toggleHelpPopup} />}
        <div className={isMobile ? "" : "auth-wrapper"}>
          <div className={`container ${isActive ? "active" : ""}`}>
            <div
              className={`form-box login ${
                activePanel !== "login" ? "hidden" : ""
              }`}
            >
              <LoginPage
                onSwitchToRegister={toggleForms}
                onSwitchToForgotPassword={showForgotPassword}
              />
            </div>

            <div
              className={`form-box register ${
                activePanel !== "register" ? "hidden" : ""
              }`}
            >
              <RegisterPage onSwitchToLogin={showLogin} />
            </div>

            <div
              className={`form-box forget-password ${
                activePanel !== "forgot" ? "hidden" : ""
              }`}
            >
              <ForgetPasswordPage onBackToLogin={showLogin} />
            </div>

            <div className="toggle-box">
              <div className="toggle-panel toggle-left">
                <p>{t("auth.noAccount")}</p>
                <button className="switch-button" onClick={showRegister}>
                  {t("auth.register")}
                </button>
              </div>

              <div className="toggle-panel toggle-right">
                <div className="toggle-right-content">
                  <button
                    className="auth-help-button"
                    onClick={toggleHelpPopup}
                  >
                    {t("auth.help")}
                  </button>

                  <p>{t("auth.haveAccount")}</p>
                  <button className="switch-button" onClick={showLogin}>
                    {t("auth.login")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
