import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaPencilAlt } from "react-icons/fa";
import "./Dashboard.css"; // Ensure you have the styles updated
import { useTranslation } from "react-i18next";



const ProfileItem = ({ user, expandingSection, setExpandingSection }) => {
  const navigate = useNavigate();
  const [profileAnimating, setProfileAnimating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [imageUrl, setImageUrl] = useState(""); // Store fetched image URL
  const { t, i18n } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;

 
  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);


  useEffect(() => {
    // Display the welcome message after a brief delay for animation effect
    const timeout = setTimeout(() => setShowWelcome(true), 500);
    return () => clearTimeout(timeout);
  }, []);

  // 🌟 Fetch image separately from MongoDB using the dedicated endpoint
  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const imageResponse = await fetch(`${baseUrl}/api/user/image/${user?.email}`);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const imageUrl = URL.createObjectURL(imageBlob);
          setImageUrl(imageUrl);  // ✅ Set the image URL
        } else {
          console.error("Failed to fetch image");
        }
      } catch (error) {
        console.error("Error fetching image:", error);
      }
    };

    if (user?.email) {
      fetchProfileImage();
    }
  }, [user?.email]);

  const handleProfileClick = () => {
    setExpandingSection("profile");
    setProfileAnimating(true);

    setTimeout(() => {
      navigate("/profile");
    }, 700);
  };

  // 🌟 Friendly welcome message with "Hi 👋" emoji
  const getWelcomeMessage = () => {
    if (!user?.personalDetails) return `${t('profile.welcome')} 👋, Guest!`;
  
    const { firstName, lastName, middleName } = user.personalDetails;
    const dashboardLang = user?.dashboardLang; // Get dashboardLang from user
  
    const nameFormat =
      dashboardLang === "ru"
        ? `${lastName || ""} ${firstName || ""} ${middleName || ""}`
        : `${firstName || ""} ${middleName || ""} ${lastName || ""}`;
  
    return `${t('profile.welcome')} 👋, ${nameFormat.trim() || "Guest"}!`;
  };

  return (
    <motion.div
      className="dashboard-item profile-div"
      whileTap={{ scale: 0.95 }}
      onClick={handleProfileClick}
    >
      {expandingSection === "profile" && (
        <motion.div
          className="expanding-bg-fullscreen"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 50, opacity: 1, transition: { duration: 1.5, ease: "easeInOut" } }}
        />
      )}

      <div className="profile-header">
        <div
          className="edit-profile"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/profile", { state: { isEditMode: true } });
          }}
        >
          <span>{t('profile.edit')}</span>
          <FaPencilAlt className="edit-icon" />
        </div>
      </div>

      <motion.div
        className="profile-frame"
        initial={{ opacity: 1 }}
        animate={profileAnimating ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="profile-image-container"
          animate={profileAnimating ? { x: "-50vw", y: "-50vh", scale: 0.5, opacity: 0 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <img
  src={imageUrl || "https://static.wixstatic.com/media/df6cc5_dc3fb9dd45a9412fb831f0b222387da1~mv2.jpg"}
  alt="Profile"
  className="profile-image"
  onError={(e) => {
    e.target.onerror = null; // Prevent infinite loop
    e.target.src = "https://static.wixstatic.com/media/df6cc5_dc3fb9dd45a9412fb831f0b222387da1~mv2.jpg"; // Default image
  }}
/>

        </motion.div>

        <div className="profile-text">
          <AnimatePresence>
            {showWelcome && (
              <motion.p
                className="profile-welcome"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                {getWelcomeMessage()}
              </motion.p>
            )}
          </AnimatePresence>
          <p className="profile-university">{user?.professionalDetails?.university || "Guest"}</p>
        </div>
      </motion.div>

      <div className="profile-arrow-right">
        <FaArrowRight className="arrow-icon" />
      </div>
    </motion.div>
  );
};

export default ProfileItem;
