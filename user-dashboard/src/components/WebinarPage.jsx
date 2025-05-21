import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { useNavigate } from "react-router-dom";
import i18n from "../i18n";
import { useLocation } from "react-router-dom";
import './WebinarPage.css';

const WebinarPage = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();
  const { state } = useLocation();
  const { webinarId: paramWebinarId } = useParams();
  const webinarId = state?.webinarId || paramWebinarId;
  const { t } = useTranslation();
  
  const [webinar, setWebinar] = useState(null);
  const [countdown, setCountdown] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [isWebinarStarted, setIsWebinarStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const token = localStorage.getItem("token");
  const currentLanguage = i18n.language;
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!token) {
      navigate("/");
    }
  }, [navigate, token]);

  useEffect(() => {
    const fetchWebinarDetails = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${baseUrl}/api/webinars/${webinarId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const webinarData = response.data;
        webinarData.title = capitalizeFirstLetter(webinarData.title);
        setWebinar(webinarData);
      } catch (error) {
        console.error("Error fetching webinar data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebinarDetails();
  }, [webinarId, token, currentLanguage]);

  useEffect(() => {
    if (!webinar) return;

    const interval = setInterval(() => {
      const webinarDateTimeMoscow = DateTime.fromFormat(
        `${webinar.date} ${webinar.time}`,
        "yyyy-MM-dd HH:mm",
        { zone: "Europe/Moscow" }
      );

      const webinarDateTimeUTC = webinarDateTimeMoscow.toUTC();
      const nowUTC = DateTime.utc();
      const timeDifference = webinarDateTimeUTC.diff(nowUTC, ["days", "hours", "minutes", "seconds"]).toObject();

      if (timeDifference.days <= 0 && timeDifference.hours <= 0 && timeDifference.minutes <= 0 && timeDifference.seconds <= 0) {
        setIsWebinarStarted(true);
        clearInterval(interval);
      } else {
        setCountdown({
          days: String(Math.floor(timeDifference.days)).padStart(2, "0"),
          hours: String(Math.floor(timeDifference.hours)).padStart(2, "0"),
          minutes: String(Math.floor(timeDifference.minutes)).padStart(2, "0"),
          seconds: String(Math.floor(timeDifference.seconds)).padStart(2, "0"),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [webinar]);

  if (isLoading) {
    return (
      <div className="webinar-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!webinar) return <div className="webinar-loading-text">{t("webinarPage.loading")}</div>;

  const webinarMoscowTime = DateTime.fromFormat(
    `${webinar.date} ${webinar.time}`,
    "yyyy-MM-dd HH:mm",
    { zone: "Europe/Moscow" }
  );

  const userLocalTime = webinarMoscowTime.setZone(userTimeZone).toFormat("dd-MM-yyyy HH:mm");

  return (
    <div className="webinar-container">
      {/* Header Section with all details */}
      <header className="webinar-header">
        <div className="header-content">
          <span className="live-badge">LIVE</span>
          <h1 className="webinar-title">
            {currentLanguage === "ru" ? webinar.titleRussian : webinar.title}
          </h1>
          
          <div className="header-details">
            <div className="expert-details">
              <h3 className="detail-label">{t("webinarPage.expert")}</h3>
              <p className="detail-value">
                {currentLanguage === "ru" ? webinar.chiefGuestNameRussian : webinar.chiefGuestName}
              </p>
              <p className="detail-description">
                {currentLanguage === "ru" ? webinar.regaliaRussian : webinar.regalia}
              </p>
            </div>
            
            <div className="time-details">
              <div className="time-section">
                <h3 className="detail-label">{t("webinarPage.date")}</h3>
                {webinarMoscowTime.toFormat("dd-MM-yyyy")}              </div>
              
              <div className="time-section">
                <h3 className="detail-label">{t("webinarPage.time")}</h3>
                <p className="time-value">{webinar.time} (MSK)</p>
                <p className="time-local">{userLocalTime} ({userTimeZone})</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Just video and chat now */}
      <main className="webinar-main">
        <div className="video-grid">
          {/* Video Section */}
          <div className="video-card">
            <div className="video-wrapper">
              <iframe
                src={webinar.liveEmbed}
                className="video-iframe"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
            <div className="video-label">
              <h2>Live Stream</h2>
            </div>
          </div>

          {/* Chat Section */}
          <div className="video-card">
            <div className="video-wrapper">
              <iframe
                src={webinar.chatEmbed}
                className="video-iframe"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
            <div className="video-label">
              <h2>Live Chat</h2>
            </div>
          </div>
        </div>
      </main>

      {/* Countdown Overlay */}
      {!isWebinarStarted && (
        <div className="countdown-overlay">
          <div className="countdown-modal">
            <span className="upcoming-badge">UPCOMING WEBINAR</span>
            <h2 className="countdown-title">
              {currentLanguage === "ru" ? webinar.titleRussian : webinar.title}
            </h2>
            
            <div className="expert-profile">
              <img 
                src="https://randomuser.me/api/portraits/men/32.jpg" 
                alt="Expert" 
                className="expert-image"
              />
              <div className="expert-info">
                <h3 className="expert-name">
                  {currentLanguage === "ru" ? webinar.chiefGuestNameRussian : webinar.chiefGuestName}
                </h3>
                <p className="expert-title">
                  {currentLanguage === "ru" ? webinar.regaliaRussian : webinar.regalia}
                </p>
              </div>
            </div>

            <div className="countdown-section">
              <h3 className="countdown-label">
                {t("webinarPage.startsIn")}:
              </h3>
              <div className="countdown-timer">
                <TimeBlock value={countdown.days} label={t("webinarPage.days")} />
                <TimeBlock value={countdown.hours} label={t("webinarPage.hours")} />
                <TimeBlock value={countdown.minutes} label={t("webinarPage.minutes")} />
                <TimeBlock value={countdown.seconds} label={t("webinarPage.seconds")} />
              </div>
            </div>

            <button 
              className="join-button"
              onClick={() => setIsWebinarStarted(true)}
            >
              Join Early
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TimeBlock = ({ value, label }) => (
  <div className="time-block">
    <span className="time-value">{value}</span>
    <span className="time-label">{label}</span>
  </div>
);

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export default WebinarPage;