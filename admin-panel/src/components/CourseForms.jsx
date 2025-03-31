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

import FormInfoModal from "./FormInfoModal";


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
      alert("⚠️ Please enter a valid Form Name.");
      return;
    }

    try {
      const token = localStorage.getItem("token"); // Retrieve token
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
          Authorization: `Bearer ${token}`, // ✅ Include token for security
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to ${editingForm ? "update" : "add"} form: ${errorText}`
        );
      }

      data = await response.json();

      setForms((prevForms) =>
        editingForm
          ? prevForms.map((form) =>
              form._id === editingForm._id ? { ...form, formName } : form
            )
          : [...prevForms, data.form]
      );

      // Reset form states
      setFormName("");
      setEditingForm(null);
      setDuplicateFrom("");
      setIsDuplicate(false);
      setShowPopup(false);
    } catch (error) {
      console.error("🚨 Error adding/editing form:", error);
      alert(error.message || "Something went wrong. Please try again.");
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
    if (!window.confirm("⚠️ Are you sure you want to delete this form?"))
      return;

    try {
      const token = localStorage.getItem("token"); // Retrieve stored auth token

      const response = await fetch(`${baseUrl}/api/form/${_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`, // ✅ Secure API request
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete form: ${errorText}`);
      }

      // ✅ Remove the deleted form from the state
      setForms((prevForms) => prevForms.filter((form) => form._id !== _id));
      alert("✅ Form deleted successfully.");
    } catch (error) {
      console.error("🚨 Error deleting form:", error);
      alert("❌ Failed to delete form. Please try again.");
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
    const token = localStorage.getItem("token"); // Retrieve auth token

    // ✅ Optimistically update UI
    const prevForms = [...forms]; // Store previous state in case of failure
    setForms(
      forms.map((form) => (form._id === updatedForm._id ? updatedForm : form))
    );

    try {
      const response = await fetch(
        `${baseUrl}/api/form/${updatedForm._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Secure API request
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedForm),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update form: ${errorText}`);
      }

      console.log("✅ Form updated successfully.");
    } catch (error) {
      console.error("🚨 Error updating form:", error);
      alert("❌ Update failed. Please try again.");

      // 🔄 Revert UI back to the previous state
      setForms(prevForms);
    }
  };

  return (
    <div className="form-page">
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
