import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { FiSearch, FiFilter, FiMail, FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  FaWhatsapp,
  FaTelegramPlane,
  FaStickyNote,
  FaRegStickyNote,
} from "react-icons/fa";
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
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [selectedPaymentForNotes, setSelectedPaymentForNotes] = useState(null);
  const [userNotes, setUserNotes] = useState([]);
  const [showPercent, setShowPercent] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    fetchCoursePayments();
  }, [courseId]);

  useEffect(() => {
    if (selectedPaymentForNotes?.email) {
      fetchUserNotes(selectedPaymentForNotes.email);
    }
  }, [selectedPaymentForNotes]);

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
            fullName: userDetails?.fullName || "N/A",
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
      const fullName = `${data.personalDetails?.firstName || ""} ${
        data.personalDetails?.middleName || ""
      } ${data.personalDetails?.lastName || ""}`.trim();
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
      return (
        (payment.status || "Unknown").toLowerCase() ===
        activeFilter.toLowerCase()
      );
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
      case "paid":
        return "status-paid";
      case "pending":
        return "status-pending";
      case "not created":
        return "status-not-created";
      case "error":
        return "status-error";
      default:
        return "status-unknown";
    }
  };

  const startEditingNote = (note) => {
    setEditingNoteId(note._id);
    setEditingNoteText(note.text);
  };

  const fetchUserNotes = async (email) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${baseUrl}/api/user/${email}/courses/${courseId}/notes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Error fetching user notes:", error);
    }
  };

  const handleNotesClick = (payment) => {
    setSelectedPaymentForNotes(payment);
    setNotesModalOpen(true);
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedPaymentForNotes) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${baseUrl}/api/user/${selectedPaymentForNotes.email}/courses/${courseId}/notes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId: selectedPaymentForNotes._id,
            text: newNote,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserNotes([...userNotes, data.note]);
        setNewNote("");
      }
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const updateNote = async () => {
    if (!editingNoteText.trim() || !editingNoteId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${baseUrl}/api/user/${selectedPaymentForNotes.email}/courses/${courseId}/notes/${editingNoteId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: editingNoteText }),
        }
      );

      if (response.ok) {
        setUserNotes(
          userNotes.map((note) =>
            note._id === editingNoteId
              ? { ...note, text: editingNoteText }
              : note
          )
        );
        setEditingNoteId(null);
        setEditingNoteText("");
      }
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${baseUrl}/api/user/${selectedPaymentForNotes.email}/courses/${courseId}/notes/${noteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setUserNotes(userNotes.filter((note) => note._id !== noteId));
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const hasNotes = (email) => {
    return userNotes.length > 0 && selectedPaymentForNotes?.email === email;
  };

  const OfferedAmountCell = ({ amount, offerPercent, currency }) => {
    const [showPercent, setShowPercent] = useState(true);

    useEffect(() => {
      const interval = setInterval(() => {
        setShowPercent((prev) => !prev);
      }, 2000); // Toggle every 2 seconds

      return () => clearInterval(interval);
    }, []);

    const offeredAmount = amount - amount * (offerPercent / 100);

    return (
      <div className="offered-amount-container">
        {offerPercent > 0 ? (
          <>
            <div
              className={`percent-badge ${showPercent ? "visible" : "hidden"}`}
            >
              {offerPercent}% OFF
            </div>
            <div
              className={`final-amount ${showPercent ? "hidden" : "visible"}`}
            >
              {offeredAmount.toFixed(2)} {currency}
            </div>
          </>
        ) : (
          <div className="final-amount">
            {amount.toFixed(2)} {currency}
          </div>
        )}
      </div>
    );
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
            <FiFilter
              onClick={toggleFilterModal}
              className="invoice-filter-icon"
            />
            {showFilterModal && (
              <div className="course-filter-bubble">
                {["All", "Paid", "Pending", "Not Created", "Error"].map(
                  (filter) => (
                    <button
                      key={filter}
                      className={`filter-option ${
                        activeFilter === filter ? "active" : ""
                      }`}
                      onClick={() => handleFilterSelect(filter)}
                    >
                      {filter}
                    </button>
                  )
                )}
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
                <th>Package</th>
                <th>Amount</th>
                <th>Offered Amount</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <tr key={payment._id}>
                  <td>{index + 1}</td>
                  <td>
                    {payment.fullName || "N/A"}
                    <br />
                    <span>{payment.email || "N/A"}</span>
                  </td>
                  <td>{payment.package || "N/A"}</td>
                  <td>{`${payment.amount || 0} ${
                    payment.currency || "USD"
                  }`}</td>
                  <td>
                    <OfferedAmountCell
                      amount={payment.amount || 0}
                      offerPercent={payment.discountPercentage || 0}
                      currency={payment.currency || "USD"}
                    />
                  </td>

                  <td>
                    <div
                      className={`status-indicator ${getStatusClass(
                        payment.status
                      )}`}
                    >
                      {payment.status || "Unknown"}
                    </div>
                  </td>
                  <td>
                    <button
                      className={`notes-btn ${
                        hasNotes(payment.email) ? "has-notes" : "no-notes"
                      }`}
                      onClick={() => handleNotesClick(payment)}
                      title="View/Add Notes"
                    >
                      <FaRegStickyNote />
                    </button>
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
          <p className="no-invoice-submission">
            {t("InvoiceEntries.noSubmissions")}
          </p>
        )}
      </div>

      {selectedSubmission && (
        <InvoiceModal
          
          submission={selectedSubmission}
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          courseId={courseId}
          discountCode={selectedSubmission.discountCode}
          discountPercentage={selectedSubmission.discountPercentage}
        />
      )}
      {showEmailModal && (
        <EmailModal
          emailDetails={emailDetails}
          onClose={() => setShowEmailModal(false)}
        />
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
          courseId={courseId}
        />
      )}

      {notesModalOpen && selectedPaymentForNotes && (
        <div className="notes-modal-overlay">
          <div className="notes-modal">
            {/* Modal Header */}
            <div className="notes-modal-header">
              <div className="user-info">
                <div className="user-avatar">
                  {selectedPaymentForNotes.fullName
                    ? selectedPaymentForNotes.fullName.charAt(0).toUpperCase()
                    : selectedPaymentForNotes.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>
                    {selectedPaymentForNotes.fullName ||
                      selectedPaymentForNotes.email}
                  </h3>
                  <p className="user-email">{selectedPaymentForNotes.email}</p>
                </div>
              </div>
              <button
                className="notes-close-btn"
                onClick={() => {
                  setNotesModalOpen(false);
                  setEditingNoteId(null);
                  setEditingNoteText("");
                }}
                aria-label="Close notes modal"
              >
                &times;
              </button>
            </div>

            {/* Note Input Area */}
            <div className="notes-input-section">
              <div className="notes-textarea-container">
                <label htmlFor="note-textarea" className="sr-only">
                  Add a new note
                </label>
                <textarea
                  id="note-textarea"
                  value={editingNoteId ? editingNoteText : newNote}
                  onChange={(e) =>
                    editingNoteId
                      ? setEditingNoteText(e.target.value)
                      : setNewNote(e.target.value)
                  }
                  placeholder="Type your note here..."
                  rows={4}
                />
                <div className="notes-action-buttons">
                  <button
                    className={`action-btn primary-btn ${
                      editingNoteId ? "update-btn" : "add-btn"
                    }`}
                    onClick={editingNoteId ? updateNote : addNote}
                    disabled={
                      editingNoteId ? !editingNoteText.trim() : !newNote.trim()
                    }
                  >
                    {editingNoteId ? (
                      <>
                        <FiEdit2 className="btn-icon" /> Update
                      </>
                    ) : (
                      <>
                        <FaStickyNote className="btn-icon" /> Add Note
                      </>
                    )}
                  </button>

                  {editingNoteId && (
                    <button
                      className="action-btn secondary-btn"
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditingNoteText("");
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Notes Section */}
            <div className="existing-notes-section">
              <div className="section-header">
                <h4>Notes History</h4>
                <span className="notes-count">
                  {userNotes.length} note{userNotes.length !== 1 ? "s" : ""}
                </span>
              </div>

              {userNotes.length > 0 ? (
                <div className="notes-timeline">
                  {userNotes.map((note) => (
                    <div
                      key={note._id}
                      className={`note-card ${
                        editingNoteId === note._id ? "editing" : ""
                      }`}
                    >
                      {editingNoteId === note._id ? (
                        <div className="note-edit-mode">
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            autoFocus
                            rows={3}
                          />
                        </div>
                      ) : (
                        <div className="note-content">
                          <p>{note.text}</p>
                        </div>
                      )}

                      <div className="note-footer">
                        <div className="note-meta">
                          <span className="note-date">
                            {new Date(note.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {note.paymentId === selectedPaymentForNotes._id && (
                            <span className="payment-note-tag">
                              <FaStickyNote className="tag-icon" /> Payment Note
                            </span>
                          )}
                        </div>

                        <div className="note-actions">
                          {editingNoteId === note._id ? (
                            <button
                              className="note-icon-btn note-save-btn"
                              onClick={updateNote}
                              disabled={!editingNoteText.trim()}
                              title="Save changes"
                            >
                              <FiEdit2 />
                            </button>
                          ) : (
                            <>
                              <button
                                className="note-icon-btn note-edit-btn"
                                onClick={() => startEditingNote(note)}
                                title="Edit note"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                className="note-icon-btn note-delete-btn"
                                onClick={() => deleteNote(note._id)}
                                title="Delete note"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <FaStickyNote className="empty-icon" />
                  <p>No notes added yet</p>
                  <small>Add your first note above</small>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceEntries;
