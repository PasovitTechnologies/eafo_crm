import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import { useTranslation } from "react-i18next"; // 🌍 Import translation hook

const baseUrl = import.meta.env.VITE_BASE_URL;

const WebinarsItem = ({ expandingSection, setExpandingSection }) => {
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/webinars`);
        if (!response.ok) throw new Error("Failed to fetch webinars");

        const data = await response.json();
        const now = new Date();

        const upcomingWebinars = data
          .map((webinar, index) => ({
            ...webinar,
            id: index, // Ensure each webinar has a unique ID
            fullDate: new Date(`${webinar.date}T${webinar.time}`),
          }))
          .filter((webinar) => webinar.fullDate > now)
          .sort((a, b) => a.fullDate - b.fullDate);

        setWebinars(upcomingWebinars);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  useEffect(() => {
    if (webinars.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % webinars.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [webinars]);

  const handleClick = () => {
    setExpandingSection("webinars");
    setTimeout(() => {
      navigate("/dashboard/webinars");
    }, 700);
  };

  return (
    <motion.div
      className="dashboard-item webinars"
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      style={{ perspective: "1000px" }} // Ensures proper 3D flip effect
    >
      {expandingSection === "webinars" && (
        <motion.div
          className="expanding-bg-fullscreen"
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: 50,
            opacity: 1,
            transition: { duration: 1.5, ease: "easeInOut" },
          }}
        />
      )}

<div className="webinars-content">
        <h3>{t("webinar.breadcrumb_webinars")}</h3>

        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && webinars.length > 0 ? (
          <div className="webinar-slider">
            <AnimatePresence mode="wait">
              <motion.div
                key={webinars[currentIndex]?.id}
                initial={{ rotateX: 90, opacity: 0, transformOrigin: "bottom" }}
                animate={{
                  rotateX: 0,
                  opacity: 1,
                  transition: { duration: 0.6, ease: "easeInOut" },
                }}
                exit={{
                  rotateX: -90,
                  opacity: 0,
                  transformOrigin: "top",
                  transition: { duration: 0.6, ease: "easeInOut" },
                }}
                className="webinar-details"
              >
                <div className="upcoming-label">
                  <span className="dot"></span> {t("webinar.upcoming")}
                </div>
                <h4 className="webinar-title">
                  {currentLanguage === "ru"
                    ? webinars[currentIndex].titleRussian
                    : webinars[currentIndex].title}
                </h4>
                <p>
                  {webinars[currentIndex].date} (
                  {webinars[currentIndex].dayOfWeek})
                </p>
                <p>{webinars[currentIndex].time}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          !loading && <p>{t("webinar.no_upcoming_webinar")}</p>
        )}
      </div>
      <img
        src="https://static.wixstatic.com/shapes/df6cc5_087da3679f794796ba83be90b8db2f7d.svg"
        alt="Webinar Icon"
        className="webinar-icon"
      />
      <div className="profile-arrow-right">
        <FaArrowRight className="arrow-icon" />
      </div>
    </motion.div>
  );
};

export default WebinarsItem;
