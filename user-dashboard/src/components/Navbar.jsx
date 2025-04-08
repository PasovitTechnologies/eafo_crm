import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaSignOutAlt, FaBell } from "react-icons/fa";
import Flag from "react-world-flags";
import axios from "axios";
import "./Navbar.css";
import NotificationPanel from "./NotificationPanel";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userId = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!userId && !!token);

    const savedLanguage = localStorage.getItem("language") || "ru";
    if (i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }

    if (token) {
      fetchNotifications();
    }
  }, [i18n.language]);

  const fetchNotifications = async () => {
    try {
      console.log("📡 Fetching notifications...");
  
      const response = await axios.get("/api/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
  
      console.log("✅ Raw response from /api/notifications:", response);
  
      const rawNotifications = response?.data || [];
  
      // Debug the structure of the data
      console.log("🧾 rawNotifications received:", rawNotifications);
  
      const userLang = localStorage.getItem("language") || "en";
  
      const normalizedNotifications = rawNotifications.map((n) => {
        const message =
          typeof n.message === "object"
            ? n.message[userLang] || n.message["en"]
            : n.message;
  
        return {
          _id: n._id,
          type: n.type,
          isRead: n.isRead,
          createdAt: n.createdAt,
          message,
        };
      });
  
      console.log("🔄 Normalized Notifications:", normalizedNotifications);
  
      setNotifications(normalizedNotifications);
      setUnreadCount(normalizedNotifications.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };
  

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

  const getCountryCode = (lang) => {
    const map = { en: "US", ru: "RU" };
    return map[lang] || "US";
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`/api/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <div className="navbar-page">
      <nav className="ui-navbar">
        <div className="logo" onClick={() => navigate("/")}>
          <img
            src="https://static.wixstatic.com/media/e6f22e_a90a0fab7b764c24805e7e43d165d416~mv2.png"
            alt={t("logo_alt", "Logo")}
          />
        </div>

        <div className="nav-welcome-msg">
          <h1>{t("welcome_message", "Welcome to EAFO User account!")}</h1>
        </div>

        <div className="right-section">
          {isLoggedIn && location.pathname !== "/" && (
            <div className="notification-icon-container">
              <FaBell className="notification-icon" onClick={toggleNotifications} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onMarkAsRead={markAsRead}
                  onClose={() => setShowNotifications(false)}
                  currentLanguage={i18n.language}
                />
              )}
            </div>
          )}

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

          {location.pathname !== "/" && (
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
