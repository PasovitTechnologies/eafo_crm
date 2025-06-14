import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import "./UserDetailsModal.css";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import Papa from "papaparse";
import { useTranslation } from "react-i18next";
import PTSansNarrowBase64 from "../assets/fonts/PTSansNarrow.base64.js";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import Swal from "sweetalert2";

const UserDetailsModal = ({ submission, userData, closeModal }) => {
  const { courseId } = useParams();
  const defaultImage =
    "https://static.wixstatic.com/media/df6cc5_dc3fb9dd45a9412fb831f0b222387da1~mv2.jpg";

  const [activeTab, setActiveTab] = useState("Personal");
  const [invoiceType, setInvoiceType] = useState("N/A");
  const [categoryType, setCategoryType] = useState("N/A");
  const [fullUserData, setFullUserData] = useState(null);
  const [formQuestions, setFormQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const [otherForms, setOtherForms] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [selectedQrCode, setSelectedQrCode] = useState(null);
  const [otherFormsData, setOtherFormsData] = useState({});
  const [imageLoaded, setImageLoaded] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [emailSentStatus, setEmailSentStatus] = useState({
    reminder: false,
    confirmation: false,
  });
  

  const [otherFormsSubmissions, setOtherFormsSubmissions] = useState({});
  const token = localStorage.getItem("token");
  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userData?.email || !courseId) return;

        // Fetch full user data
        const userResponse = await fetch(
          `${baseUrl}/api/user/${userData.email}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!userResponse.ok) throw new Error("Failed to fetch full user data");
        const fullUser = await userResponse.json();
        setFullUserData(fullUser);

        // Extract invoice fields
        const invoiceFields = submission.responses.filter(
          (res) => res.isUsedForInvoice === true
        );
        setInvoiceType(invoiceFields[0]?.answer || "N/A");
        setCategoryType(invoiceFields[1]?.answer || "N/A");

        // Find the course by courseId
        const course = fullUser.courses.find((c) => c.courseId === courseId);
        if (!course) {
          console.error("Course not found!");
          setIsLoading(false);
          return;
        }

        // Separate registration forms from other forms
        const registrationForms = course.registeredForms.filter(
          (form) => form.isUsedForRegistration
        );
        const otherFormsList = course.registeredForms.filter(
          (form) => !form.isUsedForRegistration
        );
        setOtherForms(otherFormsList);

        // Fetch registration form questions
        const registrationFormIds = registrationForms.map(
          (form) => form.formId
        );
        const allQuestions = [];

        for (const formId of registrationFormIds) {
          const formResponse = await fetch(`${baseUrl}/api/form/${formId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (formResponse.ok) {
            const formData = await formResponse.json();
            allQuestions.push(...(formData.questions || []));
          }
        }

        setFormQuestions(allQuestions);

        // Process other forms
        const formsSubmissions = {};
        for (const form of otherFormsList) {
          try {
            // Fetch form data (which includes submissions)
            const formResponse = await fetch(
              `${baseUrl}/api/form/${form.formId}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!formResponse.ok) continue;
            const formData = await formResponse.json();

            // Find the user's submission in the form's submissions array
            if (formData.submissions && Array.isArray(formData.submissions)) {
              const userSubmission = formData.submissions.find(
                (sub) =>
                  sub.email.toLowerCase() === userData.email.toLowerCase()
              );

              if (userSubmission) {
                formsSubmissions[form.formId] = {
                  questions: formData.questions || [],
                  submission: userSubmission,
                  formName: form.formName,
                };
              }
            }
          } catch (error) {
            console.error(`Error processing form ${form.formId}:`, error);
          }
        }

        setOtherFormsSubmissions(formsSubmissions);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, userData, submission.responses, token]);

  console.log(submission.email);

  useEffect(() => {
    if (fullUserData && courseId) {
      // Find the current course
      const course = fullUserData.courses.find((c) => c.courseId === courseId);
      if (course?.qrCodes?.length > 0) {
        setQrCodes(course.qrCodes);
        setSelectedQrCode(course.qrCodes[0]); // Select first QR code by default
      }
    }
  }, [fullUserData, courseId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const fetchQRImage = async () => {
      try {
        if (!selectedQrCode?.qrFileId) return;

        const response = await fetch(
          `${baseUrl}/api/form/files/${selectedQrCode.qrFileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch QR image");

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setQrImageUrl(objectUrl);
      } catch (error) {
        console.error("Failed to load QR code image", selectedQrCode);
      }
    };

    fetchQRImage();
  }, [selectedQrCode]);

  const downloadQRCode = async (qrCode) => {
    try {
      if (!qrCode?.qrFileId) {
        throw new Error("QR code file ID missing");
      }

      const response = await fetch(
        `${baseUrl}/api/form/files/${qrCode.qrFileId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download QR code: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_Code_${qrCode.formId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading QR code:", error);
      alert(`Failed to download QR code: ${error.message}`);
    }
  };

  const viewQRCode = (qrCode) => {
    window.open(qrCode.url, "_blank");
  };

  const sanitizeLabel = (label) => {
    const div = document.createElement("div");
    div.innerHTML = label;
    return div.textContent || div.innerText || "Unknown Question";
  };

  const getQuestionLabel = (questionId, formId = null) => {
    let questions = formQuestions;

    if (formId && otherFormsSubmissions[formId]) {
      questions = otherFormsSubmissions[formId].questions;
    }

    const question = questions.find((q) => q._id === questionId);
    return question ? sanitizeLabel(question.label) : "Unknown Question";
  };

  const renderFileResponse = (fileData) => {
    if (!fileData || !fileData.fileId) {
      return <span className="file-missing">No file available</span>;
    }

    return (
      <div className="file-response">
        <a
          href="#"
          className="file-link"
          onClick={(e) => {
            e.preventDefault(); // Prevent page refresh
            downloadFile(fileData);
          }}
        >
          <i className="fas fa-file"></i>{" "}
          {`File (${(fileData.size / 1024).toFixed(2)} KB)`}
        </a>

        <button className="download-btn" onClick={() => downloadFile(fileData)}>
          <i className="fas fa-download"></i> Download
        </button>
      </div>
    );
  };

  const downloadFile = async (file) => {
    try {
      if (!file?.fileId) {
        alert("Invalid file data");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/api/form/files/${file.fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Use filename from the file object
      const filename = file.fileName || "download";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert(`Download failed: ${error.message}`);
    }
  };

  const loadFont = async () => {
    const response = await fetch("/fonts/PTSansNarrow-Regular.ttf");
    const fontData = await response.arrayBuffer();
    const fontBase64 = btoa(
      new Uint8Array(fontData).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    return fontBase64;
  };

  const exportToCSV = () => {
    if (!submission) {
      console.error("No submission data available.");
      return;
    }

    const csvData = [];

    // Add Section Headers
    csvData.push(["Section", "Label", "Value"]);

    // Personal Details
    csvData.push(["Personal", "", ""]);
    csvData.push([
      "",
      "First Name",
      fullUserData?.personalDetails?.firstName || "N/A",
    ]);
    csvData.push([
      "",
      "Last Name",
      fullUserData?.personalDetails?.lastName || "N/A",
    ]);
    csvData.push(["", "Email", submission?.email || "N/A"]);
    csvData.push(["", "Phone", fullUserData?.personalDetails?.phone || "N/A"]);
    csvData.push([
      "",
      "Country",
      fullUserData?.personalDetails?.country || "N/A",
    ]);

    // Invoice Info
    csvData.push(["Invoice", "", ""]);
    csvData.push(["", "Invoice Type", invoiceType || "N/A"]);
    csvData.push(["", "Category Type", categoryType || "N/A"]);

    // Registration Responses
    csvData.push(["Registration", "", ""]);
    if (submission.responses && submission.responses.length > 0) {
      submission.responses.forEach((res) => {
        const label =
          getQuestionLabel(res.questionId) || `Unknown (${res.questionId})`;
        let answer = res.file
          ? `[FILE] ${res.file.fileName} (${(res.file.size / 1024).toFixed(
              2
            )} KB)`
          : Array.isArray(res.answer)
          ? res.answer.join(", ")
          : res.answer;

        csvData.push(["", label, answer || "N/A"]);
      });
    } else {
      csvData.push(["", "No responses available", "N/A"]);
    }

    // Other Forms
    Object.entries(otherFormsSubmissions).forEach(([formId, formData]) => {
      csvData.push([formData.formName, "", ""]);
      if (
        formData.submission.responses &&
        formData.submission.responses.length > 0
      ) {
        formData.submission.responses.forEach((res) => {
          const label =
            getQuestionLabel(res.questionId, formId) ||
            `Unknown (${res.questionId})`;
          let answer = res.file
            ? `[FILE] ${res.file.fileName} (${(res.file.size / 1024).toFixed(
                2
              )} KB)`
            : Array.isArray(res.answer)
            ? res.answer.join(", ")
            : res.answer;

          csvData.push(["", label, answer || "N/A"]);
        });
      } else {
        csvData.push(["", "No responses available", "N/A"]);
      }
    });

    // Convert to CSV format
    const BOM = "\uFEFF";
    const csv = BOM + Papa.unparse(csvData);

    // Create CSV Blob and Trigger Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `user_data_${submission.email || "unknown"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const margin = 10;
    let startY = 25;

    // Load custom font
    doc.addFileToVFS("PTSansNarrow.ttf", PTSansNarrowBase64);
    doc.addFont("PTSansNarrow.ttf", "PTSansNarrow", "normal");
    doc.setFont("PTSansNarrow", "normal");

    // Helper function to handle undefined values safely
    const splitText = (text, maxWidth) => {
      const safeText = text ? String(text) : t("pdfExport.values.notAvailable");
      return doc.splitTextToSize(safeText, maxWidth);
    };

    // PDF Header
    doc.setFontSize(18);
    doc.text(t("pdfExport.title"), margin, startY);
    startY += 10;

    // Personal Details
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(t("pdfExport.sections.personalDetails"), margin, startY);
    startY += 5;

    doc.autoTable({
      startY: startY,
      head: [[t("pdfExport.fields.label"), t("pdfExport.fields.value")]],
      body: [
        [
          t("pdfExport.fields.firstName"),
          splitText(fullUserData?.personalDetails?.firstName, 160),
        ],
        [
          t("pdfExport.fields.lastName"),
          splitText(fullUserData?.personalDetails?.lastName, 160),
        ],
        [t("pdfExport.fields.email"), splitText(submission?.email, 160)],
        [
          t("pdfExport.fields.phone"),
          splitText(fullUserData?.personalDetails?.phone, 160),
        ],
        [
          t("pdfExport.fields.country"),
          splitText(fullUserData?.personalDetails?.country, 160),
        ],
      ],
      styles: { font: "PTSansNarrow", fontSize: 10, overflow: "linebreak" },
    });

    startY = doc.lastAutoTable.finalY + 10;

    // Professional Details
    doc.setFontSize(14);
    doc.text(t("pdfExport.sections.professionalDetails"), margin, startY);
    startY += 5;

    doc.autoTable({
      startY: startY,
      head: [[t("pdfExport.fields.label"), t("pdfExport.fields.value")]],
      body: [
        [
          t("pdfExport.fields.university"),
          splitText(fullUserData?.professionalDetails?.university, 160),
        ],
        [
          t("pdfExport.fields.department"),
          splitText(fullUserData?.professionalDetails?.department, 160),
        ],
        [
          t("pdfExport.fields.profession"),
          splitText(fullUserData?.professionalDetails?.profession, 160),
        ],
        [
          t("pdfExport.fields.position"),
          splitText(fullUserData?.professionalDetails?.position, 160),
        ],
      ],
      styles: { font: "PTSansNarrow", fontSize: 10, overflow: "linebreak" },
    });

    startY = doc.lastAutoTable.finalY + 10;

    // Invoice Information
    doc.setFontSize(14);
    doc.text(t("pdfExport.sections.invoiceInfo"), margin, startY);
    startY += 5;

    doc.autoTable({
      startY: startY,
      head: [[t("pdfExport.fields.label"), t("pdfExport.fields.value")]],
      body: [
        [t("pdfExport.fields.invoiceType"), splitText(invoiceType, 160)],
        [t("pdfExport.fields.categoryType"), splitText(categoryType, 160)],
      ],
      styles: { font: "PTSansNarrow", fontSize: 10, overflow: "linebreak" },
    });

    startY = doc.lastAutoTable.finalY + 10;

    // Registration Responses
    doc.setFontSize(14);
    doc.text(t("pdfExport.sections.registrationResponses"), margin, startY);
    startY += 5;

    const registrationData = (submission?.responses || []).map((res) => [
      splitText(
        getQuestionLabel(res?.questionId) ??
          t("pdfExport.fields.unknownQuestion"),
        80
      ),
      splitText(
        res?.file
          ? `${t("pdfExport.fields.file")} ${res.file.fileName} (${(
              res.file.size / 1024
            ).toFixed(2)} KB)`
          : JSON.stringify(res?.answer ?? t("pdfExport.fields.noAnswer")),
        160
      ),
    ]);

    doc.autoTable({
      startY: startY,
      head: [[t("pdfExport.fields.label"), t("pdfExport.fields.answer")]],
      body: registrationData.length
        ? registrationData
        : [
            [
              t("pdfExport.values.notAvailable"),
              t("pdfExport.values.notAvailable"),
            ],
          ],
      styles: { font: "PTSansNarrow", fontSize: 10, overflow: "linebreak" },
    });

    startY = doc.lastAutoTable.finalY + 10;

    // Other Forms Submissions
    Object.entries(otherFormsSubmissions || {}).forEach(
      ([formId, formData]) => {
        startY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(14);
        doc.text(
          formData.formName || t("pdfExport.fields.unknownForm"),
          margin,
          startY
        );
        startY += 5;

        const formSubmissionData = (formData.submission?.responses || []).map(
          (res) => [
            splitText(
              getQuestionLabel(res?.questionId, formId) ??
                t("pdfExport.fields.unknownQuestion"),
              80
            ),
            splitText(
              res?.file
                ? `${t("pdfExport.fields.file")} ${res.file.fileName} (${(
                    res.file.size / 1024
                  ).toFixed(2)} KB)`
                : JSON.stringify(res?.answer ?? t("pdfExport.fields.noAnswer")),
              160
            ),
          ]
        );

        doc.autoTable({
          startY: startY,
          head: [[t("pdfExport.fields.label"), t("pdfExport.fields.answer")]],
          body: formSubmissionData.length
            ? formSubmissionData
            : [
                [
                  t("pdfExport.values.notAvailable"),
                  t("pdfExport.values.notAvailable"),
                ],
              ],
          styles: { font: "PTSansNarrow", fontSize: 10, overflow: "linebreak" },
        });
      }
    );

    // Save PDF
    doc.save(`user_data_${submission?.email || "unknown"}.pdf`);
  };

  const renderFormSubmissions = (formId) => {
    const formData = otherFormsSubmissions[formId];
    if (!formData) return <div>No submission data found for this form.</div>;

    return (
      <div className="content-info">
        <h3>{formData.formName}</h3>
        <ul className="submission-responses">
          {formData.submission.responses.map((res, idx) => {
            const label = getQuestionLabel(res.questionId, formId);

            const hasFiles = Array.isArray(res.files) && res.files.length > 0;
            const singleFile = res.file && res.file.fileId;
            const embeddedFile = res.answer && res.answer.fileId;

            const renderFileBlock = (file, i) => (
              <div className="file-response" key={i}>
                <span>
                  <i className="fas fa-file-alt"></i> {file.fileName} (
                  {(file.size / 1024).toFixed(2)} KB)
                </span>
                <button
                  className="download-btn"
                  onClick={() => downloadFile(file)}
                >
                  <i className="fas fa-download"></i> Download
                </button>
              </div>
            );

            return (
              <li key={idx} className="response-item">
                <div className="response-question">
                  <strong>{label}:</strong>
                </div>
                <div className="response-answer">
                  {hasFiles ? (
                    res.files.map(renderFileBlock)
                  ) : singleFile ? (
                    renderFileBlock(res.file)
                  ) : embeddedFile ? (
                    renderFileBlock(res.answer)
                  ) : res.answer ? (
                    Array.isArray(res.answer) ? (
                      res.answer.join(", ")
                    ) : (
                      res.answer
                    )
                  ) : (
                    <i>N/A</i>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const getProfessionalDocuments = () => {
    if (!fullUserData?.documents || typeof fullUserData.documents !== "object")
      return [];
    console.log(fullUserData);
    console.log(fullUserData.documents.certificateLink);

    return Object.entries(fullUserData.documents)
      .filter(([_, doc]) => doc && doc.fileId)
      .map(([key, doc]) => ({
        key,
        ...doc,
      }));
  };

  const getEffectiveFiles = (res) => {
    if (Array.isArray(res.files) && res.files.length > 0) return res.files;
    if (res.file && res.file.fileId) return [res.file];
    if (res.answer && res.answer.fileId) return [res.answer];
    return [];
  };

  const formatFileName = (name, maxLength = 20) => {
    if (!name) return "";
    return name.length <= maxLength
      ? name
      : `${name.substring(0, maxLength - 7)}...${name.slice(
          name.lastIndexOf(".") || -3
        )}`;
  };

  const viewFile = async (file) => {
    const previewableTypes = ["application/pdf", "image/", "image/svg+xml"];

    // ❌ If not previewable type
    if (!previewableTypes.some((type) => file.contentType.startsWith(type))) {
      toast.error("Preview is not supported for this file type.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/api/form/files/${file.fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open previewable file in new tab
      window.open(url, "_blank");

      // Optional cleanup
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error("Preview error:", error);
      alert("Unable to preview this file.");
    }
  };

  const sendEmail = async (type) => {
    if (!submission?.email) {
      toast.error("Email not available");
      return;
    }

    const result = await Swal.fire({
      title:
        type === "reminder"
          ? "Send Reminder Email?"
          : "Send Confirmation Email?",
      text: `This will send a ${
        type === "reminder" ? "reminder" : "confirmation"
      } email to ${submission.email}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, send it",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    const endpoint =
      type === "reminder"
        ? `${baseUrl}/api/email/test-remainder`
        : `${baseUrl}/api/email/confirmation`;

    try {
     
      const personal = fullUserData?.personalDetails || {};

      const currentCourse = fullUserData?.courses?.find(
        (c) => c.courseId === courseId
      );
      const firstPayment = currentCourse?.payments?.[0] || {};
      const firstPackage = firstPayment?.packages?.[0] || {};
      
      const emailPayload = {
        email: submission.email,
        registrationType: invoiceType,
        registeredAt: new Date(submission.createdAt).toLocaleString("ru-RU"),
        package: firstPackage.name || "",
        amount: firstPackage.amount || "",
        currency: firstPackage.currency || "",
        firstName: personal.firstName || "",
        middleName: personal.middleName || "",
        lastName: personal.lastName || "",
        gender: personal.gender || "",
        courseId,
      };
      

      // ✅ Log the payload being sent
      console.log("Sending email with payload:", emailPayload);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(emailPayload),
      });

      if (res.ok) {
        toast.success(
          `${type === "reminder" ? "Reminder" : "Confirmation"} email sent!`
        );
      } else {
        const data = await res.json();
        toast.error(data?.message || `Failed to send ${type} email.`);
      }
    } catch (err) {
      console.error(`Error sending ${type} email:`, err);
      toast.error(`Error sending ${type} email.`);
    }
  };

  const certificateLink = fullUserData?.documents?.certificateLink?.value || "";
  const referral = fullUserData?.documents?.referral?.value || "";
  

const emailStatus = fullUserData?.courses?.find(c => c.courseId === courseId)?.emails;
const reminderSent = emailStatus?.reminderSent || false;
const confirmationSent = emailStatus?.confirmationSent || false;
  return (
    <div className="userdeatils-modal-overlay" onClick={closeModal}>
      <ToastContainer
        position="top-right"
        className="custom-toast-container"
        autoClose={3000}
      />

      <div
        className="userdeatils-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>{t("userDetailsModal.header")}</h2>
          <span className="user-details-close-btn" onClick={closeModal}>
            &times;
          </span>
        </div>

        {/* User Info with Photo */}
        <div className="user-info-header">
          <div className="user-info">
            <div className="user-photo-frame">
              <img
                src={fullUserData?.personalDetails?.photo || defaultImage}
                alt="User"
                className="user-photo"
              />
            </div>
            <div className="user-details">
              <h3>
                {fullUserData?.dashboardLang === "ru"
                  ? `${fullUserData?.personalDetails?.title || ""} 
         ${fullUserData?.personalDetails?.lastName || ""} 
         ${fullUserData?.personalDetails?.firstName || ""} 
         ${fullUserData?.personalDetails?.middleName || ""}`.trim()
                  : `${fullUserData?.personalDetails?.title || ""} 
         ${fullUserData?.personalDetails?.firstName || ""} 
         ${fullUserData?.personalDetails?.middleName || ""} 
         ${fullUserData?.personalDetails?.lastName || ""}`.trim()}
              </h3>
              <p>{submission.email}</p>
            </div>
          </div>

          <div className="export-buttons">
            <div className="button-class">
              <button className="export-btn" onClick={exportToCSV}>
                {t("userDetailsModal.exportCSV")}
              </button>
              <button className="export-btn" onClick={exportToPDF}>
                {t("userDetailsModal.exportPDF")}
              </button>
            </div>
            <div className="button-class">
  <button
    className="export-btn"
    onClick={() => sendEmail("reminder")}
    disabled={reminderSent}
  >
    {reminderSent
      ? t("userDetailsModal.reminderSent") || "Reminder Sent"
      : t("userDetailsModal.sendReminder") || "Send Reminder"}
  </button>

  <button
    className="export-btn"
    onClick={() => sendEmail("confirmation")}
    disabled={confirmationSent}
  >
    {confirmationSent
      ? t("userDetailsModal.confirmationSent") || "Confirmation Sent"
      : t("userDetailsModal.sendConfirmation") || "Send Confirmation"}
  </button>
</div>
          </div>
          {/* Add this section where appropriate in your modal */}
          {selectedQrCode && selectedQrCode.qrFileId && (
            <div className="qr-code-display">
              {/* QR Code Image */}
              <div className="qr-code-image-container">
                {!imageLoaded && <Skeleton height={120} width={120} />}
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="QR Code"
                    className="qr-code-image"
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/qr-fallback.png";
                    }}
                  />
                ) : (
                  <Skeleton height={120} width={120} />
                )}
              </div>

              {/* Actions */}
              <div className="qr-code-actions">
                <button
                  className="view-btn"
                  onClick={() => viewQRCode(selectedQrCode)}
                >
                  <i className="fas fa-external-link-alt"></i> View Link
                </button>
                <button
                  className="download-btn"
                  onClick={() => downloadQRCode(selectedQrCode)}
                >
                  <i className="fas fa-download"></i> Download QR Code
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Bar */}
        <div className="nav-bar">
          {[
            "Personal",
            "Invoice",
            "Registration",
            ...otherForms.map((form) => form.formId),
          ].map((tab) => {
            const form = otherForms.find((f) => f.formId === tab);
            return (
              <div
                key={tab}
                className={`nav-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => handleTabChange(tab)}
              >
                {form ? form.formName : t(`userDetailsModal.${tab}`)}
              </div>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="userdetails-content-section">
          {isLoading ? (
            <div className="skeleton-wrapper">
              {/* Skeleton for the photo */}
              <div className="skeleton-header">
                <Skeleton circle={true} height={80} width={80} />
                <div className="skeleton-header-details">
                  <Skeleton height={20} width={`60%`} />
                  <Skeleton height={15} width={`40%`} />
                </div>
              </div>

              {/* Skeleton for navigation tabs */}
              <div className="skeleton-tabs">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    height={30}
                    width={80}
                    style={{ marginRight: 10 }}
                  />
                ))}
              </div>

              {/* Skeleton for content */}
              <div className="skeleton-content">
                <Skeleton count={8} height={20} style={{ marginBottom: 10 }} />
              </div>
            </div>
          ) : (
            <>
              {activeTab === "Personal" && (
                <div className="content-info">
                  <div className="subcontent-info">
                    <h3>{t("userDetailsModal.personalDetails")}</h3>
                    <p>
                      <strong>{t("userDetailsModal.phone")}:</strong>{" "}
                      {fullUserData?.personalDetails?.phone || "N/A"}
                    </p>
                    <p>
                      <strong>{t("userDetailsModal.country")}:</strong>{" "}
                      {fullUserData?.personalDetails?.country || "N/A"}
                    </p>
                    <p>
                      <strong>{t("userDetailsModal.gender")}:</strong>{" "}
                      {fullUserData?.personalDetails?.gender || "N/A"}
                    </p>
                    <p>
                      <strong>{t("userDetailsModal.dob")}</strong>{" "}
                      {fullUserData?.personalDetails?.dob || "N/A"}
                    </p>
                  </div>

                  <div className="subcontent-info">
                    <h3>{t("userDetailsModal.professionalDetails")}</h3>
                    <p>
                      <strong>{t("userDetailsModal.university")}:</strong>{" "}
                      {fullUserData?.professionalDetails?.university || "N/A"}
                    </p>
                    <p>
                      <strong>{t("userDetailsModal.department")}:</strong>{" "}
                      {fullUserData?.professionalDetails?.department || "N/A"}
                    </p>
                    <p>
                      <strong>{t("userDetailsModal.profession")}:</strong>{" "}
                      {fullUserData?.professionalDetails?.profession || "N/A"}
                    </p>
                    <p>
                      <strong>{t("userDetailsModal.position")}:</strong>{" "}
                      {fullUserData?.professionalDetails?.position || "N/A"}
                    </p>
                  </div>

                  <div className="subcontent-info">
                    <h3>{t("userDetailsModal.professionalDocuments")}</h3>
                    <ul className="submission-responses">
                      {getProfessionalDocuments().map((doc, idx) => {
                        const fileUrl = `${baseUrl}/api/user/file/${doc.fileId}`;
                        const fileName =
                          doc.fileName ||
                          doc.name ||
                          `${doc.key || "document"}_${idx + 1}`;
                        const uploadDate = doc.uploadDate
                          ? new Date(doc.uploadDate).toLocaleString()
                          : "N/A";

                        return (
                          <li key={idx} className="response-item">
                            <div className="response-question">
                              <strong>
                                {doc?.key || `Document ${idx + 1}`}:
                              </strong>
                            </div>
                            <div className="response-answer file-response">
                              <p>
                                <strong>Filename:</strong> {fileName}
                              </p>
                              <p>
                                <strong>Uploaded:</strong> {uploadDate}
                              </p>
                              <button
                                className="view-btn"
                                onClick={() => window.open(fileUrl, "_blank")}
                              >
                                <i className="fas fa-eye"></i>{" "}
                                {t("userDetailsModal.view")}
                              </button>
                              <button
                                className="download-btn"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = fileUrl;
                                  link.download = fileName;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                <i className="fas fa-download"></i>{" "}
                                {t("userDetailsModal.download")}
                              </button>
                            </div>
                          </li>
                        );
                      })}

                      {/* Manually add certificateLink if it exists */}
                      {certificateLink && (
                        <li className="response-item">
                          <div className="response-question">
                            <strong>Certificate Link:</strong>
                          </div>
                          <div className="response-answer file-response">
                            <a
                              href={certificateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {certificateLink}
                            </a>
                          </div>
                        </li>
                      )}

                      {/* Manually add referral if it exists */}
                      {referral && (
                        <li className="response-item">
                          <div className="response-question">
                            <strong>Referral:</strong>
                          </div>
                          <div className="response-answer file-response">
                            {referral}
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

{activeTab === "Invoice" && (
  <div className="content-info">
    <div className="subcontent-info">
      <h3>{t("userDetailsModal.invoiceInfo")}</h3>
      <p>
        <strong>{t("userDetailsModal.invoiceType")}:</strong> {invoiceType}
      </p>
      <p>
        <strong>{t("userDetailsModal.categoryType")}:</strong> {categoryType}
      </p>
      <p>
        <strong>{t("userDetailsModal.registeredAt")}:</strong>{" "}
        {new Date(submission.createdAt).toLocaleString()}
      </p>
    </div>

    <div className="subcontent-info">
      <h3>{t("userDetailsModal.paymentInfo")}</h3>
      {(() => {
        const currentCourse = fullUserData?.courses?.find(
          (c) => c.courseId === courseId
        );
        const payments = currentCourse?.payments || [];

        if (!payments.length) {
          return <p>No payment records available.</p>;
        }

        return payments.map((payment, pIndex) => (
          <div key={payment.transactionId || pIndex} className="payment-block">
            <h4>Payment {pIndex + 1}</h4>
            <p>
              <strong>{t("userDetailsModal.status")}:</strong>{" "}
              {payment.status || "N/A"}
            </p>
            <p>
              <strong>{t("userDetailsModal.invoiceNumber")}:</strong>{" "}
              {payment.invoiceNumber || "N/A"}
            </p>
            <p>
              <strong>{t("userDetailsModal.time")}:</strong>{" "}
              {payment.time
                ? new Date(payment.time).toLocaleString()
                : "N/A"}
            </p>

            {(payment.packages || []).map((pkg, i) => (
              <div key={pkg._id || i} className="package-block">
                <p>
                  <strong>{t("userDetailsModal.package")}:</strong>{" "}
                  {pkg.name || "N/A"}
                </p>
                <p>
                  <strong>{t("userDetailsModal.amount")}:</strong>{" "}
                  {pkg.amount || "N/A"} {pkg.currency || ""}
                </p>
                <p>
                  <strong>{t("userDetailsModal.quantity")}:</strong>{" "}
                  {pkg.quantity || "1"}
                </p>
              </div>
            ))}
          </div>
        ));
      })()}
    </div>
  </div>
)}


              {activeTab === "Registration" && (
                <div className="content-info">
                  <h3>{t("userDetailsModal.submissionDetails")}</h3>
                  <ul className="submission-responses">
                    {submission.responses.map((res, idx) => {
                      const label = getQuestionLabel(res.questionId);
                      const files = getEffectiveFiles(res);

                      return (
                        <li key={idx} className="response-item">
                          <div className="response-question">
                            <strong>{label}:</strong>
                          </div>
                          <div className="response-answer">
                            {files.length > 0 ? (
                              files.map((file, i) => (
                                <div className="file-response" key={i}>
                                  <span title={file.fileName}>
                                    <i className="fas fa-file-alt"></i>{" "}
                                    {formatFileName(file.fileName)} (
                                    {(file.size / 1024).toFixed(2)} KB)
                                  </span>
                                  <button
                                    className="view-btn"
                                    onClick={() => viewFile(file)}
                                  >
                                    <i className="fas fa-eye"></i> View
                                  </button>

                                  <button
                                    className="download-btn"
                                    onClick={() => downloadFile(file)}
                                  >
                                    <i className="fas fa-download"></i>{" "}
                                    {t("userDetailsModal.download")}
                                  </button>
                                </div>
                              ))
                            ) : Array.isArray(res.answer) ? (
                              res.answer.every(
                                (item) =>
                                  typeof item === "object" && item.firstName
                              ) ? (
                                res.answer.map((entry, i) => (
                                  <p key={i}>
                                    {entry.lastName} {entry.firstName}{" "}
                                    {entry.middleName ? entry.middleName : ""}
                                  </p>
                                ))
                              ) : (
                                res.answer.join(", ")
                              )
                            ) : typeof res.answer === "object" &&
                              res.answer?.firstName ? (
                              <p>
                                {res.answer.lastName} {res.answer.firstName}{" "}
                                {res.answer.middleName
                                  ? res.answer.middleName
                                  : ""}
                              </p>
                            ) : (
                              res.answer || <i>N/A</i>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Render other forms when their tab is active */}
              {otherForms.some((form) => form.formId === activeTab) &&
                renderFormSubmissions(activeTab)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
