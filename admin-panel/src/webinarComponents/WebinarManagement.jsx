import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next"; // Import translation hook
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./WebinarManagement.css";
import { FiArrowLeft } from "react-icons/fi";
import { FaSearch } from "react-icons/fa";

// Utility functions
const formatDateForInput = (dateString) =>
  new Date(dateString).toISOString().split("T")[0];

const getDayOfWeek = (date, lang = "en") => {
  const days = {
    en: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    ru: [
      "Воскресенье",
      "Понедельник",
      "Вторник",
      "Среда",
      "Четверг",
      "Пятница",
      "Суббота",
    ],
  };
  return days[lang][new Date(date).getDay()];
};

// Initial form data
const initialFormData = {
  title: "",
  titleRussian: "",
  date: "",
  dayOfWeek: "",
  dayOfWeekRussian: "",
  time: "",
  liveEmbed: "",
  eventSiteURL: "",
  chatEmbed: "",
  bannerUrl: "",
  bannerRussianURL: "",
  chiefGuestName: "",
  chiefGuestNameRussian: "",
  photoUrl: "",
  regalia: "",
  regaliaRussian: "",
};

const WebinarManagement = ({ selectedLanguage = "en" }) => {
  const { t, i18n } = useTranslation(); // Initialize translations
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [webinars, setWebinars] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [editingWebinar, setEditingWebinar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentLanguage = i18n.language;

  // Change language when selectedLanguage prop changes
  useEffect(() => {
    i18n.changeLanguage(selectedLanguage);
  }, [selectedLanguage, i18n]);

  // Fetch webinars on mount
  useEffect(() => {
    fetchData(`${baseUrl}/api/webinars`).then((data) =>
      setWebinars(data || [])
    );
  }, [baseUrl]);

  const fetchData = useCallback(async (url, options = {}) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...options,
      });

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      return await response.json();
    } catch (error) {
      toast.error(t("error.general"));
      return [];
    }
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...formData, [name]: value };

    if (name === "date") {
      updatedFormData.dayOfWeek = getDayOfWeek(value, "en");
      updatedFormData.dayOfWeekRussian = getDayOfWeek(value, "ru");
    }

    setFormData(updatedFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingWebinar ? "PUT" : "POST";
    const url = editingWebinar
      ? `${baseUrl}/api/webinars/${editingWebinar._id}`
      : `${baseUrl}/api/webinars`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(t("error.savingWebinar"));

      toast.success(editingWebinar ? t("success.webinarUpdated") : t("success.webinarAdded"));
      setIsModalOpen(false);
      setFormData(initialFormData);

      fetchData(`${baseUrl}/api/webinars`).then((data) =>
        setWebinars(data || [])
      );
    } catch (error) {
      toast.error(t("error.savingWebinar"));
    }
  };

  const handleEdit = (webinar) => {
    setEditingWebinar(webinar);
    setFormData({
      ...webinar,
      date: formatDateForInput(webinar.date),
      dayOfWeek: getDayOfWeek(webinar.date, "en"),
      dayOfWeekRussian: getDayOfWeek(webinar.date, "ru"),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await fetchData(`${baseUrl}/api/webinars/${id}`, { method: "DELETE" });
      toast.success(t("success.webinarDeleted"));
      setWebinars((prev) => prev.filter((webinar) => webinar._id !== id));
    } catch (error) {
      toast.error(t("error.deletingWebinar"));
    }
  };

  const filteredWebinars = Array.isArray(webinars)
    ? webinars.filter((webinar) =>
        webinar.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleGoBack = () => {
    navigate("/webinar-dashboard", { replace: true });
  };

  return (
    <div className="webinar-management-container-page">
      <div className="webinar-management-header">
        <div className="webinar-management-left-header">
          <div className="go-back">
            <FiArrowLeft className="go-back-icon" onClick={handleGoBack} />
          </div>
          <h2>{t("webinarManagement.title")}</h2>
        </div>
        <div className="webinar-search-container">
          <div className="webinar-search-bar-wrapper">
            <FaSearch className="webinar-search-icon" />
            <input
              type="text"
              placeholder={t("webinarManagement.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="webinar-search-bar"
            />
          </div>

          <button
            onClick={() => {
              setFormData(initialFormData);
              setEditingWebinar(null);
              setIsModalOpen(true);
            }}
          >
            {t("webinarManagement.addWebinar")}
          </button>
        </div>
      </div>

      <ul className="webinar-list">
        {filteredWebinars.map((webinar) => (
          <li key={webinar._id} className="webinar-item">
            <div className="webinar-item-content">
              <img src={currentLanguage==="ru" ? webinar.bannerRussianURL : webinar.bannerUrl} alt={webinar.title} />
              <div className="webinar-model-details">
                <h3>{currentLanguage === "ru" ? webinar.titleRussian : webinar.title}</h3>
                <p>
                  {formatDateForInput(webinar.date)} | {webinar.time}
                </p>
              </div>
            </div>
            
            <div className="webinar-actions">
              <button onClick={() => handleEdit(webinar)}>
                {t("webinarManagement.edit")}
              </button>
              <button onClick={() => handleDelete(webinar._id)}>
                {t("webinarManagement.delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {isModalOpen && (
        <div className="webinar-modal">
          <div className="webinar-modal-content">
            <div className="webinar-modal-header">
              <h3>
                {editingWebinar
                  ? t("webinarManagement.modal.editTitle")
                  : t("webinarManagement.modal.addTitle")}
              </h3>
              <button
                className="webinar-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="webinar-modal-body">
              <form onSubmit={handleSubmit}>
              {Object.keys(initialFormData).map((field) => (
  <div key={field} className="form-field-group">
    <label htmlFor={field} className="form-label">
      {t(`webinarManagement.fields.${field}`)}
    </label>
    <input
      id={field}
      type={
        field.includes("date")
          ? "date"
          : field.includes("time")
          ? "time"
          : "text"
      }
      name={field}
      value={formData[field] || ""}
      onChange={handleChange}
      required={["title", "date", "time"].includes(field)}
      className="form-input"
    />
  </div>
))}


                <button type="submit" className="submit-btn">
                  {editingWebinar
                    ? t("webinarManagement.modal.submitEdit")
                    : t("webinarManagement.modal.submitAdd")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default WebinarManagement;