import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "../HelpPopup.css";
import DOMPurify from 'dompurify';

const ProfileHelp = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("text");
  const { t , i18n} = useTranslation();

  const htmlContent =
  i18n.language === 'ru'
    ? `
      Если Вам потребуется помощь, пожалуйста, обращайтесь по электронной почте 📧 
      <a href="mailto:Support@eafo.info" class="support-link">Support@eafo.info</a> 
      или по телефону ☎ <a href="tel:+79851257788" class="support-link">+7 (985) 125-77-88</a> (WhatsApp, Telegram).
    `
    : `
      If you need assistance, please contact us via email 📧 
      <a href="mailto:Support@eafo.info" class="support-link">Support@eafo.info</a> 
      or by phone ☎ <a href="tel:+79851257788" class="support-link">+7 (985) 125-77-88</a> (WhatsApp, Telegram).
    `;

  return (
    <div className="help-popup">
      <div className="popup-container">
        <div className="popup-header">
          <h2>{t("auth.helpCenter")}</h2>
          <button className="help-close-button" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="tab-container">
          <div className="tab-header">
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTab === "text" ? "active" : ""}`}
                onClick={() => setActiveTab("text")}
              >
                {t("auth.guideText")}
              </button>
              
              <div
                className={`tab-slider ${
                  activeTab === "text" ? "left" : "right"
                }`}
              />
            </div>
          </div>

          <div className="tab-content">
            {activeTab === "text" ? (
              <div className="text-guide">
                <h3>{t("auth.registrationGuide")}</h3>
                <ol>
                  {Array.from({ length: 16 }, (_, i) => (
                    <li key={i}>
                      <strong>{i + 1}.</strong>{" "}
                      {t(`profile.HelpSteps.step${i + 1}`)}
                    </li>
                  ))}
                </ol>

                <div className="support-info">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="#4F46E5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16V12"
                      stroke="#033672"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8H12.01"
                      stroke="#033672"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(htmlContent),
      }}
    />
                </div>
              </div>
            ) : (
              <div className="video-guide">
                <div className="video-container">
                  {/* Replace with actual video ID */}
                  <iframe
                    src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                    title={t("auth.registrationVideo")}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="video-description">
                  <p>{t("auth.videoDescription")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHelp;
