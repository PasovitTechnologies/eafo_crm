import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./WebinarParticipants.css";
import { FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PropTypes from "prop-types";

// Type definitions (if using TypeScript)
// interface Participant {
//   email: string;
//   status?: string;
//   registeredAt?: string;
// }

const translations = {
  English: {
    title: "{webinarTitle} - Participants",
    searchPlaceholder: "Search by email",
    email: "Email",
    status: "Status",
    registeredAt: "Registered At",
    noParticipants: "No participants found.",
    errorFetchingParticipants: "Error fetching participants",
    previous: "Previous",
    next: "Next",
    export: "Export CSV",
    loading: "Loading...",
  },
  Russian: {
    title: "{webinarTitle} - Участники",
    searchPlaceholder: "Искать по электронной почте",
    email: "Электронная почта",
    status: "Статус",
    registeredAt: "Зарегистрирован в",
    noParticipants: "Участники не найдены.",
    errorFetchingParticipants: "Ошибка при получении участников",
    previous: "Назад",
    next: "Далее",
    export: "Экспорт CSV",
    loading: "Загрузка...",
  },
};

const WebinarParticipants = ({ selectedLanguage = "English" }) => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { webinarId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [webinarTitle, setWebinarTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  const token = localStorage.getItem("token");

  const safeTranslate = (key) => {
    const lang = translations[selectedLanguage] ? selectedLanguage : "English";
    return translations[lang][key] || translations.English[key];
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/webinars/${webinarId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch participants");
      }

      const data = await response.json();
      setParticipants(
        (data.participants || []).sort(
          (a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)
        )
      );
      setWebinarTitle(data.title || "");
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error(safeTranslate("errorFetchingParticipants"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (webinarId) {
      fetchParticipants();
    }
  }, [webinarId]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return "N/A";
    }
  };

  const filteredParticipants = participants.filter((participant) =>
    participant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredParticipants.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const currentRecords = filteredParticipants.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  // Export CSV Function
  const exportCSV = () => {
    const csvContent = [
      [safeTranslate("email"), safeTranslate("status"), safeTranslate("registeredAt")],
      ...participants.map((p) => [
        p.email || "N/A",
        p.status || "N/A",
        formatDate(p.registeredAt),
      ]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${webinarTitle || "webinar"}_participants.csv`;
    link.click();
  };

  return (
    <div className="participants-page-container">
      <div className="participants-header">
        <h1>
          {safeTranslate("title").replace("{webinarTitle}", webinarTitle)}
        </h1>
      </div>

      {/* Search Bar & Export Button */}
      <div className="search-export-container">
        <div className="search-bar-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-bar"
            placeholder={safeTranslate("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search participants"
          />
        </div>
        
        {/* Export Button */}
        <div className="export-btn-wrapper">
          <button 
            className="export-btn" 
            onClick={exportCSV}
            disabled={participants.length === 0}
          >
            {safeTranslate("export")}
          </button>
        </div>
      </div>

      {loading ? (
        <p>{safeTranslate("loading")}</p>
      ) : (
        <div>
          {currentRecords.length > 0 ? (
            <div className="participants-table-wrapper">
              <table className="participants-table">
                <thead>
                  <tr>
                    <th>{safeTranslate("email")}</th>
                    <th>{safeTranslate("status")}</th>
                    <th>{safeTranslate("registeredAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((participant, index) => (
                    <tr key={`${participant.email}-${index}`}>
                      <td>{participant.email || "N/A"}</td>
                      <td>{participant.status || "N/A"}</td>
                      <td>{formatDate(participant.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    aria-label={safeTranslate("previous")}
                  >
                    {safeTranslate("previous")}
                  </button>
                  <span>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    aria-label={safeTranslate("next")}
                  >
                    {safeTranslate("next")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="no-participants">
              {safeTranslate("noParticipants")}
            </p>
          )}
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

WebinarParticipants.propTypes = {
  selectedLanguage: PropTypes.oneOf(Object.keys(translations)),
};

WebinarParticipants.defaultProps = {
  selectedLanguage: "English",
};

export default WebinarParticipants;