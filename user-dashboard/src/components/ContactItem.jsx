import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowRight,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaFacebook,
  FaVk,
  FaInstagram,
  FaTelegram,
  FaWhatsapp,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Dashboard.css";

const ContactItem = ({ expandingSection, setExpandingSection }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  const handleClick = () => {
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  const handleEmailClick = (email) => {
    window.location.href = `mailto:${email}`;
  };

  const handlePhoneClick = (phoneNumber) => {
    window.location.href = `tel:${phoneNumber.replace(/[^\d+]/g, "")}`;
  };

  return (
    <>
      <motion.div
        className="dashboard-item contact"
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
      >
        {expandingSection === "contact" && (
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

        <div className="enquiry-content">
          <h3 className="enquiry-text">{t("contactUs.title")}</h3>
        </div>
        <div className="image-container">
                <img
                  src="https://static.wixstatic.com/shapes/df6cc5_393f7ae9fb5d454ebc9a7518da9459e7.svg"
                  className="contact-image"
                />
              </div>

        <div className="profile-arrow-right-top">
          <FaArrowRight className="arrow-icon-top" />
        </div>
      </motion.div>

      <AnimatePresence>
        {isPopupOpen && (
          <motion.div
            className="contact-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopup}
          >
            <motion.div
              className="contact-popup-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-popup-btn" onClick={closePopup}>
                <FaTimes />
              </button>

              <div className="contact-popup-header">
                <h2>{t("contactUs.title")}</h2>
              </div>

             

              <div className="contact-popup-body">
                <div
                  className="contact-method"
                  onClick={() => handlePhoneClick("+7 (931) 111-22-55")}
                >
                  <div className="contact-icon phone-icon">
                    <FaPhone />
                  </div>
                  <div>
                    <h4>{t("contactUs.phone")}</h4>
                    <p>+7 (931) 111-22-55</p>
                  </div>
                </div>

                <div
                  className="contact-method"
                  onClick={() => handleEmailClick("info@eafo.info")}
                >
                  <div className="contact-icon email-icon">
                    <FaEnvelope />
                  </div>
                  <div>
                    <h4>{t("contactUs.enquiry")}</h4>
                    <p>info@eafo.info</p>
                  </div>
                </div>

                <div
                  className="contact-method"
                  onClick={() => handleEmailClick("support@eafo.info")}
                >
                  <div className="contact-icon support-icon">
                    <FaEnvelope />
                  </div>
                  <div>
                    <h4>{t("contactUs.technicalComplaints")}</h4>
                    <p>support@eafo.info</p>
                  </div>
                </div>

                {/* Social Media Icons */}
                <div className="social-media-icons">
                  <a
                    href="https://www.facebook.com/share/1ALUfDB5Ek/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon facebook"
                  >
                    <FaFacebook />
                  </a>
                  <a
                    href="https://vk.com/eafo_info"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon vk"
                  >
                    <FaVk />
                  </a>
                  <a
                    href="https://www.instagram.com/eafo_official?igsh=ZDFyMXUxamNmNm5v"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon instagram"
                  >
                    <FaInstagram />
                  </a>
                  <a
                    href="https://t.me/eafo_official"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon telegram"
                  >
                    <FaTelegram />
                  </a>
                  <a
                    href="https://wa.me/79311112255"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon whatsapp"
                  >
                    <FaWhatsapp />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ContactItem;
