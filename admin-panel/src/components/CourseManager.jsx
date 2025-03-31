import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CourseManager.css";
import "../App.css";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const CourseManager = () => {
  const { t } = useTranslation();  
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [name, setName] = useState("");
  const [nameRussian, setNameRussian] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionRussian, setDescriptionRussian] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [courseDate, setCourseDate] = useState("");  // ✅ Added date field
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerUrlRussian, setBannerUrlRussian] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [modalType, setModalType] = useState("add");
  const currentLanguage = i18n.language
  const baseUrl = import.meta.env.VITE_BASE_URL;


  const navigate = useNavigate();

  // Fetch courses from API
  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${baseUrl}/api/courses`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch courses.");
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      setError("Failed to load courses. Please try again later.");
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Handle Add/Update Course
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const courseData = {
        name,
        nameRussian,
        description,
        descriptionRussian,
        date: courseDate,   // ✅ Include date in submission
        bannerUrl,
        bannerUrlRussian,
        invoiceNumber,
      };

      const response = await fetch(
        modalType === "edit"
          ? `${baseUrl}/api/courses/${courseId}`
          : `${baseUrl}/api/courses`,
        {
          method: modalType === "edit" ? "PUT" : "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(courseData),
        }
      );

      if (response.ok) {
        fetchCourses();
        setIsModalOpen(false);
      } else {
        throw new Error("Error adding/updating course");
      }
    } catch (error) {
      setError(error.message || "An error occurred.");
    }
  };

  // Handle Course Deletion
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${baseUrl}/api/courses/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchCourses();
      } else {
        throw new Error("Error deleting course");
      }
    } catch (error) {
      setError("Failed to delete course.");
    }
  };

  // Open the modal for adding a new course
  const openAddModal = () => {
    setModalType("add");
    setCourseId(null);
    setName("");
    setNameRussian("");
    setDescription("");
    setDescriptionRussian("");
    setInvoiceNumber("");
    setCourseDate("");         // ✅ Clear date when opening add modal
    setBannerUrl("");
    setBannerUrlRussian("");
    setIsModalOpen(true);
  };

  // Open the modal for editing an existing course
  const openEditModal = (course) => {
    setModalType("edit");
    setCourseId(course._id);
    setName(course.name || "");
    setNameRussian(course.nameRussian || "");
    setDescription(course.description || "");
    setDescriptionRussian(course.descriptionRussian || "");
    setInvoiceNumber(course.invoiceNumber || "");
    setCourseDate(course.date.split("T")[0]);  // ✅ Pre-fill date field
    setBannerUrl(course.bannerUrl || "");
    setBannerUrlRussian(course.bannerUrlRussian || "");
    setIsModalOpen(true);
  };

  const handleGoBack = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="course-manager-page">
      <div className="course-manager-page-container">
        <div className="course-manager-header">
          <div className="course-manager-left-header">
            
            <h2>{t('CourseManager.title')}</h2>
          </div>
          <div className="course-manager-right-header">
            <button className="add-course-btn" onClick={openAddModal}>
              + {t('CourseManager.addCourse')}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Course List */}
        <div className="course-list-manager">
          <ul className="course-list">
            {courses.map((course) => (
              <li key={course._id} className="course-list-card">
                <Link to={`/course-manager/course/${course._id}`} className="course-link">
                  <div className="course-list-content">
                    <div
                      className="course-banner"
                      style={{ backgroundImage: currentLanguage==="ru"? `url(${course.bannerUrlRussian})`:`url(${course.bannerUrl})` }}
                    ></div>

                    <div className="course-info">
                      <span className="course-name">{currentLanguage==="ru" ? course.nameRussian:course.name}</span>
                      <span className="course-date">
                        {new Date(course.date).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="course-actions-btn">
                  <button onClick={() => openEditModal(course)} className="edit-btn">{t('CourseManager.edit')}</button>
                  <button onClick={() => handleDelete(course._id)} className="delete-btn">{t('CourseManager.delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Modal for Adding/Editing Course */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="course-manager-modal">
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
              <h3>{modalType === "edit" ? t('CourseManager.editTitle') : t('CourseManager.addTitle')}</h3>
              <form onSubmit={handleSubmit}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('CourseManager.courseNameEn')} required />
                <input type="text" value={nameRussian} onChange={(e) => setNameRussian(e.target.value)} placeholder={t('CourseManager.courseNameRu')} required />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('CourseManager.descEn')} required />
                <textarea value={descriptionRussian} onChange={(e) => setDescriptionRussian(e.target.value)} placeholder={t('CourseManager.descRu')} required />
                <input type="date" value={courseDate} onChange={(e) => setCourseDate(e.target.value)} placeholder={t('CourseManager.date')} required />   {/* ✅ Date Picker */}
                <input type="text" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder={t('CourseManager.bannerUrlEn')} required />
                <input type="text" value={bannerUrlRussian} onChange={(e) => setBannerUrlRussian(e.target.value)} placeholder={t('CourseManager.bannerUrlRu')} required />
                <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={t('CourseManager.invoiceNumber')} required />
                <button className="save-btn" type="submit">{t('CourseManager.save')}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseManager;
