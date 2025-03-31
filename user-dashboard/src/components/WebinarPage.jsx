import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon"; // Import Luxon for time conversion
import "./WebinarPage.css";
import { useNavigate } from "react-router-dom";
import i18n from "../i18n"; // Import i18n for language handling
import { useLocation } from "react-router-dom"; // Import useLocation

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const baseUrl = import.meta.env.VITE_BASE_URL;

const WebinarPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // Get webinarId from state (if available)
  const { webinarId: paramWebinarId } = useParams(); // Get webinarId from URL
  const webinarId = state?.webinarId || paramWebinarId; // Use state first, fallback to params
   console.log(webinarId)
  const { t } = useTranslation(); // Use translation hook
  const [webinar, setWebinar] = useState(null);
  const [countdown, setCountdown] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [isWebinarStarted, setIsWebinarStarted] = useState(false);

  const token = localStorage.getItem("token");
  const currentLanguage = i18n.language; // Current language from i18n
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  console.log("User's Time Zone:", userTimeZone);

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);

  // Fetch webinar details
  useEffect(() => {
    const fetchWebinarDetails = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/webinars/${webinarId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const webinarData = response.data;
        webinarData.title = capitalizeFirstLetter(webinarData.title);
        setWebinar(webinarData);
      } catch (error) {
        console.error("Error fetching webinar data:", error);
      }
    };

    fetchWebinarDetails();
  }, [webinarId, token, currentLanguage]);

  // Countdown logic
  useEffect(() => {
    if (!webinar) return;

    const interval = setInterval(() => {
      // Convert webinar time from Moscow (UTC+3) to UTC
      const webinarDateTimeMoscow = DateTime.fromFormat(
        `${webinar.date} ${webinar.time}`,
        "yyyy-MM-dd HH:mm",
        { zone: "Europe/Moscow" }
      );

      const webinarDateTimeUTC = webinarDateTimeMoscow.toUTC();

      // Get the current UTC time
      const nowUTC = DateTime.utc();

      // Calculate time difference
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

  if (!webinar) return <div>{t("webinarPage.loading")}</div>;

  // Convert webinar time to user's local time
  const webinarMoscowTime = DateTime.fromFormat(
    `${webinar.date} ${webinar.time}`,
    "yyyy-MM-dd HH:mm",
    { zone: "Europe/Moscow" }
  );

  const userLocalTime = webinarMoscowTime.setZone(userTimeZone).toFormat("yyyy-MM-dd HH:mm");

  return (
    <div>
      <div className="webinar-page">
        {/* Webinar Header */}
        <div className="webinar-header-container">
          <div className="webinar-header">
            <h1 className="title">{currentLanguage === "ru" ? webinar.titleRussian : webinar.title}</h1>
            <p className="experts-info">
              {t("webinarPage.expert")}: {currentLanguage === "ru" ? webinar.chiefGuestNameRussian : webinar.chiefGuestName}
            </p>
            <p className="experts-info">
              {currentLanguage === "ru" ? webinar.regaliaRussian : webinar.regalia}
            </p>
            <p className="date">{t("webinarPage.date")}: {webinar.date}</p>
            <p className="head-time">
              {t("webinarPage.time")}: {webinar.time} (Moscow) / {userLocalTime} ({userTimeZone})
            </p>
          </div>
        </div>

        <div className="outer-webinar-content">
          <div className="webinar-content">
            <div className="video-container">
              <div style={{ position: "relative", paddingTop: "56.25%", width: "100%" }}>
                <iframe
                  src={webinar.liveEmbed}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write"
                  frameBorder="0"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                  }}
                ></iframe>
              </div>
            </div>

            <div className="chat-container">
              <div style={{ position: "relative", paddingTop: "56.25%", width: "100%" }}>
                <iframe
                  src={webinar.chatEmbed}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write"
                  frameBorder="0"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                  }}
                ></iframe>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Overlay */}
        {!isWebinarStarted && (
          <div className="countdown-overlay">
            <div className="countdown-popup">
              <h1 className="popup-title">{currentLanguage === "ru" ? webinar.titleRussian : webinar.title}</h1>
              <div className="expert-details">
                <h2 className="popup-chief-guest">
                  {t("webinarPage.chiefGuest")}: {currentLanguage === "ru" ? webinar.chiefGuestNameRussian : webinar.chiefGuestName}
                </h2>
                <p className="popup-description">{currentLanguage === "ru" ? webinar.regaliaRussian : webinar.regalia}</p>
              </div>
              <h3 className="popup-countdown-heading">{t("webinarPage.startsIn")}:</h3>
              <div className="countdown-timer">
                {["days", "hours", "minutes", "seconds"].map((unit) => (
                  <div key={unit} className="time-block">
                    <span className="time">{countdown[unit]}</span>
                    <span className="label">{t(`webinarPage.${unit}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebinarPage;
