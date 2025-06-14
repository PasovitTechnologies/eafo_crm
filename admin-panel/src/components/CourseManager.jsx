import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CourseManager.css";
import "../App.css";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import Swal from "sweetalert2";
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
  const [aktNumber, setAktNumber] = useState("");
  const [courseDate, setCourseDate] = useState("");
  const [courseEndDate, setCourseEndDate] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [bannerUrlRussian, setBannerUrlRussian] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [modalType, setModalType] = useState("add");
  const [status, setStatus] = useState("Active");
  const currentLanguage = i18n.language;
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/api/courses`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch courses.");
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      toast.error(t("CourseManager.fetchError"), { style: { color: "#fff" } });
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const courseData = {
        name,
        nameRussian,
        description,
        descriptionRussian,
        date: courseDate,
        endDate: courseEndDate,
        bannerUrl,
        bannerUrlRussian,
        invoiceNumber,
        aktNumber,
        websiteLink,
        status,
      };

      const response = await fetch(
        modalType === "edit"
          ? `${baseUrl}/api/courses/${courseId}`
          : `${baseUrl}/api/courses`,
        {
          method: modalType === "edit" ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(courseData),
        }
      );

      if (response.ok) {
        fetchCourses();
        setIsModalOpen(false);
        toast.success(t("CourseManager.addSuccess"), {
          style: { color: "#fff" },
        });
      } else {
        throw new Error("Error adding/updating course");
      }
    } catch (error) {
      toast.error(t("CourseManager.addError"), { style: { color: "#fff" } });
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = await Swal.fire({
      title: t("CourseManager.deleteConfirmTitle"),
      text: t("CourseManager.deleteConfirmText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("CourseManager.confirmDelete"),
      cancelButtonText: t("CourseManager.cancel"),
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("CourseManager.sessionExpired"), {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      const response = await fetch(`${baseUrl}/api/courses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Error deleting course");

      fetchCourses();
      toast.success(t("CourseManager.deleteSuccess"), {
        position: "top-right",
        autoClose: 3000,
        style: { color: "#fff" },
      });
    } catch (error) {
      toast.error(t("CourseManager.deleteError"), {
        position: "top-right",
        autoClose: 3000,
        style: { color: "#fff" },
      });
    }
  };

  const openAddModal = () => {
    setModalType("add");
    setCourseId(null);
    setName("");
    setNameRussian("");
    setDescription("");
    setDescriptionRussian("");
    setInvoiceNumber("");
    setAktNumber("");
    setCourseDate("");
    setCourseEndDate("");
    setBannerUrl("");
    setBannerUrlRussian("");
    setWebsiteLink("");
    setIsModalOpen(true);
    setStatus("Active");
  };

  const openEditModal = (course) => {
    setModalType("edit");
    setCourseId(course._id);
    setName(course.name || "");
    setNameRussian(course.nameRussian || "");
    setDescription(course.description || "");
    setDescriptionRussian(course.descriptionRussian || "");
    setAktNumber(course.aktNumber || "");
    setInvoiceNumber(course.invoiceNumber || "");
    setCourseDate(course.date.split("T")[0]);
    setCourseEndDate(course.endDate ? course.endDate.split("T")[0] : "");
    setBannerUrl(course.bannerUrl || "");
    setBannerUrlRussian(course.bannerUrlRussian || "");
    setWebsiteLink(course.websiteLink || "");
    setStatus(course.status || "Active");
    setIsModalOpen(true);
  };

  return (
    <div className="course-manager-page">
      <ToastContainer
        position="top-right"
        className="custom-toast-container"
        autoClose={3000}
      />
      <div className="course-manager-page-container">
        <div className="course-manager-header">
          <div className="course-manager-left-header">
            <h2>{t("CourseManager.title")}</h2>
          </div>
          <div className="course-manager-right-header">
            <button className="add-course-btn" onClick={openAddModal}>
              <FiPlus /> {t("CourseManager.addCourse")}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="course-list-manager">
          {courses.length === 0 ? (
            <div className="no-courses-message">
              {t("CourseManager.noCourses")}
            </div>
          ) : (
            <ul className="course-list">
              {courses.map((course) => (
                <li key={course._id} className="course-list-card">
                  <Link
                    to={`/course-manager/course/${course._id}`}
                    className="course-link"
                  >
                    <div className="course-list-content">
                      <div
                        className="course-banner"
                        style={{
                          backgroundImage:
                            currentLanguage === "ru"
                              ? `url(${course.bannerUrlRussian})`
                              : `url(${course.bannerUrl})`,
                        }}
                      ></div>
                      <div className="course-info">
                        <span className="course-name">
                          {currentLanguage === "ru"
                            ? course.nameRussian
                            : course.name}
                        </span>
                        <span className="course-date">
                          {new Date(course.date).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="course-actions-btn">
                    <button
                      onClick={() => openEditModal(course)}
                      className="edit-btn"
                    >
                      {t("CourseManager.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(course._id)}
                      className="delete-btn"
                    >
                      {t("CourseManager.delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="course-manager-modal">
              <button
                className="course-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
              <h3>
                {modalType === "edit"
                  ? t("CourseManager.editTitle")
                  : t("CourseManager.addTitle")}
              </h3>
              <form onSubmit={handleSubmit} className="course-form">
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="name">
                      {t("CourseManager.courseNameEn")}
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="nameRussian">
                      {t("CourseManager.courseNameRu")}
                    </label>
                    <input
                      id="nameRussian"
                      type="text"
                      value={nameRussian}
                      onChange={(e) => setNameRussian(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="description">
                      {t("CourseManager.descEn")}
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="descriptionRussian">
                      {t("CourseManager.descRu")}
                    </label>
                    <textarea
                      id="descriptionRussian"
                      value={descriptionRussian}
                      onChange={(e) => setDescriptionRussian(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="courseDate">
                      {t("CourseManager.date")}
                    </label>
                    <input
                      id="courseDate"
                      type="date"
                      value={courseDate}
                      onChange={(e) => setCourseDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="courseEndDate">
                      {t("CourseManager.endDate")}
                    </label>
                    <input
                      id="courseEndDate"
                      type="date"
                      value={courseEndDate}
                      onChange={(e) => setCourseEndDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="bannerUrl">
                      {t("CourseManager.bannerUrlEn")}
                    </label>
                    <input
                      id="bannerUrl"
                      type="text"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="bannerUrlRussian">
                      {t("CourseManager.bannerUrlRu")}
                    </label>
                    <input
                      id="bannerUrlRussian"
                      type="text"
                      value={bannerUrlRussian}
                      onChange={(e) => setBannerUrlRussian(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="websiteLink">
                      {t("CourseManager.websiteLink")}
                    </label>
                    <input
                      id="websiteLink"
                      type="text"
                      value={websiteLink}
                      onChange={(e) => setWebsiteLink(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="invoiceNumber">
                      {t("CourseManager.invoiceNumber")}
                    </label>
                    <input
                      id="invoiceNumber"
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="aktNumber">
                      {t("CourseManager.aktNumber")}
                    </label>
                    <input
                      id="invoiceNumber"
                      type="text"
                      value={aktNumber}
                      onChange={(e) => setAktNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="status">{t("CourseManager.status")}</label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      required
                    >
                      <option value="Active">
                        {t("CourseManager.active")}
                      </option>
                      <option value="Not Active">
                        {t("CourseManager.notActive")}
                      </option>
                    </select>
                  </div>
                </div>

                <button className="save-btn" type="submit">
                  {t("CourseManager.save")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseManager;
