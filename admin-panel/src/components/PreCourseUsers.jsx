import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEnvelope, FaWhatsapp, FaTelegramPlane } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import "../i18n"; // Ensure this is imported once at root level

import "./PreCourse.css";
import EmailModal from "./EmailModal";
import WhatsAppChatBot from "./WhatsAppChatBot";
import TelegramChatBot from "./TelegramChatBot";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function PreCourseUsers() {
  const { courseId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDetails, setEmailDetails] = useState({});
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState("");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramPhoneNumber, setTelegramPhoneNumber] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("No token found.");
          return;
        }

        const userRes = await axios.get(`${baseUrl}/api/precourse/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const allUsers = userRes.data.filter(user => user.courseId === courseId);

        const enhancedUsers = await Promise.all(
          allUsers.map(async (user) => {
            let uiStatus = "red";
            let courseStatus = "red";

            try {
              const uiRes = await axios.get(`${baseUrl}/api/user/${user.email}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (uiRes.data?.email) uiStatus = "green";
            } catch (err) {}

            try {
              const courseRes = await axios.get(`${baseUrl}/api/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              const payments = courseRes.data?.payments || [];
              const exists = payments.some(p => p.email === user.email);
              if (exists) courseStatus = "green";
            } catch (err) {}

            return {
              email: user.email,
              phone: user.phone,
              firstName: user.firstName,
              middleName: user.middleName,
              lastName: user.lastName,
              uiStatus,
              courseStatus,
            };
          })
        );

        setUsers(enhancedUsers);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    fetchEmails();
  }, [courseId]);

  const handleEmailClick = (email) => {
    setEmailDetails({ to: email, subject: "", body: "", attachment: null });
    setShowEmailModal(true);
  };

  const handleWhatsAppClick = (phone) => {
    setWhatsappPhoneNumber(phone);
    setShowWhatsAppModal(true);
  };

  const handleTelegramClick = (phone) => {
    setTelegramPhoneNumber(phone);
    setShowTelegramModal(true);
  };

  const generateContactIcons = (email, phone) => (
    <div className="user-contact-icons">
      <div className="user-icon-email" onClick={() => handleEmailClick(email)}>
        <FaEnvelope />
      </div>
      <div className="user-icon-whatsapp" onClick={() => handleWhatsAppClick(phone)}>
        <FaWhatsapp />
      </div>
      <div className="user-icon-telegram" onClick={() => handleTelegramClick(phone)}>
        <FaTelegramPlane />
      </div>
    </div>
  );

  const filteredUsers = users.filter(user => {
    if (filter === "not_registered") return user.uiStatus === "red" && user.courseStatus === "red";
    if (filter === "ui_registered") return user.uiStatus === "green" && user.courseStatus === "red";
    if (filter === "all_registered") return user.uiStatus === "green" && user.courseStatus === "green";
    return true;
  });

  const handleRowClick = (uiStatus, email) => {
    if (uiStatus === "red") {
      toast.warn(
        <div>
          <p>{t("preCourseUsers.user_not_registered")}</p>
          <p>{t("preCourseUsers.register_first")}</p>
        </div>,
        { autoClose: 3000 }
      );
      return;
    }
    navigate(`/userbase/userbase-details/${email}`);
  };

  return (
    <div className="pre-user-list">
      <h2>{t("preCourseUsers.registered_users")}</h2>

      <div className="precourse-filter-container">
        <label>{t("preCourseUsers.filter_label")}: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{t("preCourseUsers.filter.all")}</option>
          <option value="not_registered">{t("preCourseUsers.filter.not_registered")}</option>
          <option value="ui_registered">{t("preCourseUsers.filter.ui_registered")}</option>
          <option value="all_registered">{t("preCourseUsers.filter.all_registered")}</option>
        </select>
      </div>

      <table className="pre-table">
        <thead>
          <tr>
            <th>{t("preCourseUsers.name")}</th>
            <th>{t("preCourseUsers.email")}</th>
            <th>{t("preCourseUsers.ui_status")}</th>
            <th>{t("preCourseUsers.course_status")}</th>
            <th>{t("preCourseUsers.contact")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="5">{t("preCourseUsers.no_users")}</td>
            </tr>
          ) : (
            filteredUsers.map((user, idx) => (
              <tr 
                key={idx}
                onClick={() => handleRowClick(user.uiStatus, user.email)}
                style={{ 
                  cursor: user.uiStatus === "green" ? 'pointer' : 'not-allowed',
                  opacity: user.uiStatus === "red" ? 0.8 : 1
                }}
                className={`user-row ${user.uiStatus === "red" ? 'disabled-row' : ''}`}
              >
                <td>{user.firstName} {user.middleName} {user.lastName}</td>
                <td>{user.email}</td>
                <td>
                  <span className={user.uiStatus === "green" ? "status-green" : "status-red"}>
                    {t(`preCourseUsers.${user.uiStatus === "green" ? "registered" : "not_registered"}`)}
                  </span>
                </td>
                <td>
                  <span className={user.courseStatus === "green" ? "status-green" : "status-red"}>
                    {t(`preCourseUsers.${user.courseStatus === "green" ? "registered" : "not_registered"}`)}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {generateContactIcons(user.email, user.phone)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showEmailModal && (
        <EmailModal emailDetails={emailDetails} onClose={() => setShowEmailModal(false)} />
      )}
      {showWhatsAppModal && (
        <WhatsAppChatBot
          isOpen={showWhatsAppModal}
          phoneNumber={whatsappPhoneNumber}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
      {showTelegramModal && (
        <TelegramChatBot
          isOpen={showTelegramModal}
          phoneNumber={telegramPhoneNumber}
          onClose={() => setShowTelegramModal(false)}
        />
      )}
    </div>
  );
}
