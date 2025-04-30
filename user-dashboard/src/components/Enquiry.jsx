import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./Enquiry.css";
import { FaFileAlt, FaFileDownload, FaTimesCircle, FaUpload, FaStar, FaEdit, FaChevronLeft } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft } from "react-icons/fa";
import CourseHelp from "./HelpComponents/CourseHelp";
import EnquiryHelp from "./HelpComponents/EnquiryHelp";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Enquiry = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [enquiries, setEnquiries] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showEnquiryPopup, setShowEnquiryPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editFilePreview, setEditFilePreview] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [currentEnquiry, setCurrentEnquiry] = useState(null);
    const [showHelpPopup, setShowHelpPopup] = useState(false);
  
  const { t } = useTranslation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email");

      const response = await fetch(`${baseUrl}/api/enquiries/${email}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch enquiries.");
      }

      const data = await response.json();
      setEnquiries(data);
    } catch (error) {
      console.error("🚨 Error fetching enquiries:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPopup = (enquiryId) => {
    setSelectedEnquiry(enquiryId);
    setShowPopup(true);
  };

  const openEnquiryPopup = () => {
    setShowEnquiryPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedEnquiry(null);
    setRating(0);
  };

  const closeEnquiryPopup = () => {
    setShowEnquiryPopup(false);
    setSelectedEnquiry(null);
    setMessage("");
    setSubject("");
    setFile(null);
    setFilePreview(null);
  };

  const openEditPopup = (enquiry) => {
    setSelectedEnquiry(enquiry._id);
    setEditMessage(enquiry.message);
    setEditSubject(enquiry.subject || "");
    setEditFile(null);
    setEditFilePreview(null);
    setShowEditPopup(true);
  };

  const closeEditPopup = () => {
    setShowEditPopup(false);
    setSelectedEnquiry(null);
    setEditMessage("");
    setEditSubject("");
    setEditFile(null);
    setEditFilePreview(null);
  };

  const viewEnquiryDetails = (enquiry) => {
    setCurrentEnquiry(enquiry);
    setViewMode(true);
  };

  const exitViewMode = () => {
    setViewMode(false);
    setCurrentEnquiry(null);
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
  
    if (uploadedFile) {
      const fileSizeInMB = uploadedFile.size / (1024 * 1024);
      if (fileSizeInMB > 5) {
        toast.error(t('enquiry.fileSizeExceeds'));
        return;
      }
  
      setFile(uploadedFile);
  
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(uploadedFile);
    }
  };
  
  const handleEditFileChange = (e) => {
    const uploadedFile = e.target.files[0];
  
    if (uploadedFile) {
      const fileSizeInMB = uploadedFile.size / (1024 * 1024);
      if (fileSizeInMB > 5) {
        toast.error(t('enquiry.fileSizeExceeds'));
        return;
      }
  
      setEditFile(uploadedFile);
  
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditFilePreview(reader.result);
      };
      reader.readAsDataURL(uploadedFile);
    }
  };
  
  const handleSubmit = async () => {
    // Validation check for subject and message
    if (!subject || !message) {
      toast.error(t('enquiry.enterSubjectMessage'));
      return;
    }
  
    // Get the email and token from localStorage
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
  
    // Ensure email and token are present
    if (!email || !token) {
      toast.error(t('enquiry.noEmailOrToken'));
      return;
    }
  
    const formData = new FormData();
    formData.append("email", email);
    formData.append("subject", subject);
    formData.append("message", message);
    formData.append("status", "Raised");
  
    // File validation: Check if file exists and is within acceptable limits (example 5MB)
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(t('enquiry.fileTooLarge'));
        return;
      }
      formData.append("file", file);
    }
  
    try {
      const response = await fetch(`${baseUrl}/api/enquiries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      if (!response.ok) {
        const errorMessage = await response.text(); // Get more detailed error response
        throw new Error(`Failed to submit enquiry: ${errorMessage}`);
      }
  
      toast.success(t('enquiry.enquirySubmitted'));
      closeEnquiryPopup();
      fetchEnquiries();
    } catch (error) {
      console.error("🚨 Error submitting enquiry:", error);
      toast.error(t('enquiry.enquirySubmitFailed'));
    }
  };
  
  
  const handleEditSubmit = async () => {
    if (!editSubject || !editMessage) {
      toast.error(t('enquiry.enquirySubmitFailed'));
      return;
    }
  
    const formData = new FormData();
    formData.append("subject", editSubject);
    formData.append("message", editMessage);
  
    if (editFile) {
      formData.append("file", editFile);
    }
  
    try {
      const token = localStorage.getItem("token");
  
      const response = await fetch(`${baseUrl}/api/enquiries/${selectedEnquiry}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      if (!response.ok) {
        toast.error(t('enquiry.enquiryUpdateFailed'));
      }
  
      toast.success(t('enquiry.enquiryUpdated'));
      closeEditPopup();
      fetchEnquiries();
      setViewMode(false);
    } catch (error) {
      console.error("🚨 Error updating enquiry:", error);
      toast.error(t('enquiry.enquiryUpdateFailed'));
    }
  };
  
  const handleDownload = async (id) => {
    try {
      const token = localStorage.getItem("token");
  
      const response = await fetch(`${baseUrl}/api/enquiries/file/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Failed to download file.");
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "file";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t('enquiry.fileDownloaded'));
    } catch (error) {
      console.error("🚨 Error downloading file:", error);
      toast.error(t('enquiry.fileDownloadFailed'));
    }
  };
  
  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };
  
  const submitRating = async () => {
    if (!rating) {
      toast.error(t('enquiry.selectRating'));
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
  
      const response = await fetch(`${baseUrl}/api/enquiries/${selectedEnquiry}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to submit rating.");
      }
  
      toast.success(t('enquiry.ratingSubmitted'));
      closePopup();
      fetchEnquiries();
      setViewMode(false);
    } catch (error) {
      console.error("🚨 Error submitting rating:", error);
      toast.error(t('enquiry.ratingSubmitFailed'));
    }
  };


  const filteredEnquiries = enquiries.filter((enquiry) => {
    return (
      (filter === "All" || enquiry.status === filter) &&
      (enquiry.message.toLowerCase().includes(search.toLowerCase()) ||
       (enquiry.subject && enquiry.subject.toLowerCase().includes(search.toLowerCase())))
    );
  });

  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={`star ${i <= rating ? "filled" : ""}`}
          onClick={() => handleRatingChange(i)}
        />
      );
    }
    return stars;
  };


  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup);
  };

  return (
    <motion.div
      className="enquiry-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >

<ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    
      <div className="enquiry-page">
              {showHelpPopup && <EnquiryHelp
               onClose={toggleHelpPopup} />}
        
        <div className="breadcrumb enquiry-head-container">
        <div style={{display:"flex", gap:"20px"}}>
          <button
                        type="button"
                        className="back-icon-button"
                        aria-label={t("forgetPasswordPage.backToLogin")}
                      >
                        <FaArrowLeft />
                      </button>
          <span onClick={() => navigate("/dashboard")}>{t("enquiry.dashboard")}</span> /{" "}
          <span>{t("enquiry.enquiries")}</span>
          </div>

          <button className="enquiry-help-button" onClick={toggleHelpPopup}>
          {t("enquiry.help")}
        </button>

        </div>
        
        {!viewMode ? (
          <>
            <div className="sidebar">
              <div className="search-bar-wrapper">
                <FiSearch className="enquiry-search-icon" />
                <input
                  type="text"
                  placeholder={t("enquiry.search_placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="enquiry-search-bar"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="filter-dropdown"
              >
                <option value="All">{t("enquiry.all")}</option>
                <option value="Raised">{t("enquiry.raised")}</option>
                <option value="Under Review">{t("enquiry.under_review")}</option>
                <option value="Solved">{t("enquiry.solved")}</option>
              </select>
              <button className="raise-btn" onClick={openEnquiryPopup}>
                {t("enquiry.raise_enquiry")}
              </button>
            </div>

            <div className="enquiry-list">
              {loading ? (
                <p>{t("enquiry.loading")}</p>
              ) : error ? (
                <p className="error">{error}</p>
              ) : filteredEnquiries.length === 0 ? (
                <p className="no-results">{t("enquiry.no_results")}</p>
              ) : (
                filteredEnquiries.map((enquiry) => (
                  <div
                    key={enquiry._id}
                    className="enquiry-card"
                    data-status={enquiry.status}
                    onClick={() => viewEnquiryDetails(enquiry)}
                  >
                    <div className="enquiry-header">
                      <h4>{enquiry.subject || "No Subject"}</h4>
                     
                    </div>

                    {enquiry.file && (
                      <div className="file-container">
                        <FaFileAlt className="file-icon" />
                        <button
                          className="file-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(enquiry._id);
                          }}
                        >
                          <FaFileDownload /> {t("enquiry.download")}
                        </button>
                      </div>
                    )}

                    <div className="enquiry-footer">
                      <span className={`status ${enquiry.status.toLowerCase()}`}>
                        {enquiry.status}
                      </span>

                      {enquiry.status === "Solved" && (
                        <div className="rating-container">
                          {enquiry.rating ? (
                            <span className="rating-count">
                              {enquiry.rating} <FaStar className="star-icon" />
                            </span>
                          ) : (
                            <button
                              className="rate-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPopup(enquiry._id);
                              }}
                            >
                              {t("enquiry.rate")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="enquiry-detail-view">
  <button className="back-button" onClick={exitViewMode}>
    <FaChevronLeft /> {t('enquiry.back')}
  </button>
  
  <div className="enquiry-detail-card">
    <div className="detail-header">
      <h2>{currentEnquiry.subject || t('enquiry.noSubject')}</h2>
      <button
        className="edit-btn"
        onClick={() => openEditPopup(currentEnquiry)}
      >
        <FaEdit /> {t('enquiry.editButton')}
      </button>
    </div>
    
    <div className="detail-meta">
      <span className={`status ${currentEnquiry.status.toLowerCase()}`}>
        {t('enquiry.status', { status: currentEnquiry.status })}
      </span>
      <span className="date">
        {t('enquiry.created', { date: new Date(currentEnquiry.createdAt).toLocaleString() })}
      </span>
      {currentEnquiry.updatedAt !== currentEnquiry.createdAt && (
        <span className="date">
          {t('enquiry.lastUpdated', { date: new Date(currentEnquiry.updatedAt).toLocaleString() })}
        </span>
      )}
    </div>
    
    <div className="detail-content">
      <h3>{t('enquiry.message')}</h3>
      <p>{currentEnquiry.message}</p>
    </div>
    
    {currentEnquiry.file && (
      <div className="detail-file">
        <h3>{t('enquiry.attachment')}</h3>
        <div className="file-container">
          <FaFileAlt className="file-icon" />
          <button
            className="file-btn"
            onClick={() => handleDownload(currentEnquiry._id)}
          >
            <FaFileDownload /> {t('enquiry.download')}
          </button>
        </div>
      </div>
    )}
    
    {currentEnquiry.status === "Solved" && (
      <div className="detail-rating">
        <h3>{t('enquiry.rating')}</h3>
        {currentEnquiry.rating ? (
          <div className="rating-display">
            {renderRatingStars(currentEnquiry.rating)}
            <span>({t('enquiry.ratingOutOf', { rating: currentEnquiry.rating })})</span>
          </div>
        ) : (
          <div>
            <p>{t('enquiry.rateSolution')}</p>
            <button
              className="rate-btn"
              onClick={() => openPopup(currentEnquiry._id)}
            >
              {t('enquiry.rateButton')}
            </button>
          </div>
        )}
      </div>
    )}
  </div>
</div>
        )}
      </div>

      {/* Rating Popup */}
      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <FaTimesCircle className="close-icon" onClick={closePopup} />
            <h3>{t("enquiry.rate_enquiry")}</h3>
            <div className="rating-popup-container">
              {renderRatingStars(rating)}
            </div>
            <div className="popup-buttons">
              <button className="submit-btn" onClick={submitRating}>
                {t("enquiry.submit_rating")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Enquiry Popup */}
      {showEnquiryPopup && (
        <div className="popup-overlay" onClick={closeEnquiryPopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <FaTimesCircle className="close-icon" onClick={closeEnquiryPopup} />
            <h3>{t("enquiry.submit_enquiry")}</h3>
            
            <input
              type="text"
              placeholder={t("enquiry.subject_placeholder")}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="subject-input"
              required
            />
            
            <textarea
              placeholder={t("enquiry.enquiry_message_placeholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea"
              required
            />
            
            <div className="file-upload-section">
              <label htmlFor="file-upload" className="upload-label">
                <FaUpload className="upload-icon" />
                {t("enquiry.upload_file")}
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  className="file-input"
                />
              </label>

              {file && (
                <div className="file-preview-container">
                  {file?.type?.includes("image") ? (
                    <img src={filePreview} alt="Preview" className="file-preview" />
                  ) : (
                    <div className="file-details">
                      <FaFileAlt className="file-icon" />
                      <p>{file.name}</p>
                    </div>
                  )}
                  <button onClick={() => setFile(null)} className="remove-btn">
                    <FaTimesCircle /> {t("enquiry.remove")}
                  </button>
                </div>
              )}
            </div>

            <div className="popup-buttons">
              <button className="submit-btn" onClick={handleSubmit}>
                {t("enquiry.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Enquiry Popup */}
      {showEditPopup && (
        <div className="popup-overlay" onClick={closeEditPopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <FaTimesCircle className="close-icon" onClick={closeEditPopup} />
            <h3>{t("enquiry.edit_enquiry")}</h3>
            
            <input
              type="text"
              placeholder={t("enquiry.subject_placeholder")}
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="subject-input"
              required
            />
            
            <textarea
              placeholder={t("enquiry.enquiry_message_placeholder")}
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              className="textarea"
              required
            />
            
            <div className="file-upload-section">
              <label htmlFor="edit-file-upload" className="upload-label">
                <FaUpload className="upload-icon" />
                {t("enquiry.upload_file")}
                <input
                  type="file"
                  id="edit-file-upload"
                  onChange={handleEditFileChange}
                  className="file-input"
                />
              </label>

              {editFile && (
                <div className="file-preview-container">
                  {editFile?.type?.includes("image") ? (
                    <img src={editFilePreview} alt="Preview" className="file-preview" />
                  ) : (
                    <div className="file-details">
                      <FaFileAlt className="file-icon" />
                      <p>{editFile.name}</p>
                    </div>
                  )}
                  <button onClick={() => setEditFile(null)} className="remove-btn">
                    <FaTimesCircle /> {t("enquiry.remove")}
                  </button>
                </div>
              )}
            </div>

            <div className="popup-buttons">
              <button className="submit-btn" onClick={handleEditSubmit}>
                {t("enquiry.update")}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Enquiry;