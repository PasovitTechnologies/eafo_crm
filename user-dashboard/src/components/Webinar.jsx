import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Webinar.css";
import { motion } from "framer-motion";
import Loading from "./Loading";
import { useTranslation } from "react-i18next";


const baseUrl = import.meta.env.VITE_BASE_URL;

const Webinar = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState([]);
  const [filteredWebinars, setFilteredWebinars] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeredWebinars, setRegisteredWebinars] = useState(new Set());
  const currentLanguage = i18n.language; 

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);


  useEffect(() => {
    fetchWebinars();
  }, []);

  // 🔹 Fetch Webinars
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
        .sort((a, b) => b.fullDate - a.fullDate); // Sort by latest

      setWebinars(processedWebinars);
      setFilteredWebinars(processedWebinars);

      fetchRegisteredWebinars(processedWebinars);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch Registration Status
  const fetchRegisteredWebinars = async (webinars) => {
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");

    if (!userEmail || !token) return;

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
            console.error(
              `Error checking status for webinar ${webinar._id}:`,
              error
            );
          }
        })
      );

      setRegisteredWebinars(registeredSet);
    } catch (error) {
      console.error("Error fetching registration status:", error);
    }
  };

  // 🔹 Handle Register
  const handleRegister = async (webinarId, e) => {
    e.stopPropagation();
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");

    if (!userEmail || !token) {
      alert("Please log in to register.");
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
      alert("Registered successfully!");
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  // 🔹 Filtering Logic
  useEffect(() => {
    let filtered = webinars;

    if (filter === "Upcoming") {
      filtered = webinars.filter((w) => w.fullDate > new Date());
    } else if (filter === "Past") {
      filtered = webinars.filter((w) => w.fullDate < new Date());
    }

    if (searchQuery) {
      filtered = filtered.filter((w) =>
        w.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredWebinars(filtered);
  }, [filter, searchQuery, webinars]);

  // 🔹 Format Slug
  const formatSlug = (title) => title.toLowerCase().replace(/\s+/g, "-");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="webinar-page">
        <div className="breadcrumb">
          <span onClick={() => navigate("/")}>{t("webinar.breadcrumb_dashboard")}</span> /{" "}
          <span>{t("webinar.breadcrumb_webinars")}</span>
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
            </select>
          </div>
        </div>

        <div className="webinar-list">
          {loading && <Loading />}
          {error && <p className="error">{error}</p>}
          {!loading && filteredWebinars.length === 0 && (
            <div className="no-webinars-container">
              <img
                src="https://static.wixstatic.com/shapes/df6cc5_b4ccbd2144e64fdfa1af9c569c821680.svg"
                alt="No webinars"
                className="no-webinars-image"
              />
              <p className="no-webinars-text">No webinars found.</p>
            </div>
          )}

          {!loading &&
            filteredWebinars.map((webinar) => {
              const isRegistered = registeredWebinars.has(webinar._id);

              return (
                <div
                  className="webinar-card"
                  key={webinar._id}
                  onClick={() =>
                    navigate(
                      `/dashboard/webinars/${formatSlug(webinar.title)}`,
                      {
                        state: { webinarId: webinar._id },
                      }
                    )
                  }
                >
                  <img
                    src={currentLanguage==="ru" ? webinar.
                      bannerRussianURL:webinar.
                      bannerUrl}
                    alt={webinar.title}
                    className="webinar-image"
                  />

                  <div className="webinar-info">
                    <h3>{currentLanguage==="ru" ? webinar.
                      titleRussian:webinar.
                      title}</h3>
                    <p>
                      <span>
                        <strong>Date:</strong>
                      </span>{" "}
                      {webinar.formattedDate}
                    </p>
                    <p>
                      <span>
                        <strong>Time:</strong>
                      </span>{" "}
                      {webinar.time}
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
                            {
                              state: { webinarId: webinar._id },
                            }
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
