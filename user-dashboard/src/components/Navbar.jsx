import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaSignOutAlt } from "react-icons/fa";
import Flag from "react-world-flags";  // Import flag component
import "./Navbar.css";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!userId && !!token);

    const savedLanguage = localStorage.getItem("language") || "ru";
    if (i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setIsLoggedIn(false);
    navigate("/");
    window.location.reload();
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  };

  // Map language codes to country codes
  const getCountryCode = (lang) => {
    const map = {
      en: "US",  // 🇺🇸 English
      ru: "RU",  // 🇷🇺 Russian
    };
    return map[lang] || "US";
  };

  return (
    <div className="navbar-page">
      <nav className="ui-navbar">
        {/* Logo */}
        <div className="logo" onClick={() => navigate("/")}>
          <img
            src="https://static.wixstatic.com/media/e6f22e_a90a0fab7b764c24805e7e43d165d416~mv2.png"
            alt={t("logo_alt", "Logo")}
          />
        </div>

        {/* Welcome Message */}
        <div className="nav-welcome-msg">
          <h1>{t("welcome_message", "Welcome to EAFO User account!")}</h1>
        </div>

        {/* Right Section */}
        <div className="right-section">
          {/* Language Selector with Flags */}
          <div className="language-selector">
            <div className="flag-dropdown">
              <Flag code={getCountryCode(i18n.language)} className="flag-icon" />
              <select
                className="language-dropdown"
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                <option value="en">🇺🇸 English</option>
                <option value="ru">🇷🇺 Русский</option>
              </select>
            </div>
          </div>

          {/* Logout Button */}
          {isLoggedIn && (
            <FaSignOutAlt
              className="user-icon"
              onClick={handleLogout}
              title={t("user_logout", "Logout")}
            />
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
