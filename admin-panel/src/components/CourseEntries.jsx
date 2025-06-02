import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { FiSearch, FiDownload, FiMail } from "react-icons/fi"; // 🔎 Search & Download Icons
import {
  FaWhatsapp,
  FaTelegramPlane,
  FaRegStickyNote,
  FaStickyNote,
} from "react-icons/fa";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "./CourseEntries.css";
import UserDetailsModal from "./UserDetailsModal";
import EmailModal from "./EmailModal";
import WhatsAppChatBot from "./WhatsAppChatBot";
import { useTranslation } from "react-i18next";
import TelegramChatBot from "./TelegramChatBot";

const CourseEntries = () => {
  const { courseId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const initialState =
    location.state || JSON.parse(localStorage.getItem("modalState")) || null;
  const [showEmailModal, setShowEmailModal] = useState(false); // Toggle email modal
  const [emailDetails, setEmailDetails] = useState({
    to: "",
    subject: "",
    body: "",
    attachment: null,
  });

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false); // WhatsApp modal state
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState(""); // Store phone number
  const [telegramPhoneNumber, setTelegramPhoneNumber] = useState(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [selectedPaymentForNotes, setSelectedPaymentForNotes] = useState(null);
  const [userNotes, setUserNotes] = useState([]);
  const [hoveredRowId, setHoveredRowId] = useState(null); // Instead of hoveredEmail
  const [userNotesMap, setUserNotesMap] = useState({});
  const [hoveredEmail, setHoveredEmail] = useState(null);

  const baseUrl = import.meta.env.VITE_BASE_URL;

  console.log("📌 State received:", initialState);

  const emailParam = initialState?.email || null;
  const openModalParam = initialState?.open || false;
  // ✅ Fetch course details and submissions
  useEffect(() => {
    const fetchCourseDetails = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authorization token found.");
        setLoading(false);
        return;
      }

      try {
        const [courseResponse, formsResponse] = await Promise.all([
          fetch(`${baseUrl}/api/courses/${courseId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`${baseUrl}/api/form`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

        if (!courseResponse.ok)
          throw new Error("Failed to fetch course details.");
        if (!formsResponse.ok) throw new Error("Failed to fetch forms.");

        const courseData = await courseResponse.json();
        const formsData = await formsResponse.json();

        const formsArray = Array.isArray(formsData.forms)
          ? formsData.forms
          : [];
        const matchingForms = formsArray.filter(
          (form) => form.courseId === courseId && form.isUsedForRegistration
        );

        const allSubmissions = matchingForms.flatMap(
          (form) => form.submissions || []
        );
        const sortedSubmissions = allSubmissions.sort(
          (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
        );

        setSubmissions(sortedSubmissions);

        // ✅ Fetch user names
        await fetchUserNames(sortedSubmissions, token);

        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    const fetchUserNames = async (submissions, token) => {
      const names = {};
      const users = {};

      const userFetchPromises = submissions.map(async (submission) => {
        const email = submission.email;
        if (!names[email]) {
          try {
            const userResponse = await fetch(`${baseUrl}/api/user/${email}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();

              const { title, firstName, middleName, lastName, country } =
                userData.personalDetails || {};
              let fullName;

              // ✅ Check the country and format accordingly
              if (userData.dashboardLang === "ru") {
                fullName = `${lastName || ""} ${firstName || ""} ${
                  middleName || ""
                }`.trim();
              } else {
                fullName = `${firstName || ""} ${middleName || ""} ${
                  lastName || ""
                }`.trim();
              }

              const phoneNumber = `${
                userData.personalDetails?.phone || ""
              }`.trim();

              names[email] = fullName || "Unknown User";
              users[email] = {
                ...userData,
                phoneNumber: phoneNumber || "N/A",
              };
            } else {
              names[email] = "Unknown User";
            }
          } catch (error) {
            console.error(`Error fetching user ${email}:`, error);
            names[email] = "Unknown User";
            users[email] = { phoneNumber: "N/A" };
          }
        }
      });

      await Promise.all(userFetchPromises);
      setUserNames(names);
      setUserData(users);
    };

    fetchCourseDetails();
  }, [courseId]);

  const handleWhatsAppClick = (email) => {
    const user = userData[email];

    if (user && user.phoneNumber) {
      console.log("📞 Opening WhatsApp for:", user.phoneNumber);
      setWhatsappPhoneNumber(user.phoneNumber); // ✅ Set phone number
      setShowWhatsAppModal(true); // ✅ Open WhatsApp modal
    } else {
      alert("Phone number not available for this user.");
    }
  };

  const handleTelegramClick = (email) => {
    const user = userData[email];

    if (user && user.phoneNumber) {
      console.log("✈️ Opening Telegram modal for:", user.phoneNumber);
      setTelegramPhoneNumber(user.phoneNumber); // ✅ Set Telegram phone number
      setShowTelegramModal(true); // ✅ Show Telegram modal
    } else {
      alert("Phone number not available for this user.");
    }
  };

  // ✅ Auto-open modal on load with state values
  useEffect(() => {
    if (!loading && submissions.length > 0 && emailParam && openModalParam) {
      const selected = submissions.find((s) => s.email === emailParam);

      if (selected) {
        console.log("✅ Opening modal for:", emailParam);
        setSelectedRecord(selected);
        setShowModal(true);

        // ✅ Clear the localStorage after opening the modal
        localStorage.removeItem("modalState");
      } else {
        console.warn("⚠️ No matching submission found for:", emailParam);
      }
    }
  }, [loading, submissions, emailParam, openModalParam]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const openModal = (submission) => {
    setSelectedRecord(submission);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
  };

  const exportToCSV = async () => {
    if (submissions.length === 0) return;

    const token = localStorage.getItem("token");

    // ✅ Fetch form questions to map labels
    const fetchFormQuestions = async () => {
      try {
        const formsResponse = await fetch(`${baseUrl}/api/form`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!formsResponse.ok)
          throw new Error("Failed to fetch form questions.");

        const formsData = await formsResponse.json();
        const formsArray = Array.isArray(formsData.forms)
          ? formsData.forms
          : [];

        // ✅ Filter only the forms linked to the current course
        const courseForms = formsArray.filter(
          (form) => form.courseId === courseId && form.isUsedForRegistration
        );

        const labelMap = {};
        const invoiceLabels = [];

        courseForms.forEach((form) => {
          form.questions.forEach((question) => {
            const label = question.label.trim().replace(/<[^>]*>/g, ""); // Remove HTML tags
            labelMap[question._id] = label;

            if (question.isUsedForInvoice) {
              invoiceLabels.push(label);
            }
          });
        });

        return { labelMap, invoiceLabels };
      } catch (error) {
        console.error("Error fetching form questions:", error);
        return { labelMap: {}, invoiceLabels: [] };
      }
    };

    // ✅ Get label map and invoice fields
    const { labelMap, invoiceLabels } = await fetchFormQuestions();

    // ✅ Prepare submission data with invoice and normal fields separated
    const submissionData = submissions.map((submission) => {
      const invoiceFields = [];
      const normalFields = {};

      // ✅ Separate invoice & normal fields
      submission.responses.forEach((res) => {
        const questionId = res.questionId;
        const label = labelMap[questionId] || `Unknown (${questionId})`;

        let answer = Array.isArray(res.answer)
          ? res.answer.join(", ") // Join array answers with comma
          : `${res.answer}`.trim();

        if (res.isUsedForInvoice) {
          invoiceFields.push(answer);
        } else {
          normalFields[label] = answer;
        }
      });

      // Ensure there are always two invoice fields (add "N/A" if missing)
      while (invoiceFields.length < 2) {
        invoiceFields.push("N/A");
      }

      return {
        name: userNames[submission.email] || "Unknown",
        email: submission.email,
        submittedAt: new Date(submission.submittedAt).toLocaleString(),
        invoiceFields,
        normalFields,
      };
    });

    // ✅ Collect all unique normal field labels
    const normalLabels = new Set();
    submissionData.forEach((submission) => {
      Object.keys(submission.normalFields).forEach((label) => {
        normalLabels.add(label);
      });
    });

    const sortedNormalLabels = Array.from(normalLabels).sort();

    // ✅ Create CSV headers
    const headers = [
      "Name",
      "Email",
      "Submitted At",
      "Type of Registration", // First invoice field
      "Category of Registration", // Second invoice field
      ...sortedNormalLabels, // Normal fields
    ];

    // ✅ Escape and wrap fields in quotes for proper CSV format
    const escapeCSV = (value) => {
      if (value == null) return '""'; // Handle empty fields
      const strValue = `${value}`.replace(/"/g, '""'); // Escape double quotes
      return `"${strValue}"`; // Wrap with quotes
    };

    // ✅ Generate CSV rows
    const rows = submissionData.map((submission) => {
      const row = [
        escapeCSV(submission.name),
        escapeCSV(submission.email),
        escapeCSV(submission.submittedAt),
        ...submission.invoiceFields.map(escapeCSV), // Invoice fields
      ];

      // ✅ Add normal fields in consistent order
      sortedNormalLabels.forEach((label) => {
        row.push(escapeCSV(submission.normalFields[label] || "N/A"));
      });

      return row;
    });

    // ✅ Generate CSV content with UTF-8 BOM
    const BOM = "\uFEFF"; // ✅ Forces Excel to recognize UTF-8
    const csvContent = [
      headers.join(","), // ✅ Comma-separated headers
      ...rows.map((row) => row.join(",")), // ✅ Comma-separated rows
    ].join("\n");

    const csvBlob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // ✅ Create downloadable link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.download = `course_entries_${courseId}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const email = submission.email.toLowerCase();
    const name = (userNames[submission.email] || "").toLowerCase();
    const term = searchTerm.toLowerCase();

    return email.includes(term) || name.includes(term);
  });

  const handleEmailClick = (email) => {
    // ✅ Open the email modal with empty subject and body
    setEmailDetails({
      to: email,
      subject: "", // Empty subject
      body: "", // Empty body
      attachment: null,
    });
    setShowEmailModal(true);
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
    fetchUserNotes(payment.email);
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
        const updatedNotes = [...userNotes, data.note];
        setUserNotes(updatedNotes);
        setNewNote("");
      
        // 👇 Update tooltip notes
        setUserNotesMap((prev) => ({
          ...prev,
          [selectedPaymentForNotes.email]: updatedNotes,
        }));
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
        const updated = userNotes.map((note) =>
          note._id === editingNoteId ? { ...note, text: editingNoteText } : note
        );
        setUserNotes(updated);
        setEditingNoteId(null);
        setEditingNoteText("");
      
        // 👇 Update tooltip notes
        setUserNotesMap((prev) => ({
          ...prev,
          [selectedPaymentForNotes.email]: updated,
        }));
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
        const updated = userNotes.filter((note) => note._id !== noteId);
        setUserNotes(updated);
      
        // 👇 Update tooltip notes
        setUserNotesMap((prev) => ({
          ...prev,
          [selectedPaymentForNotes.email]: updated,
        }));
      }
      
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const hasNotes = (email) => {
    return userNotes.length > 0 && selectedPaymentForNotes?.email === email;
  };

  const startEditingNote = (note) => {
    setEditingNoteId(note._id);
    setEditingNoteText(note.text);
  };

  const handleNotesHover = async (email) => {
    setHoveredEmail(email);

    if (!userNotesMap[email]) {
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
          setUserNotesMap((prev) => ({
            ...prev,
            [email]: data.notes || [],
          }));
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    }
  };

  if (loading)
    return <div className="loading">{t("courseEntries.loading")}</div>;
  if (error)
    return <div className="error">{t("courseEntries.error", { error })}</div>;

  return (
    <div className="entries-wrapper">
      {/* 🔎 Header with Export Button */}
      <div className="header-container">
        <div className="search-bar-wrapper">
          <FiSearch className="invoice-search-icon" />
          <input
            type="text"
            placeholder={t("courseEntries.searchPlaceholder")}
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        {/* ⬇️ Export Button */}
        <button className="csv-export-btn" onClick={exportToCSV}>
          <FiDownload /> {t("courseEntries.exportCSV")}
        </button>
      </div>

      <div className="course-table-container">
        {filteredSubmissions.length > 0 ? (
          <table className="modern-table">
            <thead>
              <tr>
                <th>{t("courseEntries.name")}</th>
                <th>{t("courseEntries.email")}</th>
                <th>{t("courseEntries.submittedAt")}</th>
                <th>Notes</th>
                <th>{t("courseEntries.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission, index) => (
                <tr key={submission._id} onClick={() => openModal(submission)}>
                  <td>{userNames[submission.email] || "Loading..."}</td>
                  <td>{submission.email}</td>
                  <td>{new Date(submission.createdAt).toLocaleString()}</td>
                  <td className="notes-cell">
                    <div
                      className="notes-wrapper"
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        const rowKey = `${submission.email}_${index}`;
                        setHoveredRowId(rowKey);
                        handleNotesHover(submission.email);
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        setHoveredRowId(null);
                      }}
                    >
                      <button
                        className={`notes-btn ${
                          userNotesMap[submission.email]?.length
                            ? "has-notes"
                            : "no-notes"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotesClick({
                            email: submission.email,
                            fullName: userNames[submission.email] || "",
                            _id: submission._id,
                          });
                        }}
                        title="View/Add Notes"
                      >
                        <FaRegStickyNote />
                      </button>

                      {hoveredRowId === `${submission.email}_${index}` &&
                        userNotesMap[submission.email]?.length > 0 && (
                          <div
                            className="notes-tooltip"
                            onClick={(e) => {
                              e.stopPropagation(); // 🛑 Prevent triggering <tr> click
                              handleNotesClick({
                                email: submission.email,
                                fullName: userNames[submission.email] || "",
                                _id: submission._id,
                              });
                            }}
                          >
                            <ol className="tooltip-note-list">
                              {userNotesMap[submission.email].map(
                                (note, idx) => (
                                  <li
                                    key={note._id}
                                    className="tooltip-note-item"
                                  >
                                    <strong>{idx + 1}.</strong>{" "}
                                    {note.text.length > 100
                                      ? note.text.slice(0, 100) + "..."
                                      : note.text}
                                  </li>
                                )
                              )}
                            </ol>
                          </div>
                        )}
                    </div>
                  </td>

                  <td>
                    <div className="icon-container">
                      <div
                        className="icon-circle email-bg"
                        title="Send Email"
                        onClick={(e) => {
                          e.stopPropagation(); // ✅ Prevents the row click
                          handleEmailClick(submission.email);
                        }}
                      >
                        <FiMail className="chat-icon" />
                      </div>

                      <div
                        className="icon-circle whatsapp-bg"
                        title="Send WhatsApp"
                        onClick={(e) => {
                          e.stopPropagation(); // ✅ Prevents the row click
                          handleWhatsAppClick(submission.email);
                        }}
                      >
                        <FaWhatsapp className="chat-icon" />
                      </div>
                      <div
                        className="icon-circle telegram-bg"
                        title="Send Telegram"
                        onClick={(e) => {
                          e.stopPropagation(); // ✅ Prevents the row click
                          handleTelegramClick(submission.email); // 🔁 Make sure you define this handler
                        }}
                      >
                        <FaTelegramPlane className="chat-icon" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-submissions">{t("courseEntries.noSubmissions")}</p>
        )}
      </div>

      {showModal && selectedRecord && (
        <UserDetailsModal
          submission={selectedRecord}
          userData={userData[selectedRecord.email]}
          closeModal={closeModal}
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

export default CourseEntries;
