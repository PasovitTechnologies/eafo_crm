import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaFileAlt, FaFileDownload, FaSync, FaStar } from "react-icons/fa";

import { MdOutlineSupportAgent } from "react-icons/md";
import { FiSearch, FiDownload, FiMail, FiFilter } from "react-icons/fi"; // 🔎 Search & Download Icons
import "./Enquiry.css";
import { useTranslation } from "react-i18next";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Enquiry = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null); // For side modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Filter bubble visibility
  const { t } = useTranslation();
  
  useEffect(() => {
    fetchEnquiries();

    // Event listener for closing modal on outside click
    const handleClickOutside = (e) => {
      const modal = document.querySelector(".side-modal-container-unique");
      if (modal && !modal.contains(e.target)) {
        setIsModalOpen(false);
      }
      // Close filter bubble if clicked outside of filter options
      if (isFilterOpen && !e.target.closest(".filter-options-bubble")) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const fetchEnquiries = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${baseUrl}/api/enquiries`, {
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
        throw new Error(t("enquiry.downloadError"));
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "file"; // Adjust filename if needed
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
  
      toast.success(t("enquiry.downloadSuccess"));
    } catch (error) {
      console.error("🚨 Error downloading file:", error);
      toast.error(t("enquiry.downloadError"));
    }
  };
  

  const openModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEnquiry(null);
  };

  const handleStatusChangeInModal = async (newStatus) => {
    const updatedEnquiry = { ...selectedEnquiry, status: newStatus };
    setSelectedEnquiry(updatedEnquiry);
  
    try {
      const token = localStorage.getItem("token");
  
      const response = await fetch(`${baseUrl}/api/enquiries/${selectedEnquiry._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
  
      if (!response.ok) {
        throw new Error(t("enquiry.statusUpdateError"));
      }
  
      toast.success(t("enquiry.statusUpdateSuccess"));
      fetchEnquiries(); // Re-fetch enquiries after update
    } catch (error) {
      console.error("🚨 Error updating status:", error);
      toast.error(t("enquiry.statusUpdateError"));
    }
  };

  const filteredEnquiries = enquiries
    .filter((enquiry) => {
      return (
        (filter === "All" || enquiry.status === filter) &&
        (enquiry.message.toLowerCase().includes(search.toLowerCase()) ||
          enquiry.email.toLowerCase().includes(search.toLowerCase()))
      );
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort latest first


    const renderRatingStars = (rating) => {
        let stars = [];
        for (let i = 1; i <= 5; i++) {
          stars.push(
            <FaStar
              key={i}
              className={i <= rating ? "filled-star" : "empty-star"}
            />
          );
        }
        return stars;
      };
      

  return (
    <motion.div
      className="enquiry-container-unique"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="enquiry-page">
               <ToastContainer position="top-right"  className="custom-toast-container" autoClose={3000} />
        
        <div className="enquiry-header">
          <div className="enquiry-left-header">
            <div className="enquiry-search-container">
              <FiSearch className="enquiry-search-icon" />
              <input
                type="text"
                placeholder={t("enquiry.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-bar-unique"
              />
            </div>

<div className="filter-container" onClick={() => setIsFilterOpen((prev) => !prev)}>
    <FiFilter className="filter-icon" />
    {isFilterOpen && (
    <div className="filter-options-bubble">
        <div onClick={() => setFilter("All")} className={filter === "All" ? "active-filter" : ""}>{t('enquiry.modal.all')}</div>
        <div onClick={() => setFilter("Raised")} className={filter === "Raised" ? "active-filter" : ""}>{t('enquiry.modal.raised')}</div>
        <div onClick={() => setFilter("Under Review")} className={filter === "Under Review" ? "active-filter" : ""}>{t('enquiry.modal.underReview')}</div>
        <div onClick={() => setFilter("Solved")} className={filter === "Solved" ? "active-filter" : ""}>{t('enquiry.modal.solved')}</div>
    </div>
)}
</div>

          </div>
          <button className="refresh-btn-unique" onClick={fetchEnquiries}>
            <FaSync /> {t("enquiry.refresh")}
          </button>
        </div>

        <div className="enquiry-table-container-unique">
          <table className="enquiry-table-unique">
            <thead>
              <tr>
              <th>{t("enquiry.email")}</th>
                <th>{t("enquiry.dateTime")}</th>
                <th>{t("enquiry.status")}</th>
                <th>{t("enquiry.rating")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3">{t("enquiry.loading")}</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="3" className="error-unique">
                    {error}
                  </td>
                </tr>
              ) : filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan="3" className="no-data-unique">
                  {t("enquiry.noEnquiries")}
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enquiry) => (
                  <tr
                    key={enquiry._id}
                    onClick={() => openModal(enquiry)}
                    className={`enquiry-row-unique ${
                      filter === enquiry.status ? "highlight-filter" : ""
                    }`}
                  >
                    <td>{enquiry.email}</td>
                    <td>{new Date(enquiry.createdAt).toLocaleString("en-GB", {
  day: "2-digit",
  month: "2-digit", // Numeric month (e.g., "03" for March)
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
})}</td>

                    <td>
                      <span
                        className={`status-unique ${enquiry.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {enquiry.status}
                      </span>
                    </td>
                    <td>
              {/* Display the rating */}
              {enquiry.rating ? (
                <>
                  <div className="rating-stars">
                    {renderRatingStars(enquiry.rating)}
                  </div>
                 
                </>
              ) : (
                <span>No Rating</span> 
              )}
            </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedEnquiry && (
        <div className={`side-modal-container-unique ${isModalOpen ? "open" : ""}`}>
          <div className="side-modal-content-unique">
            <span className="close-modal-unique" onClick={closeModal}>
              &times;
            </span>
            <h3 className="modal-heading-unique">
            {t("enquiry.modal.details")}
            </h3>
            <div className="modal-info-unique">
    <div className="modal-icon-container">
        <MdOutlineSupportAgent className="modal-icon-unique" />
    </div>
    <div className="modal-info-text">
        <p>{selectedEnquiry.email}</p>
        <p>{new Date(selectedEnquiry.createdAt).toLocaleDateString('en-GB')} {new Date(selectedEnquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
</div>


            <div className="modal-message-unique">
              <strong>{t("enquiry.modal.message")}:</strong>
              <textarea
                className="modal-message-box-unique"
                value={selectedEnquiry.message}
                readOnly
              />
            </div>
            <div className="enquiry.modal-status-unique">
              <strong>{t("enquiry.modal.status")}:</strong>
              <select
                className="status-dropdown-modal-unique"
                value={selectedEnquiry.status}
                onChange={(e) => handleStatusChangeInModal(e.target.value)}
              >
                <option value="Raised">{t("enquiry.modal.raised")}</option>
                    <option value="Under Review">{t("enquiry.modal.underReview")}</option>
                    <option value="Solved">{t("enquiry.modal.solved")}</option>
              </select>
            </div>
            <div className="modal-attachments-unique">
              <strong>{t("enquiry.modal.attachments")}:</strong>
              {selectedEnquiry.file ? (
                <button
                  className="file-btn-unique"
                  onClick={() => handleDownload(selectedEnquiry._id)}
                >
                  <FaFileDownload /> {t("enquiry.modal.downloadFile")}
                </button>
              ) : (
                <p>{t("enquiry.modal.noAttachments")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Enquiry;
