import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Courses.css";
import { motion } from "framer-motion";
import Loading from "./Loading";

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

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/"); // Redirect to / if token is missing
    }
  }, [navigate]);

  useEffect(() => {
    console.log("🔥 Initializing Courses...");
    fetchCourses();
  }, []);

  useEffect(() => {
    console.log("🔎 Applying filters...");
    applyFilters();
  }, [searchQuery, filter, courses, registeredCourses]);

  const fetchCourses = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("❌ Unauthorized access. No token found.");
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
      console.log("✅ Fetched courses:", data);

      const processedCourses = data.map((course) => {
        const courseDate = course.date ? new Date(course.date) : null;
        const courseEndDate = course.endDate ? new Date(course.endDate) : null;

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

      // Fetch registration status
      await fetchUserRegistrationStatus(processedCourses);
    } catch (err) {
      console.error("🚨 Error fetching courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrationStatus = async (courses) => {
    const userEmail = localStorage.getItem("email");
    const token = localStorage.getItem("token");

    if (!userEmail || !token) {
      console.warn("⚠️ Missing email or token.");
      return;
    }

    try {
      console.log(`🔍 Fetching registration status for: ${userEmail}`);

      const response = await fetch(`${baseUrl}/api/user/${userEmail}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const userData = await response.json();
      console.log("✅ Fetched user data:", userData);

      const registeredSet = new Set();

      courses.forEach((course) => {
        const courseForms = course.forms || [];

        const allFormIds = courseForms
          .filter((form) => form.isUsedForRegistration)
          .map((form) => form.formId);

        const isRegistered = userData.courses?.some((userCourse) =>
          userCourse.registeredForms?.some((form) =>
            allFormIds.includes(form.formId)
          )
        );

        if (isRegistered) {
          registeredSet.add(course._id);
        }
      });

      console.log("✅ Final registered courses:", registeredSet);
      setRegisteredCourses(registeredSet);
    } catch (error) {
      console.error("🚨 Error fetching registration status:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...courses];

    // 🔎 Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((course) =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 📅 Date filters
    if (filter === "Upcoming") {
      filtered = filtered.filter((course) => course.fullDate >= new Date());
    } else if (filter === "Past") {
      filtered = filtered.filter((course) => course.fullDate < new Date());
    } else if (filter === "Registered") {
      filtered = filtered.filter((course) => registeredCourses.has(course._id));
    }

    setFilteredCourses(filtered);
  };

  const handleRegister = async (courseId, slug) => {
    console.log(`🚀 Registering for course: ${courseId}, Slug: ${slug}`);

    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("email");

    if (!token || !userEmail) {
      alert("⚠️ Please log in to register.");
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
      console.log("✅ Fetched course details:", course);

      const language = localStorage.getItem("language") || "en";

      const form = course.forms?.find(
        (f) =>
          f.isUsedForRegistration &&
          (language === "ru" ? f.isUsedForRussian : !f.isUsedForRussian)
      );

      if (!form) {
        console.warn("⚠️ No registration form available.");
        alert("No registration form available.");
        return;
      }

      const formId = form.formId;

      console.log(`🔗 Navigating to form: ${formId}`);

      navigate(`/dashboard/courses/${slug}/forms/${formId}`, {
        state: { formId: formId },
      });
    } catch (error) {
      console.error("🚨 Error registering:", error);
      alert("Failed to register. Please try again.");
    }
  };

  const navigateToCourseDetails = (course) => {
    if (!course || !course.slug) return;
    navigate(`/dashboard/courses/${course.slug}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="courses-page">
        <div className="breadcrumb">
          <span onClick={() => navigate("/")}>{t("courses.dashboard")}</span> /{" "}
          <span>{t("courses.courses")}</span>
        </div>

        {/* 🔎 Search and Filter Section */}
        <div className="course-search-filter-container">
          <div className="course-search-input-wrapper">
            <span className="course-search-icon">🔍</span>
            <input
              type="text"
              placeholder={t("courses.dashboard")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="course-custom-dropdown">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="All">{t("courses.all")}</option>
              <option value="Upcoming">{t("courses.upcoming")}</option>
              <option value="Past">{t("courses.past")}</option>
              <option value="Registered">{t("courses.registered")}</option>
            </select>
          </div>
        </div>

        <div className="courses-list">
          {loading && <Loading />}
          {error && <p className="error">{error}</p>}
          {!loading && filteredCourses.length === 0 && (
            <p>{t("courses.no_results")}</p>
          )}

          {filteredCourses.map((course) => {
            const isRegistered = registeredCourses.has(course._id);

            return (
              <div
                className="course-card"
                key={course._id}
                onClick={() => navigateToCourseDetails(course)}
              >
                <img
                  src={
                    currentLanguage === "ru"
                      ? course?.bannerUrlRussian || course?.bannerUrl // ✅ Fallback to main banner if Russian one is missing
                      : course?.bannerUrl
                  }
                  alt={course.name}
                  className="course-banner"
                />
                <div className="course-info">
                  <h3>
                    {currentLanguage === "ru"
                      ? course.nameRussian
                      : course.name}
                  </h3>
                  <p>
                    <strong>{t("courses.date")}:</strong> {course.dateRange}
                  </p>
                </div>

                <div className="course-actions">
                  <button
                    className={`register-btn ${isRegistered ? "disabled" : ""}`}
                    disabled={isRegistered}
                  >
                    {isRegistered
                      ? t("courses.registered_status")
                      : t("courses.register_now")}
                  </button>
                  <button className="see-more-btn">
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
