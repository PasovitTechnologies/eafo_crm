import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./WebinarDetails.css";
import Loading from "./Loading";
import { motion } from "framer-motion";
import { ArrowLeft} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';

import { useTranslation } from "react-i18next";  // ✅ Import translation hook
import { 
  FiPlayCircle, 
  FiCalendar 
} from 'react-icons/fi';
const baseUrl = import.meta.env.VITE_BASE_URL;

const WebinarDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();  // ✅ Translation hook
  const { i18n } = useTranslation();  // ✅ Translation hook
  const webinarId = location.state?.webinarId;
  const [webinar, setWebinar] = useState(null);
  const [otherWebinars, setOtherWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [registeredWebinars, setRegisteredWebinars] = useState(new Set());
  const currentLanguage=i18n.language;

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);


  useEffect(() => {
    if (!webinarId) return;

    // ✅ Reset states before fetching new data
    setWebinar(null);
    setIsRegistered(false);
    setLoading(true);
    setError(null);

    const fetchWebinarDetails = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/webinars/${webinarId}`);
        if (!response.ok) throw new Error("Failed to fetch webinar details");

        const data = await response.json();
        setWebinar(data);

        // ✅ Check if user is registered
        const userEmail = localStorage.getItem("email");
        setIsRegistered(
          userEmail && data.participants?.some((p) => p.email === userEmail)
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchOtherWebinars = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/webinars`);
        if (!response.ok) throw new Error("Failed to fetch webinars");

        const data = await response.json();
        setOtherWebinars(data.filter((w) => w._id !== webinarId));

        // ✅ Check if user is registered for other webinars
        const userEmail = localStorage.getItem("email");
        const registered = new Set(
          data
            .filter((w) => w.participants?.some((p) => p.email === userEmail))
            .map((w) => w._id)
        );
        setRegisteredWebinars(registered);
      } catch (err) {
        console.error("Error fetching other webinars:", err);
      }
    };

    fetchWebinarDetails();
    fetchOtherWebinars();
  }, [webinarId]);

  // ✅ Register Function
  const handleRegister = async () => {
    if (!webinarId) return;

    setRegistering(true);
    setRegistrationMessage("");

    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");

    if (!userEmail || !token) {
      setRegistrationMessage("Error: Please log in to register.");
      setRegistering(false);
      return;
    }

    const participantData = { email: userEmail };

    try {
      const response = await fetch(
        `${baseUrl}/api/webinars/${webinarId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(participantData),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to register");

      toast.success("Registered successfully!");
      setRegisteredWebinars((prev) => new Set([...prev, webinarId]));
      setIsRegistered(true);
    } catch (err) {
      setRegistrationMessage(`Error: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const formatSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };



  if (loading) {
    return (
      <div className="webinar-details-skeleton">
        <div className="skeleton-banner shimmer" />
        <div className="skeleton-title shimmer" />
        <div className="skeleton-description shimmer" />
        
        <div className="skeleton-expert-section">
          <div className="skeleton-expert-info">
            <div className="skeleton-line shimmer" />
            <div className="skeleton-line short shimmer" />
          </div>
          <div className="skeleton-expert-photo shimmer" />
        </div>
  
        <div className="skeleton-button shimmer" />
  
        <h3 className="skeleton-subtitle shimmer" />
  
        <div className="skeleton-other-webinars">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton-webinar-card">
              <div className="skeleton-webinar-img shimmer" />
              <div className="skeleton-webinar-text shimmer" />
              <div className="skeleton-webinar-sub shimmer" />
              <div className="skeleton-webinar-button shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleGoBack = () => {
    navigate("/dashboard/webinars", { replace: true });
  };
  

  return (
    <motion.div
      className="webinar-details-page-div"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >

<ToastContainer
        className="toast-container"
        style={{ color: "#fff" }}
        autoClose={3000}
      />
      <div className="webinar-details-page">
        <div className="breadcrumb">
          <button
                      type="button"
                      className="back-button"
                      aria-label={t("forgetPasswordPage.backToLogin")}
                      onClick={handleGoBack}
                    >
                      <ArrowLeft className="back-icon" />
                    </button>
          <span onClick={() => navigate("/dashboard")}>{t("webinarDetails.breadcrumb_dashboard")}</span> /
          <span onClick={() => navigate("/dashboard/webinars")}>
            {" "}{t("webinarDetails.breadcrumb_webinars")}{" "}
          </span> /
          <span className="active">{currentLanguage==="ru"?webinar?.titleRussian: webinar?.title}</span>
        </div>

        
        {error && <p className="error">{error}</p>}

        {webinar && (
          <div className="webinar-details-div">
            <div className="webinar-details-container">
              <div className="webinar-banner-container">
                <motion.div
                  className="webinar-banner-container"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1 }}
                >
                  <img
                    src={currentLanguage==="ru"?webinar.bannerRussianURL:webinar.bannerUrl}
                    alt={webinar.title}
                    className="webinar-banner"
                  />
                </motion.div>
              </div>

              <h2 className="webinar-title">{currentLanguage==="ru"?webinar?.titleRussian: webinar?.title}</h2>
              <p className="webinar-description">{webinar.description}</p>

              <div className="webinar-expert">
                <div className="expert-info">
                  <h3><strong>{t("webinarDetails.expert")}:</strong> {currentLanguage==="ru"?webinar.chiefGuestNameRussian:webinar.chiefGuestName}</h3>
                  <p><strong>{t("webinarDetails.regalia")}:</strong> {currentLanguage==="ru"?webinar.regaliaRussian:webinar.regalia}</p>
                </div>
                <div className="expert-photo">
                  <img src={webinar.photoUrl} alt={webinar.chiefGuestName} />
                </div>
              </div>

              {/* ✅ Button Container */}
              <div className="button-container">
                {isRegistered ? (
                  <>
                    <button className="registered-btn" disabled>
                    {t("webinarDetails.registered")}
                    </button>
                    <button
                      className="watch-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/dashboard/webinars/${formatSlug(webinar.title)}/watch-webinar`,
                          {
                            state: { webinarId: webinar._id },
                          }
                        );
                      }}
                    >
                      <FiPlayCircle className="icon-btn"/>{t("webinarDetails.watch_webinar")}
                    </button>
                  </>
                ) : (
                  <button
                    className="webinar-register-btn"
                    onClick={handleRegister}
                    disabled={registering}
                  >
                    {registering ?  t("webinarDetails.registering") : t("webinarDetails.register_now")}
                  </button>
                )}
              </div>

              {registrationMessage && (
                <p className="registration-message">{registrationMessage}</p>
              )}
            </div>

            {/* ✅ Other Webinars Section */}
            <div className="other-webinar">
              <h3>{t("webinarDetails.other_webinars")}</h3>
              <div className="other-webinar-list">
                {otherWebinars.length === 0 ? (
                  <p>{t("webinarDetails.no_other_webinars")}</p>
                ) : (
                  otherWebinars.map((w) => (
                    <div
                      className="other-webinar-card"
                      key={w._id}
                      onClick={() => {
                        navigate(
                          `/dashboard/webinars/${formatSlug(w.title)}`,
                          { state: { webinarId: w._id } }
                        );
                      }}
                    >
                      <img
                        src={currentLanguage==="ru"?w.bannerRussianURL:w.bannerUrl}
                        alt={w.title}
                        className="other-webinar-image"
                        loading="lazy"
                      />
                      <div className="other-webinar-info">
                        <h4>{currentLanguage==="ru"?w?.titleRussian: w?.title}</h4>
                        <p>
                          {new Date(w.date).toLocaleDateString("en-GB")} | {w.time}
                        </p>
                        {registeredWebinars.has(w._id) ? (
                          <button className="watch-btn"> <FiPlayCircle />{t("webinarDetails.watch_webinar")}</button>
                        ) : (
                          <button className="webinar-register-btn"><FiCalendar />{t("webinarDetails.register_now")}</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WebinarDetails;
