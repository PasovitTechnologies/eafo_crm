import React, { useState, useEffect, useRef } from "react";
import { FaCog, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";  // ✅ Import useNavigate
import { useTranslation } from "react-i18next";   // ✅ Import translation hook
import "./SettingsButton.css";

const SettingsButton = ({ setSelectedLanguage, setSelectedOS }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedLanguage, setLocalSelectedLanguage] = useState(
    localStorage.getItem("selectedLanguage") || "ru"
  );
  const [selectedOS, setLocalSelectedOS] = useState(
    localStorage.getItem("selectedOS") || "EAFO CRM"
  );

  const { i18n } = useTranslation();   // ✅ Get i18n instance
  const navigate = useNavigate();  
  const popupRef = useRef(null);

  useEffect(() => {
    setSelectedLanguage(selectedLanguage);
    setSelectedOS(selectedOS);
    i18n.changeLanguage(selectedLanguage);   // ✅ Update i18n language globally
  }, [selectedLanguage, selectedOS, setSelectedLanguage, setSelectedOS, i18n]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopup]);

  const toggleLanguage = () => {
    const newLanguage = selectedLanguage === "ru" ? "en" : "ru";
    setLocalSelectedLanguage(newLanguage);
    localStorage.setItem("selectedLanguage", newLanguage);
    i18n.changeLanguage(newLanguage);  // ✅ Change language globally
  };

  const toggleOS = () => {
    const newOS = selectedOS === "EAFO CRM" ? "Webinar" : "EAFO CRM";
    setLocalSelectedOS(newOS);
    localStorage.setItem("selectedOS", newOS);
    const path = newOS === "EAFO CRM" ? "/admin-dashboard" : "/webinar-dashboard";
    navigate(path);
  };

  return (
    <div className="settings-div">
      <button
        className="settings-button"
        onClick={() => setShowPopup(!showPopup)}
        aria-label="Open Settings"
      >
        <FaCog className="settings-icon" />
      </button>

      {showPopup && (
        <div className="settings-popup">
          <div className="settings-popup-content" ref={popupRef}>
            <button
              className="close-button"
              onClick={() => setShowPopup(false)}
              aria-label="Close Settings"
            >
              <FaTimes />
            </button>

            <h3>{selectedLanguage === "ru" ? "Выберите предпочтения" : "Select Your Preferences"}</h3>

            <div className="question">
              <label>{selectedLanguage === "ru" ? "Язык" : "Language"}</label>
              <div className="toggle-switch" onClick={toggleLanguage}>
                <span className={`toggle-label ${selectedLanguage === "ru" ? "active" : ""}`}>
                  Русский
                </span>
                <div className="switch-background">
                  <div className={`switch ${selectedLanguage === "ru" ? "left" : "right"}`} />
                </div>
                <span className={`toggle-label ${selectedLanguage === "en" ? "active" : ""}`}>
                  English
                </span>
              </div>
            </div>

            <div className="border-separator"></div>

            <div className="question">
              <label>{selectedLanguage === "ru" ? "Операционная система" : "Operating System"}</label>
              <div className="toggle-switch" onClick={toggleOS}>
                <span className={`toggle-label ${selectedOS === "EAFO CRM" ? "active" : ""}`}>
                  EAFO CRM
                </span>
                <div className="switch-background">
                  <div className={`switch ${selectedOS === "EAFO CRM" ? "left" : "right"}`} />
                </div>
                <span className={`toggle-label ${selectedOS === "Webinar" ? "active" : ""}`}>
                  Webinar
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsButton;
