import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaArrowLeft } from "react-icons/fa";
import "./Courses.css";
import { motion } from "framer-motion";
import Loading from "./Loading";
import CourseHelp from "./HelpComponents/CourseHelp";
import { ArrowLeft, Search, ChevronDown, HelpCircle } from "lucide-react";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Courses = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeredCourses, setRegisteredCourses] = useState(new Set());
  const currentLanguage = i18n.language;
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [checkspecialUser, setCheckSpecialUser] = useState();
  const [userPayments, setUserPayments] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filter, courses, registeredCourses]);

  const fetchCourses = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("email");

    if (!token) {
      console.error("Unauthorized access. No token found.");
      setError("Unauthorized access. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/courses`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status}`);
      }

      const data = await response.json();

      const isSpecialUser = [
        "sasinarayanan2003@gmail.com",
        "theva.prime@gmail.com",
        "drsoma@gmail.com",
        "mmuthumurali@gmail.com",
        "islamudin.aldanov@gmail.com",
        "mail@praveenan.ru",
        "katrina05101@yandex.ru",
        "p.fov@mail.ru",
        "elenasm1983@mail.ru",
        "julkapronina1997@gmail.com",
        "merz8585@mail.ru",
        "sethuinstituteoftechnology2022@gmail.com"
      ].includes(userEmail);

      if (isSpecialUser) {
        setCheckSpecialUser(true);
      }

      const processedCourses = data
        .filter((course) => isSpecialUser || course.status === "Active")
        .map((course) => {
          const courseDate = course.date ? new Date(course.date) : null;
          const courseEndDate = course.endDate
            ? new Date(course.endDate)
            : null;

          return {
            ...course,
            fullDate: courseDate,
            fullEndDate: courseEndDate,
            formattedDate: courseDate
              ? courseDate.toLocaleDateString("en-GB")
              : "N/A",
            formattedEndDate: courseEndDate
              ? courseEndDate.toLocaleDateString("en-GB")
              : "N/A",
            dateRange:
              courseDate && courseEndDate
                ? `${courseDate.toLocaleDateString(
                    "en-GB"
                  )} - ${courseEndDate.toLocaleDateString("en-GB")}`
                : courseDate
                ? courseDate.toLocaleDateString("en-GB")
                : "N/A",
          };
        });

      setCourses(processedCourses);
      setFilteredCourses(processedCourses);
      await fetchUserRegistrationStatus(processedCourses);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrationStatus = async (courses) => {
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");

    if (!userEmail || !token) {
      console.warn("Missing email or token.");
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/user/${userEmail}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const userData = await response.json();
      const payments = [];
      const registeredSet = new Set();

      courses.forEach((course) => {
        const userCourse = userData.courses?.find(c => c.courseId === course._id);
        if (userCourse) {
          const courseForms = course.forms || [];
          const registrationForms = courseForms.filter(f => f.isUsedForRegistration);
          
          const isRegistered = registrationForms.some(form => 
            userCourse.registeredForms?.some(f => f.formId === form.formId)
          );

          if (isRegistered) {
            registeredSet.add(course._id);
            if (userCourse.payments) {
              payments.push(...userCourse.payments.map(p => ({
                ...p,
                courseId: course._id // Ensure courseId is attached
              })));
            }
          }
        }
      });

      setRegisteredCourses(registeredSet);
      setUserPayments(payments);
    } catch (error) {
      console.error("Error fetching registration status:", error);
    }
  };

  const hasPaidForCourse = (courseId) => {
    return userPayments.some(payment => {
      // Check direct payment status (case-insensitive)
      if (
        payment.status?.toLowerCase() === "paid" &&
        payment.courseId === courseId
      ) {
        return true;
      }
  
      // Check nested coursePayments array (case-insensitive)
      if (payment.coursePayments) {
        return payment.coursePayments.some(
          cp =>
            cp.status?.toLowerCase() === "paid" &&
            cp.courseId === courseId
        );
      }
  
      return false;
    });
  };
  

  const applyFilters = () => {
    let filtered = [...courses];

    if (searchQuery.trim()) {
      filtered = filtered.filter((course) =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filter === "Upcoming") {
      filtered = filtered.filter((course) => course.fullDate >= new Date());
    } else if (filter === "Past") {
      filtered = filtered.filter((course) => course.fullDate < new Date());
    } else if (filter === "Submitted") {
      filtered = filtered.filter((course) => registeredCourses.has(course._id));
    }

    setFilteredCourses(filtered);
  };

  const handleRegister = async (courseId, slug) => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("email");

    if (!token || !userEmail) {
      alert("Please log in to register.");
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch course details: ${response.status}`);
      }

      const course = await response.json();
      const language = localStorage.getItem("language") || "en";

      const form = course.forms?.find(
        (f) =>
          f.isUsedForRegistration &&
          (language === "ru" ? f.isUsedForRussian : !f.isUsedForRussian)
      );

      if (!form) {
        console.warn("No registration form available.");
        alert("No registration form available.");
        return;
      }

      navigate(`/dashboard/courses/${slug}/forms/${form.formId}`, {
        state: { formId: form.formId },
      });
    } catch (error) {
      console.error("Error registering:", error);
    }
  };

  const navigateToCourseDetails = (course) => {
    if (!course || !course.slug) return;
    navigate(`/dashboard/courses/${course.slug}`);
  };

  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup);
  };

  const handleGoBack = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="courses-page">
        {showHelpPopup && <CourseHelp onClose={toggleHelpPopup} />}
        <div className="webinar-header-container">
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
                  {t("courses.courses")}
                </span>
              </div>
            </div>

            <button className="help-button" onClick={toggleHelpPopup}>
              <HelpCircle className="help-icon" />
              {t("courses.help")}
            </button>
          </div>

          <div className="search-filter-wrapper">
            <div className="course-search-container">
              <div className="course-search-icon-wrapper">
                <Search className="course-search-icon" />
              </div>
              <input
                type="text"
                className="course-search-input"
                placeholder={t("courses.search_placeholder")}
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
                  {["All", "Upcoming", "Past", "Submitted"].map((option) => (
                    <div
                      key={option}
                      className="dropdown-option"
                      onClick={() => {
                        setFilter(option);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {t(`courses.${option.toLowerCase()}`)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {checkspecialUser && (
          <div className="special-user">
            <p>🌟 You are a company user with inactive course access.</p>
          </div>
        )}

        <div className="courses-list">
          {loading && (
            <div className="courses-list">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton-course-card">
                  <div className="skeleton-course-image shimmer"></div>
                  <div className="skeleton-course-content">
                    <div className="skeleton-line long shimmer"></div>
                    <div className="skeleton-line medium shimmer"></div>
                    <div className="skeleton-line short shimmer"></div>
                  </div>
                  <div className="skeleton-course-actions">
                    <div className="skeleton-button shimmer"></div>
                    <div className="skeleton-button shimmer"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="error">{error}</p>}
          {!loading && filteredCourses.length === 0 && (
            <p>{t("courses.no_results")}</p>
          )}

          {filteredCourses.map((course) => {
            const isRegistered = registeredCourses.has(course._id);
            const hasPaid = hasPaidForCourse(course._id);
            
            let statusText, buttonClass;
            if (isRegistered) {
              if (hasPaid) {
                statusText = t("courses.registered");
                buttonClass = "registered-button";
              } else {
                statusText = t("courses.submitted");
                buttonClass = "submitted-button";
              }
            } else {
              statusText = t("courses.register_now");
              buttonClass = "register";
            }

            return (
              <div
                className="course-card"
                key={course._id}
                onClick={() => navigateToCourseDetails(course)}
              >
                <img
                  src={
                    currentLanguage === "ru"
                      ? course?.bannerUrlRussian || course?.bannerUrl
                      : course?.bannerUrl
                  }
                  alt={course.name}
                  className="course-banner"
                />
                <div className="course-info">
                  <h3>
                    {currentLanguage === "ru" ? course.nameRussian : course.name}
                  </h3>
                  <p>
                    <strong>{t("courses.date")}:</strong> {course.dateRange}
                  </p>
                </div>

                <div className="course-actions">
                  <button
                    className={`register-btn ${buttonClass}`}
                    disabled={isRegistered}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isRegistered) {
                        handleRegister(course._id, course.slug);
                      }
                    }}
                  >
                    {statusText}
                  </button>
                  <button 
                    className="see-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToCourseDetails(course);
                    }}
                  >
                    {t("courses.see_more")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default Courses;