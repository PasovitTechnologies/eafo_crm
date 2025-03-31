import React, { useState } from "react";
import "./AuthForm.css";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ForgetPasswordPage from "./ForgetPasswordPage";
import { useTranslation } from "react-i18next";
import Navbar from "./Navbar";

const AuthForm = () => {
  const [activePanel, setActivePanel] = useState("login"); // 'login', 'register', or 'forgot'
  const [isActive, setIsActive] = useState(false);
  const { t } = useTranslation();

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

  return (
    <div className="auth-page">
         <div className="auth-wrapper">
      <div className={`container ${isActive ? "active" : ""}`}>
        
        {/* ✅ Logo */}
        

        {/* Login Form */}
        <div className={`form-box login ${activePanel !== "login" ? "hidden" : ""}`}>
        
          <LoginPage 
            onSwitchToRegister={toggleForms}
          />
        </div>

        {/* Register Form */}
        <div className={`form-box register ${activePanel !== "register" ? "hidden" : ""}`}>
       
          <RegisterPage 
            onSwitchToLogin={showLogin}
          />
        </div>

        {/* Forgot Password Form */}
        <div className={`form-box forget-password ${activePanel !== "forgot" ? "hidden" : ""}`}>
          <ForgetPasswordPage 
            onBackToLogin={showLogin}
          />
        </div>

        {/* Toggle Panel */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1 className="toggle-heading">{t('auth.welcome')}</h1>
            <p>{t('auth.noAccount')}</p>
            <button className="switch-button" onClick={showRegister}>
              {t('auth.register')}
            </button>
            <p className="forgot-password-link">
              <button 
                type="button" 
                className="text-button" 
                onClick={showForgotPassword}
              >
                {t('auth.forgotPassword')}
              </button>
            </p>
          </div>

          <div className="toggle-panel toggle-right">
            <h1 className="toggle-heading">{t('auth.welcomeBack')}</h1>
            <p>{t('auth.haveAccount')}</p>
            <button className="switch-button" onClick={showLogin}>
              {t('auth.login')}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
   
  );
};

export default AuthForm;
