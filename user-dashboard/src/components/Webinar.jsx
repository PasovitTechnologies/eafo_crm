import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Webinar.css";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import Loading from "./Loading";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';  // Import the CSS file

import { useTranslation } from "react-i18next";
import CourseHelp from "./HelpComponents/CourseHelp";
import WebinarHelp from "./HelpComponents/WebinarHelp";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Webinar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState([]);
  const [filteredWebinars, setFilteredWebinars] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeredWebinars, setRegisteredWebinars] = useState(new Set());
  const [registrationLoading, setRegistrationLoading] = useState(true); // For registration status loading
  const currentLanguage = i18n.language;
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    fetchWebinars();
  }, []);

  const fetchWebinars = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/webinars`);
      if (!response.ok) throw new Error("Failed to fetch webinars");

      const data = await response.json();

      const processedWebinars = data
        .map((webinar) => {
          const fullDate = new Date(`${webinar.date}T${webinar.time}`);
          return {
            ...webinar,
            fullDate,
            formattedDate: fullDate.toLocaleDateString("en-GB"),
          };
        })
        .sort((a, b) => b.fullDate - a.fullDate);

      setWebinars(processedWebinars);
      setFilteredWebinars(processedWebinars);

      // After webinars are fetched, load the registration status
      fetchRegisteredWebinars(processedWebinars);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredWebinars = async (webinars) => {
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");

    if (!userEmail || !token) {
      setRegistrationLoading(false);
      return;
    }

    try {
      const registeredSet = new Set();
      await Promise.all(
        webinars.map(async (webinar) => {
          try {
            const response = await fetch(
              `${baseUrl}/api/webinars/${webinar._id}/status?email=${userEmail}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) return;

            const data = await response.json();
            if (data.registered) registeredSet.add(webinar._id);
          } catch (error) {
            console.error(`Error checking status for webinar ${webinar._id}:`, error);
          }
        })
      );
      setRegisteredWebinars(registeredSet);
    } catch (error) {
      console.error("Error fetching registration status:", error);
    } finally {
      setRegistrationLoading(false); // Set registration loading to false
    }
  };

  const handleRegister = async (webinarId, e) => {
    e.stopPropagation();
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");
  
    if (!userEmail || !token) {
      toast.error("Please log in to register.");  // Show error toast
      return;
    }
  
    try {
      const response = await fetch(
        `${baseUrl}/api/webinars/${webinarId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: userEmail }),
        }
      );
  
      if (!response.ok) throw new Error("Failed to register");
  
      setRegisteredWebinars((prev) => new Set([...prev, webinarId]));
      toast.success("Registered successfully!");  // Show success toast
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");  // Show error toast
    }
  };

  // Filtering and search logic
  useEffect(() => {
    let filtered = webinars;

    if (filter === "Upcoming") {
      filtered = webinars.filter((w) => w.fullDate > new Date());
    } else if (filter === "Past") {
      filtered = webinars.filter((w) => w.fullDate < new Date());
    } else if (filter === "Registered") {
      filtered = webinars.filter((w) => registeredWebinars.has(w._id));
    }

    if (searchQuery) {
      filtered = filtered.filter((w) =>
        w.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredWebinars(filtered);
  }, [filter, searchQuery, webinars, registeredWebinars]);

  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup);
  };


  const formatSlug = (title) => title.toLowerCase().replace(/\s+/g, "-");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="webinar-page">
              {showHelpPopup && <WebinarHelp onClose={toggleHelpPopup} />}
        
        <div className="breadcrumb webinar-head-container">
       <div style={{display:"flex", gap:"20px"}}>
          <button
          type="button"
          className="back-icon-button"
          aria-label={t("forgetPasswordPage.backToLogin")}
          >
                        <FaArrowLeft />
                      </button>
          <span onClick={() => navigate("/dashboard")}>
            {t("webinar.breadcrumb_dashboard")}
          </span>{" "}
          / <span>{t("webinar.breadcrumb_webinars")}</span>

          </div>

          <button className="webinar-help-button" onClick={toggleHelpPopup}>
          {t("webinar.help")}
        </button>
        </div>

        <div className="search-filter-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={t("webinar.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="custom-dropdown">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="All">{t("webinar.all")}</option>
              <option value="Upcoming">{t("webinar.upcoming")}</option>
              <option value="Past">{t("webinar.past")}</option>
              <option value="Registered">{t("webinar.registered")}</option>
            </select>
          </div>
        </div>

        <div className="webinar-list">
          {loading && <Loading />}
          {registrationLoading && <Loading />}
          {error && <p className="error">{error}</p>}
          {!loading && !registrationLoading && filteredWebinars.length === 0 && (
            <div className="no-webinars-container">
              <img
                src="https://static.wixstatic.com/shapes/df6cc5_b4ccbd2144e64fdfa1af9c569c821680.svg"
                alt="No webinars"
                className="no-webinars-image"
              />
              <p className="no-webinars-text">{t("webinar.no_webinars")}</p>
            </div>
          )}

          {!loading && !registrationLoading &&
            filteredWebinars.map((webinar) => {
              const isRegistered = registeredWebinars.has(webinar._id);

              return (
                <div
                  className="webinar-card"
                  key={webinar._id}
                  onClick={() =>
                    navigate(`/dashboard/webinars/${formatSlug(webinar.title)}`, {
                      state: { webinarId: webinar._id },
                    })
                  }
                >
                  <img
                    src={
                      currentLanguage === "ru"
                        ? webinar.bannerRussianURL
                        : webinar.bannerUrl
                    }
                    alt={webinar.title}
                    className="webinar-image"
                  />

                  <div className="webinar-info">
                    <h3>
                      {currentLanguage === "ru"
                        ? webinar.titleRussian
                        : webinar.title}
                    </h3>
                    <p>
                      <strong>{t("webinar.date")}:</strong> {webinar.formattedDate}
                    </p>
                    <p>
                      <strong>{t("webinar.time")}:</strong> {webinar.time}
                    </p>
                  </div>

                  <div className="webinar-actions">
                    {isRegistered ? (
                      <button
                        className="watch-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/dashboard/webinars/${formatSlug(webinar.title)}/watch-webinar`,
                            { state: { webinarId: webinar._id } }
                          );
                        }}
                      >
                        {t("webinar.watch_webinar")}
                      </button>
                    ) : (
                      <button
                        className="register-btn"
                        onClick={(e) => handleRegister(webinar._id, e)}
                      >
                        {t("webinar.register_now")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
};

export default Webinar;
