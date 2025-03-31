import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowRight } from "react-icons/fa";
import { useTranslation } from "react-i18next";


const CoursesItem = ({ expandingSection, setExpandingSection }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;


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
      navigate("/dashboard/enquiry");
    }, 700);
  };

  return (
    <motion.div
      className="dashboard-item payments"
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
    >
      {expandingSection === "payments" && (
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
      <div className="enquiry-content">
        <span className="enquiry-text">{t('enquiry.enquiries')}</span>
       
      </div>
      <div className="image-container">
        <img
          src="https://static.wixstatic.com/shapes/df6cc5_1fd2c9d7f1564557b53a0bd1103b146d.svg"
          alt="Courses Icon"
          className="enquiry-image"
        />
      </div>
      <div className="profile-arrow-right-top">
        <FaArrowRight className="arrow-icon-top" />
      </div>
    </motion.div>
  );
};

export default CoursesItem;
