import React from "react";
import { useTranslation } from "react-i18next";
import "./NotificationPanel.css";

const NotificationPanel = ({ notifications = [], onMarkAsRead, onClose }) => {
  const { t } = useTranslation();
  console.log("📬 NotificationPanel received notifications:", notifications);

  // Sort notifications by most recent
  const sortedNotifications = Array.isArray(notifications)
    ? [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
  };

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>{t("notifications", "Notifications")}</h3>
        <button 
          onClick={onClose} 
          className="notification-close-btn"
          aria-label="Close notifications"
        >
          ×
        </button>
      </div>

      <div className="notification-list">
        {sortedNotifications.length === 0 ? (
          <div className="no-notifications">
            {t("no_notifications", "No new notifications")}
          </div>
        ) : (
          sortedNotifications.map((notification, index) => (
            <div
              key={notification._id}
              className={`notification-item ${notification.isRead ? "read" : "unread"}`}
              onClick={() => handleNotificationClick(notification)}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="notification-content">
                {notification.message || t("no_message", "No message")}
              </div>
              <div className="notification-time">
                {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}
              </div>
              {!notification.isRead && <div className="unread-dot"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;