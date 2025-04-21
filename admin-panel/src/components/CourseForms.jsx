import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiEdit,
  FiTrash2,
  FiInfo,
  FiCopy,
  FiSearch,
  FiPlus,
  FiFileText,
  FiArrowLeft,
} from "react-icons/fi";
import "./CourseForms.css";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FormInfoModal from "./FormInfoModal";
import Swal from "sweetalert2";


const CourseForms = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [formName, setFormName] = useState("");
  const [duplicateFrom, setDuplicateFrom] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredForm, setHoveredForm] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const { t } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;
 
  
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const token = localStorage.getItem("token"); // Retrieve token

        const response = await fetch(`${baseUrl}/api/form`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Secure API call
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch forms: ${response.statusText}`);
        }

        const data = await response.json();
        setForms(data.forms || []);
      } catch (error) {
        console.error("🚨 Error loading forms:", error);
        setError(error.message || "Failed to load forms.");
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
  
    if (!formName.trim()) {
      toast.warn(t("courseForms.formNameRequired"), {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("CourseForms.authError"), {
          position: "top-right",
          autoClose: 3000,
        });
        setIsLoading(false);
        return;
      }
  
      let response, data;
      const formData = { formName };
  
      if (isDuplicate && duplicateFrom) {
        formData.duplicateFrom = duplicateFrom;
      }
  
      const url = editingForm
        ? `${baseUrl}/api/form/${editingForm._id}`
        : `${baseUrl}/api/form`;
  
      const method = editingForm ? "PUT" : "POST";
  
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
  
      data = await response.json();
  
      setForms((prevForms) =>
        editingForm
          ? prevForms.map((form) =>
              form._id === editingForm._id ? { ...form, formName } : form
            )
          : [...prevForms, data.form]
      );
  
      toast.success(
        t(editingForm ? "courseForms.updateSuccess" : "courseForms.formSuccess"),
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
  
      // Reset form states
      setFormName("");
      setEditingForm(null);
      setDuplicateFrom("");
      setIsDuplicate(false);
      setShowPopup(false);
    } catch (error) {
      console.error("🚨 Error adding/editing form:", error);
  
      toast.error(
        error.message.includes("Unauthorized")
          ? t("courseForms.sessionExpired")
          : t("courseForms.generalError"),
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditForm = (form) => {
    setShowPopup(true);
    setEditingForm(form);
    setFormName(form.formName);
    setIsDuplicate(false);
  };

  const handleDuplicateForm = (formId) => {
    setShowPopup(true);
    setEditingForm(null);
    setFormName("");
    setDuplicateFrom(formId);
    setIsDuplicate(true);
  };

  const handleDeleteForm = async (_id) => {
  
    // ✅ Show confirmation popup using SweetAlert2
    const confirmDelete = await Swal.fire({
      title: t("courseForms.deleteConfirmTitle"), // Translated title
      text: t("courseForms.deleteConfirmText"), // Translated warning message
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("courseForms.confirmDelete"), // "Yes, delete it!"
      cancelButtonText: t("courseForms.cancel"), // "Cancel"
    });
  
    if (!confirmDelete.isConfirmed) return; // If user cancels, stop here
  
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("courseForms.sessionExpired"), { position: "top-right", autoClose: 3000 });
        return;
      }
  
      const response = await fetch(`${baseUrl}/api/form/${_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
  
      // ✅ Remove the deleted form from state
      setForms((prevForms) => prevForms.filter((form) => form._id !== _id));
  
      // ✅ Show success notification
      toast.success(t("courseForms.deleteSuccess"), { position: "top-right", autoClose: 3000 });
    } catch (error) {
      console.error("🚨 Error deleting form:", error);
  
      // ❌ Show error notification
      toast.error(t("courseForms.deleteFailed"), { position: "top-right", autoClose: 3000 });
    }
  };

  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100); // Auto-focus after opening
  };
  // ✅ Close search bar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredForms = forms.filter((form) =>
    form.formName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGoBack = () => {
    navigate("/", { replace: true });
  };

  const handleInfoClick = (form) => {
    setSelectedForm(form);
    setShowInfoModal(true);
  };

  const handleCloseInfoModal = () => {
    setShowInfoModal(false);
    setSelectedForm(null);
  };

  const handleUpdateForm = async (updatedForm) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error(t("courseForms.authError"), { position: "top-right", autoClose: 3000 });
      return;
    }
  
    // ✅ Optimistic UI Update
    const prevForms = [...forms]; // Store previous state in case of failure
    setForms(forms.map((form) => (form._id === updatedForm._id ? updatedForm : form)));
  
    try {
      const response = await fetch(`${baseUrl}/api/form/${updatedForm._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`, // ✅ Secure API request
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedForm),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
  
      toast.success(t("courseForms.updateSuccess"), { position: "top-right", autoClose: 3000 });
      console.log("✅ Form updated successfully.");
    } catch (error) {
      console.error("🚨 Error updating form:", error);
  
      toast.error(t("courseForms.updateFailed"), { position: "top-right", autoClose: 3000 });
  
      setForms(prevForms);
    }
  };

  
  return (
    <div className="form-page">
       <ToastContainer     className="custom-toast-container"/>
      <div className="forms-page">
        <div className="course-forms-container">
          {loading ? (
            <p>{t('courseForms.loading')}</p>
          ) : (
            <>
              {/* 🔹 Top Header Section */}
              <div className="top-header">
                {/* 🔙 Go Back Icon */}
                <div className="left-header">
                  
                  <h2>{t('courseForms.myForms')}</h2>
                </div>

                <div className="right-header">
                  {/* 🔹 Search Bar */}
                  <div className="form-search-container">
                    {/* 🔍 Search Icon on Left */}
                    <FiSearch className="form-search-icon" />

                    {/* ✏️ Always Visible Search Input */}
                    <input
                      type="text"
                      placeholder={t('courseForms.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-search-input"
                    />
                  </div>

                  {/* 🔹 New Form Button */}
                  <button
                    className="new-form-btn"
                    onClick={() => {
                      setShowPopup(true);
                      setIsDuplicate(false);
                    }}
                  >
                    <FiPlus className="plus-icon" /> {t('courseForms.newForm')}
                  </button>
                </div>
              </div>

              {filteredForms.length === 0 ? (
                <p className="no-forms-message">
                  {t('courseForms.noForms')}
                </p>
              ) : (
                <div className="forms-list">
                  {filteredForms.map((form) => (
                    <div
                      key={form._id}
                      onMouseEnter={() => setHoveredForm(form._id)}
                      onMouseLeave={() => setHoveredForm(null)}
                      className="form-card"
                    >
                      <div className="form-card-content">
                        <div className="submission-count tooltip">
                          <FiFileText className="file-icon" />
                          <span className="form-count-badge">
                            {form?.submissions?.length ?? 0}
                          </span>

                          <span className="tooltiptext">{t('courseForms.totalSubmissions')}</span>
                        </div>
                        <div
                          className="form-info"
                          onClick={() =>
                            navigate(`/forms/${form._id}/questions`)
                          }
                        >
                          <h3 className="form-name">{form.formName}</h3>
                          <p className="form-date">
                            {hoveredForm === form._id ? (
                              <span
                                className="all-entries"
                                style={{
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  color: "blue",
                                }}
                                onClick={(event) => {
                                  event.stopPropagation(); // Prevents the parent div's onClick from firing
                                  navigate(`/forms/${form._id}/entries`);
                                }}
                              >
                                {t('courseForms.allEntries')}
                              </span>
                            ) : (
                              <>
                                <span className="created-on">{t('courseForms.createdOn')}:</span>{" "}
                                {new Date(form.createdAt).toLocaleDateString()}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="form-actions">
                        <span className="tooltip">
                          <FiEdit
                            className="form-action-icon edit-icon"
                            onClick={() => handleEditForm(form)}
                          />
                          <span className="tooltiptext">{t('courseForms.tooltip.edit')}</span>
                        </span>
                        <span className="tooltip">
                          <FiCopy
                            className="form-action-icon duplicate-icon"
                            onClick={() => handleDuplicateForm(form._id)}
                          />
                          <span className="tooltiptext">{t('courseForms.tooltip.duplicate')}</span>
                        </span>
                        <span className="tooltip">
                          <FiTrash2
                            className="form-action-icon delete-icon"
                            onClick={() => handleDeleteForm(form._id)}
                          />
                          <span className="tooltiptext">{t('courseForms.tooltip.delete')}</span>
                        </span>
                        <span
                          className="tooltip"
                          onClick={() => handleInfoClick(form)}
                        >
                          <FiInfo className="form-action-icon info-icon" />
                          <span className="tooltiptext">{t('courseForms.tooltip.details')}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Popup Modal */}
              {showPopup && (
                <div className="popup-overlay">
                  <div className="popup">
                    <span
                      className="popup-close"
                      onClick={() => setShowPopup(false)}
                    >
                      ✖
                    </span>
                    <h3>
                      {editingForm
                        ? t('courseForms.editForm')
                        : isDuplicate
                        ? t('courseForms.duplicateForm')
                        : t('courseForms.createForm')}
                    </h3>
                    <form onSubmit={handleFormSubmit}>
                      <input
                        type="text"
                        placeholder={t('courseForms.formNamePlaceholder')}
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                      />

                      {isDuplicate && (
                        <select
                          value={duplicateFrom}
                          onChange={(e) => setDuplicateFrom(e.target.value)}
                        >
                          <option value="">
                          {t('courseForms.selectDuplicate')}
                          </option>
                          {forms.map((form) => (
                            <option key={form._id} value={form._id}>
                              {form.formName}
                            </option>
                          ))}
                        </select>
                      )}

                      <button type="submit" className="submit-btn">
                        {editingForm
                          ? t('courseForms.update')
                          : isDuplicate
                          ? t('courseForms.duplicate')
                          : t('courseForms.create')}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {showInfoModal && selectedForm && (
                <FormInfoModal
                  form={selectedForm}
                  onClose={handleCloseInfoModal}
                  onUpdate={handleUpdateForm}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseForms;
