import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiFilter } from "react-icons/fi"; // Search & Filter icons
import "./CourseEntriesManager.css";
import { useTranslation } from "react-i18next";

const baseUrl = import.meta.env.VITE_BASE_URL;

const CourseEntriesManager = () => {
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const { t, i18n } = useTranslation(); 
  const navigate = useNavigate();
  const filterRef = useRef(null); // ✅ Ref to detect clicks outside
  const currentLanguage = i18n.language;

  // ✅ Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("No token found");
        setError("No authorization token found.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/courses`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch courses.");
        }

        const data = await response.json();
        setCourses(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // ✅ Navigate to course details
  const handleCourseClick = (courseId) => {
    navigate(`/course-entries/${courseId}`);
  };

  // ✅ Filter courses by search term & filter state
  const filteredCourses = courses
    .filter((course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((course) => {
      const today = new Date();
      const courseDate = new Date(course.date); // Assuming course has `date` property

      if (activeFilter === "Upcoming") {
        return courseDate >= today;
      }
      if (activeFilter === "Past") {
        return courseDate < today;
      }
      return true; // Show all courses
    });

  // ✅ Toggle filter modal
  const toggleFilterModal = () => {
    setShowFilterModal((prev) => !prev);
  };

  // ✅ Handle filter selection
  const handleFilterSelect = (filter) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
  };

  // ✅ Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterModal(false);
      }
    };

    if (showFilterModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterModal]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="course-manager-entries-page">
    <div className="course-manager-wrapper">

      {/* 🔎 Search Bar & Filter */}
      <div className="search-filter-container">

        {/* 🛠️ Search Input */}
        <div className="search-input-wrapper">
          <FiSearch className="course-search-icon" />
          <input
            type="text"
            placeholder={t("courseManager.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="course-search-input"
          />
        </div>

        {/* 🛠️ Filter Icon */}
        <div className="filter-icon-wrapper" ref={filterRef}>
          <FiFilter
            className="course-filter-icon"
            onClick={toggleFilterModal}
          />

          {/* 🌟 Filter Bubble Modal (Positioned below the icon) */}
          {showFilterModal && (
            <div className="filter-bubble">
              <button
                className={`filter-option ${activeFilter === "All" ? "active" : ""}`}
                onClick={() => handleFilterSelect("All")}
              >
                  {t("courseManager.all")}
              </button>
              <div className="filter-divider"></div>
              <button
                className={`filter-option ${activeFilter === "Upcoming" ? "active" : ""}`}
                onClick={() => handleFilterSelect("Upcoming")}
              >
                {t("courseManager.upcoming")}
              </button>
              <div className="filter-divider"></div>
              <button
                className={`filter-option ${activeFilter === "Past" ? "active" : ""}`}
                onClick={() => handleFilterSelect("Past")}
              >
                {t("courseManager.past")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 📃 Full-Width Course List */}
      <div className="course-list-container">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div
              key={course._id}
              className="course-details-row"
              onClick={() => handleCourseClick(course._id)}
            >
              <h3>{currentLanguage === "ru" ? course.nameRussian : course.name}</h3>
            </div>
          ))
        ) : (
          <p className="no-courses">{t("courseManager.noCourses")}</p>
        )}
      </div>
    </div>
    </div>
  );
};

export default CourseEntriesManager;
