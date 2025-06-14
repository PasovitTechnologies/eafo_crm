import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./InvoiceManager.css";
import { FiArrowLeft, FiSearch, FiFilter } from "react-icons/fi";
import { useTranslation } from "react-i18next"; // Translation

const InvoiceManager = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const { t, i18n } = useTranslation();  // Translation hook
  const currentLanguage=i18n.language;
  const navigate = useNavigate();
  const filterRef = useRef(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl}/api/courses`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        });

        if (!response.ok) throw new Error(t("errors.fetchCourses"));

        const data = await response.json();
        setCourses(data);
        setFilteredCourses(data);
      } catch (error) {
        console.error(t("errors.general"), error);
      }
    };

    fetchCourses();
  }, [t]);

  // 🔥 Search and Filter Logic
  useEffect(() => {
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeFilter !== "All") {
      const now = new Date();
      filtered = filtered.filter(course => {
        const courseDate = new Date(course.startDate);
        return activeFilter === "Upcoming"
          ? courseDate > now
          : courseDate < now;
      });
    }

    setFilteredCourses(filtered);
  }, [searchTerm, activeFilter, courses]);

  // 🟠 Handle Navigation
  const handleGoBack = () => {
    navigate("/forms", { replace: true });
  };

  const handleCourseClick = (courseId) => {
    navigate(`/invoice/invoice-manager/${courseId}`);
  };

  // 🔥 Filter Modal Toggle
  const toggleFilterModal = () => {
    setShowFilterModal((prev) => !prev);
  };

  const handleFilterSelect = (filter) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="invoice-manager-page">
      
      {/* 🔎 Search Bar & Filter */}
      <div className="search-filter-container">

       
        <div className="search-input-wrapper">
          <FiSearch className="course-search-icon" />
          <input
            type="text"
            placeholder={t("invoiceManager.searchCourses")}
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

          {/* 🌟 Filter Bubble Modal */}
          {showFilterModal && (
            <div className="filter-bubble">
              <button
                className={`filter-option ${activeFilter === "All" ? "active" : ""}`}
                onClick={() => handleFilterSelect("All")}
              >
                {t("invoiceManager.all")}
              </button>
              <div className="filter-divider"></div>
              <button
                className={`filter-option ${activeFilter === "Upcoming" ? "active" : ""}`}
                onClick={() => handleFilterSelect("Upcoming")}
              >
                {t("invoiceManager.upcoming")}
              </button>
              <div className="filter-divider"></div>
              <button
                className={`filter-option ${activeFilter === "Past" ? "active" : ""}`}
                onClick={() => handleFilterSelect("Past")}
              >
                {t("invoiceManager.past")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 📚 Course List */}
      <div className="invoice-course-list">
      {filteredCourses.length > 0 ? (
  filteredCourses.map((course) => {
    const payments = course.payments || [];

    // Analyze payment statuses
    const stats = {
      all: payments.length,
      notCreated: payments.filter(p => p.status === "NotCreated").length,
      pending: payments.filter(p => p.status === "Pending").length,
      paid: payments.filter(p => p.status === "Paid").length,
      expired: payments.filter(p => p.status === "Expired").length,
    };
    

    return (
      <div
        key={course._id}
        className="invoice-course-card-modern"
        onClick={() => handleCourseClick(course._id)}
      >
        <div className="invoice-course-header">
          <h3 className="invoice-course-title">
            {currentLanguage === "ru" ? course.nameRussian : course.name}
          </h3>
        </div>

        <div className="invoice-payment-summary">
  <span className="badge all">{t("invoiceManager.all")}: {stats.all}</span>
  <span className="badge not-created">{t("invoiceManager.notCreated")}: {stats.notCreated}</span>
  <span className="badge pending">{t("invoiceManager.pending")}: {stats.pending}</span>
  <span className="badge paid">{t("invoiceManager.paid")}: {stats.paid}</span>
  <span className="badge expired">{t("invoiceManager.expired")}: {stats.expired}</span>
</div>

      </div>
    );
  })
) : (
  <p>{t("invoiceManager.noCourses")}</p>
)}

      </div>
    </div>
  );
};

export default InvoiceManager;
