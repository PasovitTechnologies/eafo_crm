import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { FiSearch, FiFilter, FiMail } from "react-icons/fi";
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import InvoiceModal from "./InvoiceModal";
import EmailModal from "./EmailModal";
import WhatsAppChatBot from "./WhatsAppChatBot";
import TelegramChatBot from "./TelegramChatBot";
import "./InvoiceEntries.css";
import InvoiceCreator from "./InvoiceCreator";

const InvoiceEntries = () => {
  const { courseId } = useParams();
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { t } = useTranslation();
  const filterRef = useRef(null);

  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDetails, setEmailDetails] = useState({});
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState("");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramPhoneNumber, setTelegramPhoneNumber] = useState("");
  const [showInvoiceCreator, setShowInvoiceCreator] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    fetchCoursePayments();
  }, [courseId]);

  const fetchCoursePayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/api/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch course payments");

      const data = await response.json();

      const enriched = await Promise.all(
        (data.payments || []).map(async (payment) => {
          const userDetails = await fetchUserDetailsByEmail(payment.email);
          return {
            ...payment,
            fullName: userDetails?.fullName || "N/A"
          };
        })
      );

      setPayments(enriched);
    } catch (error) {
      console.error("❌ Error fetching payments:", error);
    }
  };

  const fetchUserDetailsByEmail = async (email) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/api/user/${email}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("User not found");

      const data = await response.json();
      const fullName = `${data.personalDetails?.firstName || ""} ${data.personalDetails?.middleName || ""} ${data.personalDetails?.lastName || ""}`.trim();
      const phoneWithCode = `${data.personalDetails?.phone || ""}`;

      return { fullName, phone: phoneWithCode };
    } catch (err) {
      console.error("❌ Error fetching user details:", err);
      return null;
    }
  };

  const toggleFilterModal = () => setShowFilterModal((prev) => !prev);

  const handleFilterSelect = (filter) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
  };

  const filteredPayments = payments
    .filter((payment) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.email?.toLowerCase().includes(searchLower) ||
        payment.package?.toLowerCase().includes(searchLower) ||
        payment.fullName?.toLowerCase().includes(searchLower)
      );
    })
    .filter((payment) => {
      if (activeFilter === "All") return true;
      return (payment.status || "Unknown").toLowerCase() === activeFilter.toLowerCase();
    });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmailClick = (email) => {
    setEmailDetails({ to: email, subject: "", body: "", attachment: null });
    setShowEmailModal(true);
  };

  const handleWhatsAppClick = async (email) => {
    const userDetails = await fetchUserDetailsByEmail(email);
    if (userDetails) {
      setWhatsappPhoneNumber(userDetails.phone);
      setShowWhatsAppModal(true);
    }
  };

  const handleTelegramClick = async (email) => {
    const userDetails = await fetchUserDetailsByEmail(email);
    if (userDetails) {
      setTelegramPhoneNumber(userDetails.phone);
      setShowTelegramModal(true);
    }
  };

  const getStatusClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "paid": return "status-paid";
      case "pending": return "status-pending";
      case "not created": return "status-not-created";
      case "error": return "status-error";
      default: return "status-unknown";
    }
  };

  return (
    <div className="invoice-entries-container">
      <div className="entries-header">
        <div className="search-filter-container">
          <div className="search-input-wrapper">
            <FiSearch className="course-search-icon" />
            <input
              type="text"
              placeholder={t("InvoiceEntries.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="course-search-input"
            />
          </div>
          <div className="filter-icon-wrapper" ref={filterRef}>
            <FiFilter onClick={toggleFilterModal} className="invoice-filter-icon" />
            {showFilterModal && (
              <div className="course-filter-bubble">
                {["All", "Paid", "Pending", "Not Created", "Error"].map((filter) => (
                  <button
                    key={filter}
                    className={`filter-option ${activeFilter === filter ? "active" : ""}`}
                    onClick={() => handleFilterSelect(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>

      <div className="invoice-table-container">
        {filteredPayments.length > 0 ? (
          <table className="entries-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Package</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <tr key={payment._id}>
                  <td>{index + 1}</td>
                  <td>{payment.fullName || "N/A"}</td>
                  <td>{payment.email || "N/A"}</td>
                  <td>{payment.package || "N/A"}</td>
                  <td>{`${payment.amount || 0} ${payment.currency || "USD"}`}</td>
                  <td>
                    <div className={`status-indicator ${getStatusClass(payment.status)}`}>
                      {payment.status || "Unknown"}
                    </div>
                  </td>
                  <td className="invoice-actions">
                    <div className="actions-container">
                      <button
                        className="send-invoice-btn"
                        onClick={() => setSelectedSubmission(payment)}
                      >
                        {t("InvoiceEntries.sendInvoice")}
                      </button>
                      <div className="icon-container">
                        <div
                          className="icon-circle email-bg"
                          onClick={() => handleEmailClick(payment.email)}
                          title="Send Email"
                        >
                          <FiMail className="chat-icon" />
                        </div>
                        <div
                          className="icon-circle whatsapp-bg"
                          onClick={() => handleWhatsAppClick(payment.email)}
                          title="Send WhatsApp"
                        >
                          <FaWhatsapp className="chat-icon" />
                        </div>
                        <div
                          className="icon-circle telegram-bg"
                          onClick={() => handleTelegramClick(payment.email)}
                          title="Send Telegram"
                        >
                          <FaTelegramPlane className="chat-icon" />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-invoice-submission">{t("InvoiceEntries.noSubmissions")}</p>
        )}
      </div>

      {selectedSubmission && (
        <InvoiceModal
          submission={selectedSubmission}
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          courseId={courseId}
        />
      )}
      {showEmailModal && (
        <EmailModal emailDetails={emailDetails} onClose={() => setShowEmailModal(false)} />
      )}
      {showWhatsAppModal && (
        <WhatsAppChatBot
          isOpen={showWhatsAppModal}
          phoneNumber={whatsappPhoneNumber}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
      {showTelegramModal && (
        <TelegramChatBot
          isOpen={showTelegramModal}
          phoneNumber={telegramPhoneNumber}
          onClose={() => setShowTelegramModal(false)}
        />
      )}
      {showInvoiceCreator && (
        <InvoiceCreator 
        onClose={() => setShowInvoiceCreator(false)}
        submission={selectedSubmission}
        courseId={courseId} />
      )}
    </div>
  );
};

export default InvoiceEntries;
