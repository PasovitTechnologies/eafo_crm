import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { FiSearch, FiDownload, FiMail } from "react-icons/fi"; // 🔎 Search & Download Icons
import { FaWhatsapp } from "react-icons/fa";
import "./CourseEntries.css";
import UserDetailsModal from "./UserDetailsModal";
import EmailModal from "./EmailModal";
import WhatsAppChatBot from "./WhatsAppChatBot";
import { useTranslation } from "react-i18next";  




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
  const { t } = useTranslation(); 
  const initialState =
    location.state || JSON.parse(localStorage.getItem("modalState")) || null;
  const [showEmailModal, setShowEmailModal] = useState(false); // ✅ Toggle email modal
  const [emailDetails, setEmailDetails] = useState({
    to: "",
    subject: "",
    body: "",
    attachment: null,
  });

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false); // ✅ WhatsApp modal state
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState(""); // ✅ Store phone number
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
              const fullName = `${userData.personalDetails?.title || ""} ${
                userData.personalDetails?.firstName
              } ${userData.personalDetails?.middleName || ""} ${
                userData.personalDetails?.lastName
              }`.trim();
              const phoneNumber = `${userData.personalDetails?.phone || ""}`.trim();

              names[email] = fullName || "Unknown User";
              users[email] = {
                ...userData,
                phoneNumber: phoneNumber || "N/A", // ✅ Store phone number
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
              // ✅ Add invoice labels in order (1st → Type, 2nd → Category)
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

    // ✅ Escape and wrap fields in quotes
    const escapeCSV = (value) => {
      if (value == null) return '""'; // Handle empty fields
      const strValue = `${value}`.replace(/"/g, '""'); // Escape double quotes
      return `"${strValue}"`; // Wrap with quotes
    };

    // ✅ Generate CSV rows with proper escaping
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

    // ✅ Generate CSV content
    const csvContent = [
      headers.map(escapeCSV).join(","), // Header row
      ...rows.map((row) => row.join(",")), // Data rows
    ].join("\n");

    // ✅ Add UTF-8 BOM for special characters
    const BOM = "\uFEFF";
    const csvBlob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // ✅ Create downloadable link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.download = `course_entries_${courseId}.csv`;
    link.click();
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

  if (loading) return <div className="loading">{t("courseEntries.loading")}</div>;
  if (error) return <div className="error">{t("courseEntries.error", { error })}</div>;

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
                <th>{t("courseEntries.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission._id} onClick={() => openModal(submission)}>
                  <td>{userNames[submission.email] || "Loading..."}</td>
                  <td>{submission.email}</td>
                  <td>{new Date(submission.createdAt).toLocaleString()}</td>
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
    </div>
  );
};

export default CourseEntries;
