import React, { useState, useEffect } from "react";
import { MdSupport, MdEmail, MdClose } from "react-icons/md";
import { FaWhatsapp, FaPhone, FaTelegram } from "react-icons/fa";
import "./ContactUs.css";
import { BiSupport } from "react-icons/bi";
import { useTranslation } from "react-i18next";

const ContactUs = () => {
  const [showPopup, setShowPopup] = useState(false);
  const { t } = useTranslation();

  const togglePopup = () => setShowPopup(!showPopup);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest(".contact-popup-content")) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="contact-us-div">
      <div className="contact-us-button" onClick={togglePopup}>
        <BiSupport className="contact-icon" />
      </div>

      {showPopup && (
        <div className="contact-popup">
          <div className="contact-popup-content">
            <div className="close-button" onClick={togglePopup}>
              <MdClose />
            </div>
            <h3>{t("AuthContact.contact_us")}</h3>

            <div className="contact-info">
              <div className="contact-item">
                <FaPhone className="contact-icon" style={{ transform: "scaleX(-1)" }} />
                <div>
                  <h4><strong>{t("AuthContact.phone")}:</strong></h4>
                  <span>
                    <a target="_blank" rel="noopener noreferrer">
                    +7 (985) 125-77-88
                    </a>
                  </span>
                </div>
              </div>

              <div className="contact-item">
                <MdEmail className="contact-icon" />
                <div>
                  <h4><strong>{t("AuthContact.ask_question")}:</strong></h4>
                  <span><a href="mailto:basic@eafo.info">basic@eafo.info</a></span>
                </div>
              </div>

              <div className="contact-item">
                <MdEmail className="contact-icon" />
                <div>
                  <h4><strong>{t("AuthContact.tech_support")}:</strong></h4>
                  <span><a href="mailto:support@eafo.info">support@eafo.info</a></span>
                </div>
              </div>

              <div style={{ fontSize: "28px", display: "flex", gap: "15px", alignItems: "center", justifyContent: "center" }}>
                <a href="https://wa.me/79851257788" target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp style={{ color: "green", cursor: "pointer" }} />
                </a>
                <a href="https://t.me/79851257788" target="_blank" rel="noopener noreferrer">
                  <FaTelegram style={{ color: "blue", cursor: "pointer" }} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactUs;
