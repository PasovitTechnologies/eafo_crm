import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import "./Dashboard.css";  // Ensure you have necessary styles
import { useTranslation } from "react-i18next";


const DocumentItem = ({ expandingSection, setExpandingSection }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  

  useEffect(() => {
      // ✅ Check if token is available in localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");  // Redirect to / if token is missing
      }
    }, [navigate]);

  const handleClick = () => {
    setExpandingSection("document");

    setTimeout(() => {
      navigate("/dashboard/document");
    }, 700);
  };

  return (
    <motion.div 
      className="dashboard-item document"
      whileTap={{ scale: 0.95 }} 
      onClick={handleClick}
    >
      {expandingSection === "document" && (
        <motion.div
          className="expanding-bg-fullscreen"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 50, opacity: 1, transition: { duration: 1.5, ease: "easeInOut" } }}
        />
      )}
      
      {/* About Us Section */}
      <div className="enquiry-content">
        <span className="enquiry-text">{t('document')}</span>
      </div>

      {/* Image Section */}
      <div className="image-container">
        <img
          src="https://static.wixstatic.com/shapes/df6cc5_3d7ec8bef9a74715a48a825960d0d4e8.svg"
          alt="About Us Icon"
          className="about-image"
        />
      </div>

      {/* Arrow Icon */}
      <div className="profile-arrow-right-top">
        <FaArrowRight className="arrow-icon-top" />
      </div>
    </motion.div>
  );
};

export default DocumentItem;
