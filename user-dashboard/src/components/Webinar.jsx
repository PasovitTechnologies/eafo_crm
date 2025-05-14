import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Webinar.css";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import { ArrowLeft, Search, ChevronDown, HelpCircle } from 'lucide-react';
import Loading from "./Loading";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';  // Import the CSS file
import { 
  FiAlertCircle, 
  FiCheckCircle, 
  FiPlayCircle, 
  FiCalendar 
} from 'react-icons/fi';
import { useTranslation } from "react-i18next";
import CourseHelp from "./HelpComponents/CourseHelp";
import WebinarHelp from "./HelpComponents/WebinarHelp";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Webinar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState([]);
  const [filteredWebinars, setFilteredWebinars] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeredWebinars, setRegisteredWebinars] = useState(new Set());
  const [registrationLoading, setRegistrationLoading] = useState(true); // For registration status loading
  const currentLanguage = i18n.language;
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    fetchWebinars();
  }, []);

  const fetchWebinars = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/webinars`);
      if (!response.ok) throw new Error("Failed to fetch webinars");

      const data = await response.json();

      const processedWebinars = data
        .map((webinar) => {
          const fullDate = new Date(`${webinar.date}T${webinar.time}`);
          return {
            ...webinar,
            fullDate,
            formattedDate: fullDate.toLocaleDateString("en-GB"),
          };
        })
        .sort((a, b) => b.fullDate - a.fullDate);

      setWebinars(processedWebinars);
      setFilteredWebinars(processedWebinars);

      // After webinars are fetched, load the registration status
      fetchRegisteredWebinars(processedWebinars);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredWebinars = async (webinars) => {
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");

    if (!userEmail || !token) {
      setRegistrationLoading(false);
      return;
    }

    try {
      const registeredSet = new Set();
      await Promise.all(
        webinars.map(async (webinar) => {
          try {
            const response = await fetch(
              `${baseUrl}/api/webinars/${webinar._id}/status?email=${userEmail}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) return;

            const data = await response.json();
            if (data.registered) registeredSet.add(webinar._id);
          } catch (error) {
            console.error(`Error checking status for webinar ${webinar._id}:`, error);
          }
        })
      );
      setRegisteredWebinars(registeredSet);
    } catch (error) {
      console.error("Error fetching registration status:", error);
    } finally {
      setRegistrationLoading(false); // Set registration loading to false
    }
  };

  const handleRegister = async (webinarId, e) => {
    e.stopPropagation();
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");
  
    if (!userEmail || !token) {
      toast.error("Please log in to register.");  // Show error toast
      return;
    }
  
    try {
      const response = await fetch(
        `${baseUrl}/api/webinars/${webinarId}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: userEmail }),
        }
      );
  
      if (!response.ok) throw new Error("Failed to register");
  
      setRegisteredWebinars((prev) => new Set([...prev, webinarId]));
      toast.success("Registered successfully!");  // Show success toast
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");  // Show error toast
    }
  };

  // Filtering and search logic
  useEffect(() => {
    let filtered = webinars;

    if (filter === "Upcoming") {
      filtered = webinars.filter((w) => w.fullDate > new Date());
    } else if (filter === "Past") {
      filtered = webinars.filter((w) => w.fullDate < new Date());
    } else if (filter === "Registered") {
      filtered = webinars.filter((w) => registeredWebinars.has(w._id));
    }

    if (searchQuery) {
      filtered = filtered.filter((w) =>
        w.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredWebinars(filtered);
  }, [filter, searchQuery, webinars, registeredWebinars]);

  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup);
  };


  const formatSlug = (title) => title.toLowerCase().replace(/\s+/g, "-");

  const handleGoBack = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="webinar-page">
              {showHelpPopup && <WebinarHelp onClose={toggleHelpPopup} />}
        
              <div className="webinar-header-container">
      {/* Breadcrumb and Help */}
      <div className="webinar-header-top">
        <div className="breadcrumb-container">
          <button
            type="button"
            className="back-button"
            aria-label={t("forgetPasswordPage.backToLogin")}
            onClick={handleGoBack}
          >
            <ArrowLeft className="back-icon" />
          </button>
          
          <div className="breadcrumb-path">
            <span 
              onClick={() => navigate("/dashboard")}
              className="breadcrumb-link"
            >
              {t("webinar.breadcrumb_dashboard")}
            </span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">
              {t("webinar.breadcrumb_webinars")}
            </span>
          </div>
        </div>
        
        <button 
          className="help-button"
          onClick={toggleHelpPopup}
        >
          <HelpCircle className="help-icon" />
          {t("webinar.help")}
        </button>
      </div>
      
      {/* Search and Filter */}
      <div className="search-filter-wrapper">
        <div className="search-container">
          <div className="search-icon-wrapper">
            <Search className="search-icon" />
          </div>
          <input
            type="text"
            className="search-input"
            placeholder={t("webinar.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-container">
          <div 
            className="filter-selector"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{t(`webinar.${filter.toLowerCase()}`) || filter}</span>
            <ChevronDown className="dropdown-icon" />
          </div>
          
          {isDropdownOpen && (
            <div className="filter-dropdown">
              {['All', 'Upcoming', 'Past', 'Registered'].map((option) => (
                <div 
                  key={option} 
                  className="dropdown-option"
                  onClick={() => {
                    setFilter(option);
                    setIsDropdownOpen(false);
                  }}
                >
                  {t(`webinar.${option.toLowerCase()}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="webinar-list-container">
  {/* Loading States */}
  {(loading || registrationLoading) && (
    <div className="loading-overlay">
      <Loading />
    </div>
  )}

  {/* Error State */}
  {error && (
    <div className="error-card">
      <FiAlertCircle className="error-icon" />
      <p className="error-message">{error}</p>
    </div>
  )}

  {/* Empty State */}
  {!loading && !registrationLoading && filteredWebinars.length === 0 && (
    <div className="empty-state">
      <img
        src="https://static.wixstatic.com/shapes/df6cc5_b4ccbd2144e64fdfa1af9c569c821680.svg"
        alt="No webinars"
        className="empty-illustration"
      />
      <h3 className="empty-title">{t("webinar.no_webinars")}</h3>
      <p className="empty-subtitle">Check back later for upcoming events</p>
    </div>
  )}

  {/* Webinar Grid */}
  {!loading && !registrationLoading && filteredWebinars.length > 0 && (
    <div className="webinar-grid">
      {filteredWebinars.map((webinar) => {
        const isRegistered = registeredWebinars.has(webinar._id);
        
        return (
          <div 
            className={`webinar-card ${isRegistered ? 'registered' : ''}`}
            key={webinar._id}
            onClick={() => navigate(`/dashboard/webinars/${formatSlug(webinar.title)}`, {
              state: { webinarId: webinar._id },
            })}
          >
            {/* Card Badge */}
            {isRegistered && (
              <div className="card-badge">
                <FiCheckCircle /> {currentLanguage === "ru"
                    ? "Зарегистрированный"
                    : "Registered"
                }
              </div>
            )}

            {/* Webinar Image */}
            <div className="card-media">
              <img
                src={
                  currentLanguage === "ru"
                    ? webinar.bannerRussianURL
                    : webinar.bannerUrl
                }
                alt={webinar.title}
                className="card-image"
              />
              <div className="card-overlay"></div>
            </div>

            {/* Card Content */}
            <div className="card-content">
              <div className="card-header">
                <span className="card-date">
                  {webinar.formattedDate} • {webinar.time}
                </span>
                <h3 className="card-title">
                  {currentLanguage === "ru"
                    ? webinar.titleRussian
                    : webinar.title}
                </h3>
              </div>

              {/* Card Actions */}
              <div className="card-actions">
                {isRegistered ? (
                  <button
                    className="action-button primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/dashboard/webinars/${formatSlug(webinar.title)}/watch-webinar`,
                        { state: { webinarId: webinar._id } }
                      );
                    }}
                  >
                    <FiPlayCircle /> {t("webinar.watch_webinar")}
                  </button>
                ) : (
                  <button
                    className="action-button secondary"
                    onClick={(e) => handleRegister(webinar._id, e)}
                  >
                    <FiCalendar /> {t("webinar.register_now")}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
      </div>
    </motion.div>
  );
};

export default Webinar;
