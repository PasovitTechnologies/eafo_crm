import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowRight } from "react-icons/fa";
import { useTranslation } from "react-i18next"; // 🌍 Import translation hook


const CoursesItem = ({ expandingSection, setExpandingSection }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t, i18n } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const currentLanguage=i18n.language;
  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);

  
  useEffect(() => {
    const controller = new AbortController(); // 🛑 Prevents memory leaks
    const signal = controller.signal;

    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token"); // 🔐 Get auth token
        const headers = token ? { Authorization: `Bearer ${token}` } : {}; // Add token if available

        const response = await axios.get(`${baseUrl}/api/courses`, {
          headers,
          signal,
        });

        const today = new Date();
        const upcomingCourses = response.data.filter(
          (course) => new Date(course.date) >= today
        );

        setCourses(upcomingCourses);
      } catch (err) {
        if (axios.isCancel(err)) return; // ✅ Prevents state update on unmounted component
        console.error("🚨 Error fetching courses:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();

    return () => controller.abort(); // 🛑 Cleanup: Cancel API request if component unmounts
  }, []);


  // ⏩ Auto-slide every 4 seconds
  useEffect(() => {
    if (courses.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % courses.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [courses]);

  const handleClick = () => {
    setExpandingSection("courses");
    setTimeout(() => {
      navigate("/dashboard/courses");
    }, 700);
  };

  return (
    <motion.div
      className="dashboard-item courses"
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
    >
      {expandingSection === "courses" && (
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

      {/* ✅ Courses Title & Icon */}
      <div className="courses-content">
        <span className="enquiry-text">{t('courses.courses')}</span>
        {!loading && !error && courses.length > 0 ? (
          <div className="course-slider">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex} // ✅ Forces re-render on each index change
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
                className="course-details"
              >
                <div className="upcoming-label">
                  <span className="dot"></span> {t('courses.upcoming')}
                </div>
                <h4>{currentLanguage==="ru"? courses[currentIndex].nameRussian:courses[currentIndex].name}</h4>
                <p>
                  {new Date(courses[currentIndex].date).toLocaleDateString(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          !loading && <p className="no-courses-text">No upcoming courses.</p>
        )}
      </div>
      <div className="image-container">
        <img
          src="https://static.wixstatic.com/shapes/df6cc5_9a25c8efb35d47a19d43c1365f9ff0a3.svg"
          alt="Courses Icon"
          className="courses-image"
        />
      </div>
      <div className="profile-arrow-right-top">
        <FaArrowRight className="arrow-icon-top" />
      </div>
    </motion.div>
  );
};

export default CoursesItem;
