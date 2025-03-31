import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WebinarDashboard.css";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import { FiSearch, FiArrowLeft } from "react-icons/fi";  // Search icon for better UI

const WebinarDashboard = ({ selectedLanguage }) => {
  const [webinars, setWebinars] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BASE_URL;

  // ✅ Fetch Webinars
  const fetchWebinars = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${baseUrl}/api/webinars`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch webinars");
      }

      const data = await response.json();
      setWebinars(data);
    } catch (error) {
      console.error("Error fetching webinars:", error);
      toast.error(
        selectedLanguage === "Russian"
          ? "Ошибка при получении данных вебинара"
          : "Error fetching webinars"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebinars();
  }, []);

  const handleWebinarClick = (webinarId) => {
    navigate(`/webinar-dashboard/${webinarId}/webinar-participants`);
  };
  

  // ✅ Filter webinars based on search query
  const filteredWebinars = webinars.filter((webinar) =>
    webinar.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGoBack = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="webinar-dashboard-container">
      {/* Navbar */}
      <div className="webinar-dashboard-header">
      <div className="webinar-dashboard-right-header">
         <div className="go-back">
                    <FiArrowLeft className="go-back-icon" onClick={handleGoBack} />
                  </div>
        <h2>
          {selectedLanguage === "Russian"
            ? "Панель управления вебинаром"
            : "Webinar Dashboard"}
        </h2>
      </div>
      <div className="search-container">
        <div className="search-bar-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-bar"
            placeholder={
              selectedLanguage === "Russian"
                ? "Поиск вебинаров..."
                : "Search webinars..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      </div>

      {/* Search Bar */}
     

      {/* Loading Spinner */}
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading webinars...</p>
        </div>
      ) : (
        <div className="webinar-list">
          {filteredWebinars.length > 0 ? (
            filteredWebinars.map((webinar) => (
              <div
                key={webinar._id}
                className="webinar-dashboard-webinar-card"
                onClick={() => handleWebinarClick(webinar._id)}
              >
                {/* Webinar Details */}
                <div className="webinar-details">
                  <div className="webinar-image">
                    <img
                      src={webinar.bannerUrl}
                      alt={`${webinar.title} banner`}
                      loading="lazy"
                    />
                  </div>

                  <div className="webinar-info">
                    <h2 className="webinar-title">{webinar.title}</h2>
                    <div className="webinar-time">
                      <p>
                        <strong>
                          {selectedLanguage === "Russian" ? "Дата:" : "Date:"}
                        </strong>{" "}
                        {webinar.date}
                      </p>
                      <p>
                        <strong>
                          {selectedLanguage === "Russian" ? "Время:" : "Time:"}
                        </strong>{" "}
                        {webinar.time}
                      </p>
                    </div>
                  </div>

                  {/* Registration Stats */}
                  <div className="webinar-stats">
                    <div className="stats-box">
                      <p className="webinar-stats-number">
                        {webinar.participants?.length || 0}
                      </p>
                      <p className="stats-label">
                        {selectedLanguage === "Russian"
                          ? "Всего регистраций"
                          : "Total Registrations"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="no-results">
              {selectedLanguage === "Russian"
                ? "Вебинары не найдены"
                : "No webinars found"}
            </p>
          )}
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default WebinarDashboard;
