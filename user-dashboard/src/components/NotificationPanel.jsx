import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { 
  IoClose, 
  IoNotificationsOutline,
  IoAlertCircleOutline,
  IoPersonOutline,
  IoCheckmarkDone
} from "react-icons/io5";
import "./NotificationPanel.css";

const NotificationPanel = ({ 
  notifications = [], 
  importantNotifications = [],
  onMarkAsRead, 
  onClose,
  onMarkAllAsRead 
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("important");
  const panelRef = useRef(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Get notifications for active tab
  const filteredNotifications = activeTab === "important" 
    ? [...importantNotifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [...notifications]
        .filter(n => !importantNotifications.some(impNotif => impNotif._id === n._id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;
  const totalImportantUnread = importantNotifications.filter(n => !n.isRead).length;
  const totalPersonalUnread = notifications.filter(n => 
    !n.isRead && !importantNotifications.some(impNotif => impNotif._id === n._id)
  ).length;

  const handleNotificationClick = (notification) => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
  };

  

  const createMarkup = (html) => ({
    __html: DOMPurify.sanitize(html || t("no_message", "No message"))
  });

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return t("just_now", "Just now");
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t("min_ago", "m ago")}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t("hour_ago", "h ago")}`;
    return `${Math.floor(diffInSeconds / 86400)}${t("day_ago", "d ago")}`;
  };

  return (
    <div className="notification-panel" ref={panelRef}>
      {/* Header with close button */}
      <div className="panel-header">
        <div className="header-left">
          <IoNotificationsOutline className="header-icon" />
          <h3>{t("notifications", "Notifications")}</h3>
          {unreadCount > 0 && (
            <span className="unread-count-badge">{unreadCount}</span>
          )}
        </div>
        <div className="header-actions">
          <button 
            className="notification-action-btn notification-close-btn"
            onClick={onClose}
            aria-label={t("close", "Close")}
          >
            <IoClose />
          </button>
        </div>
      </div>

      {/* Rest of the component remains the same */}
      <div className="notification-tabs">
        <button
          className={`tab-button ${activeTab === "important" ? "active" : ""}`}
          onClick={() => setActiveTab("important")}
          aria-selected={activeTab === "important"}
        >
          <IoAlertCircleOutline className="tab-icon" />
          {t("important", "Important")}
          {totalImportantUnread > 0 && (
            <span className="tab-badge">{totalImportantUnread}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => setActiveTab("personal")}
          aria-selected={activeTab === "personal"}
        >
          <IoPersonOutline className="tab-icon" />
          {t("personal", "Personal")}
          {totalPersonalUnread > 0 && (
            <span className="tab-badge">{totalPersonalUnread}</span>
          )}
        </button>
      </div>

      <div className="notification-list-container">
        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <IoNotificationsOutline className="empty-icon" />
              <p>{t("no_notifications", "No notifications here yet")}</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification._id || notification.id}
                className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                onClick={() => handleNotificationClick(notification)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {activeTab === "important" ? (
                    <IoAlertCircleOutline />
                  ) : (
                    <IoPersonOutline />
                  )}
                </div>
                <div className="notification-content">
                  <div 
                    className="notification-message"
                    dangerouslySetInnerHTML={createMarkup(notification.message)}
                  />
                  <div className="notification-meta">
                    <span className="notification-time">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                    {!notification.isRead && (
                      <span className="unread-indicator" aria-label="Unread"></span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;