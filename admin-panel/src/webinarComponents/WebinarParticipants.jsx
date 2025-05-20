import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./WebinarParticipants.css";
import { FaSearch } from "react-icons/fa";
import { FiSearch, FiArrowLeft } from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";

const WebinarParticipants = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { webinarId } = useParams();
  const { t, i18n } = useTranslation();
  const [participants, setParticipants] = useState([]);
  const [webinarTitle, setWebinarTitle] = useState("");
  const [webinarTitleRussian, setWebinarTitleRussian] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  const currentLanguage = i18n.language;
  const token = localStorage.getItem("token");

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
      setWebinarTitleRussian(data.titleRussian || ""); // Store Russian title separately
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error(t("webinarParticipants.errorFetchingParticipants"));
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

  const totalPages = Math.ceil(filteredParticipants.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const currentRecords = filteredParticipants.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  const exportCSV = () => {
    const csvContent = [
      [t("webinarParticipants.email"), t("webinarParticipants.status"), t("webinarParticipants.registeredAt")],
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

  const handleGoBack = () => {
    navigate("/webinar-dashboard", { replace: true });
  };

  return (
    <div className="webinar-participants-page">
      <div className="participants-page-container">
      <div className="participants-header">
      <div className="go-back">
            <FiArrowLeft className="go-back-icon" onClick={handleGoBack} />
          </div>
          <div>
          <h1>
          {currentLanguage === "ru"
            ? t("webinarParticipants.title", { webinarTitle: webinarTitleRussian || webinarTitle })
            : t("webinarParticipants.title", { webinarTitle })}
        </h1>
          </div>
        
      </div>

      <div className="webinar-search-container">
        <div className="webinar-search-bar-wrapper">
          <FaSearch className="webinar-search-icon" />
          <input
            type="text"
            className="webinar-search-bar"
            placeholder={t("webinarParticipants.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="export-btn-wrapper">
          <button className="export-btn" onClick={exportCSV} disabled={participants.length === 0}>
            {t("webinarParticipants.export")}
          </button>
        </div>
      </div>

      {loading ? (
        <p>{t("webinarParticipants.loading")}</p>
      ) : (
        <div>
          {currentRecords.length > 0 ? (
            <div className="participants-table-wrapper">
              <table className="participants-table">
                <thead>
                  <tr>
                    <th>{t("webinarParticipants.email")}</th>
                    <th>{t("webinarParticipants.status")}</th>
                    <th>{t("webinarParticipants.registeredAt")}</th>
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
            </div>
          ) : (
            <p>{t("webinarParticipants.noParticipants")}</p>
          )}
        </div>
      )}

      <ToastContainer />
    </div>
    </div>
    
  );
};

export default WebinarParticipants;
