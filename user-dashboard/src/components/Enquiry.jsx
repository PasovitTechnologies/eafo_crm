import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./Enquiry.css";
import { FaFileAlt, FaFileDownload, FaTimesCircle, FaUpload, FaStar } from "react-icons/fa";
import { FiSearch} from "react-icons/fi"; // 🔎 Search & Download Icons
import { useTranslation } from "react-i18next";
const baseUrl = import.meta.env.VITE_BASE_URL;

const Enquiry = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [enquiries, setEnquiries] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0); // Rating for the current enquiry
  const [selectedEnquiry, setSelectedEnquiry] = useState(null); // Store the enquiry that is being rated
  const [showEnquiryPopup, setShowEnquiryPopup] = useState(null);
  const {t} =useTranslation();

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
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
  const  openEnquieyPopup = (enquiryId) =>{
    setSelectedEnquiry(enquiryId);
    setShowEnquiryPopup(true);
  }

  const closePopup = () => {
    setShowPopup(false);
    setSelectedEnquiry(null);
    setRating(0); // Reset rating when closing the popup
  };
  const closeEnquiryPopup = () =>{
    setShowEnquiryPopup(false);
    setSelectedEnquiry(null);

  }

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];

    if (uploadedFile) {
      const fileSizeInMB = uploadedFile.size / (1024 * 1024); // Convert size to MB
      if (fileSizeInMB > 5) {
        alert("File size exceeds 5MB. Please upload a smaller file.");
        return;
      }

      setFile(uploadedFile);

      // Preview for image files
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  const handleSubmit = async () => {
    if (!message) {
      alert("Please enter a message.");
      return;
    }

    const formData = new FormData();
    formData.append("email", localStorage.getItem("email"));
    formData.append("message", message);
    formData.append("status", "Raised");
    formData.append("rating", rating); // Add rating to form data

    if (file) {
      formData.append("file", file);
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${baseUrl}/api/enquiries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit enquiry.");
      }

      alert("Enquiry submitted successfully!");
      setShowEnquiryPopup(false);
      fetchEnquiries();
    } catch (error) {
      console.error("🚨 Error submitting enquiry:", error);
      alert("Failed to submit enquiry.");
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
    } catch (error) {
      console.error("🚨 Error downloading file:", error);
      alert("Failed to download file.");
    }
  };

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const submitRating = async () => {
    if (!rating) {
      alert("Please select a rating.");
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

      alert("Rating submitted successfully!");
      closePopup();
      fetchEnquiries(); // Refresh enquiries after submitting the rating
    } catch (error) {
      console.error("🚨 Error submitting rating:", error);
      alert("Failed to submit rating.");
    }
  };

  const filteredEnquiries = enquiries.filter((enquiry) => {
    return (
      (filter === "All" || enquiry.status === filter) &&
      enquiry.message.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Function to display the stars based on rating
  
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

  return (
    <motion.div
      className="enquiry-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="enquiry-page">
      <div className="breadcrumb">
          <span onClick={() => navigate("/dashboard")}>{t("enquiry.dashboard")}</span> /{" "}
          <span>{t("enquiry.enquiries")}</span>
        </div>
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
    <button className="raise-btn" onClick={openEnquieyPopup}>
    {t("enquiry.raise_enquiry")}
    </button>
  </div>

  <div className="enquiry-list">
    {loading ? (
      <p>{t("enquiry.loading")}</p>
    ) : error ? (
      <p className="error">{error}</p>
    ) : filteredEnquiries.length === 0 ? (
      <p className="no-results">{t("enquiry.no_result")}</p>
    ) : (
      filteredEnquiries.map((enquiry) => (
        <div
          key={enquiry._id}
          className="enquiry-card"
          data-status={enquiry.status}
        >
          <h4>{enquiry.message}</h4>

          {enquiry.file && (
            <div className="file-container">
              <FaFileAlt className="file-icon" />
              <button
                className="file-btn"
                onClick={() => handleDownload(enquiry._id)}
              >
                <FaFileDownload /> {t("enquiry.download")}
              </button>
            </div>
          )}

          <span className={`status ${enquiry.status.toLowerCase()}`}>
            {enquiry.status}
          </span>

          {/* Rating Button for "Solved" enquiries */}
          {enquiry.status === "Solved" && (
            <div className="rating-container">
              {enquiry.rating ? (
                <>
                  {/* If rating already exists, show the stars with count */}
                 
                  <span className="rating-count">
                    {enquiry.rating} <FaStar className="star-icon" />
                  </span>
                </>
              ) : (
                <button
                  className="rate-btn"
                  onClick={() => openPopup(enquiry._id)} // Open rating popup
                >
                  {t("enquiry.rate")}
                </button>
              )}
            </div>
          )}
        </div>
      ))
    )}
  </div>
</div>


      {/* Rating Popup */}
      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <FaTimesCircle className="close-icon" onClick={closePopup} />
            <h3>{t("enquiry.rate_enquiry")}</h3>

            {/* Single row of five stars */}
            <div className="rating-popup-container">
              {renderRatingStars(rating)} {/* Render the stars */}
            </div>

            <div className="popup-buttons">
              <button className="submit-btn" onClick={submitRating}>
              {t("enquiry.submit_rating")}
              </button>
            </div>
          </div>
        </div>
      )}

{showEnquiryPopup && (
        <div className="popup-overlay" onClick={closeEnquiryPopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <FaTimesCircle className="close-icon" onClick={closeEnquiryPopup} />
            <h3>{t("enquiry.submit_enquiry")}</h3>
            <textarea
              placeholder={t("enquiry.enquiry_message_placeholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea"
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
    </motion.div>
  );
};

export default Enquiry;
