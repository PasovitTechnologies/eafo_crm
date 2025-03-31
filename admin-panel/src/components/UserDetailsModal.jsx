import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./UserDetailsModal.css";
import { jsPDF } from "jspdf"; // 📄 PDF Library
import "jspdf-autotable";      // 📄 Auto-table for PDF
import Papa from "papaparse";   // 📊 CSV Library
import { useTranslation } from "react-i18next";  

const UserDetailsModal = ({ submission, userData, closeModal }) => {
  const { courseId } = useParams();
  const defaultImage = "https://static.wixstatic.com/media/df6cc5_dc3fb9dd45a9412fb831f0b222387da1~mv2.jpg";

  const [activeTab, setActiveTab] = useState("Personal");
  const [invoiceType, setInvoiceType] = useState("N/A");
  const [categoryType, setCategoryType] = useState("N/A");
  const [fullUserData, setFullUserData] = useState(null);
  const [formQuestions, setFormQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const {t, i18n} =useTranslation();
  const [otherForms, setOtherForms] = useState([]);
  const [otherFormsSubmissions, setOtherFormsSubmissions] = useState({});  const token = localStorage.getItem("token");
  const baseUrl = import.meta.env.VITE_BASE_URL;


  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userData?.email || !courseId) return;
  
        // Fetch full user data
        const userResponse = await fetch(`${baseUrl}/api/user/${userData.email}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
  
        if (!userResponse.ok) throw new Error("Failed to fetch full user data");
        const fullUser = await userResponse.json();
        setFullUserData(fullUser);
  
        // Extract invoice fields
        const invoiceFields = submission.responses.filter((res) => res.isUsedForInvoice === true);
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
        const registrationForms = course.registeredForms.filter((form) => form.isUsedForRegistration);
        const otherFormsList = course.registeredForms.filter((form) => !form.isUsedForRegistration);
        setOtherForms(otherFormsList);
  
        // Fetch registration form questions
        const registrationFormIds = registrationForms.map((form) => form.formId);
        const allQuestions = [];
  
        for (const formId of registrationFormIds) {
          const formResponse = await fetch(`${baseUrl}/api/form/${formId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
  
          if (formResponse.ok) {
            const formData = await formResponse.json();
            allQuestions.push(...(formData.questions || []));
          }
        }
  
        setFormQuestions(allQuestions);
  
        // Process other forms - no additional API calls needed
        const formsSubmissions = {};
        for (const form of otherFormsList) {
          try {
            // Fetch form data (which includes submissions)
            const formResponse = await fetch(`${baseUrl}/api/form/${form.formId}`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
  
            if (!formResponse.ok) continue;
            const formData = await formResponse.json();
  
            // Find the user's submission in the form's submissions array
            if (formData.submissions && Array.isArray(formData.submissions)) {
              const userSubmission = formData.submissions.find(
                sub => sub.email.toLowerCase() === userData.email.toLowerCase()
              );
  
              if (userSubmission) {
                formsSubmissions[form.formId] = {
                  questions: formData.questions || [],
                  submission: userSubmission,
                  formName: form.formName
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 🔥 Function to sanitize labels by removing HTML tags
  const sanitizeLabel = (label) => {
    const div = document.createElement("div");
    div.innerHTML = label;
    return div.textContent || div.innerText || "Unknown Question";
  };

  // 🔥 Match submission responses with form questions
  const getQuestionLabel = (questionId, formId = null) => {
    let questions = formQuestions;
    
    if (formId && otherFormsSubmissions[formId]) {
      questions = otherFormsSubmissions[formId].questions;
    }
    
    const question = questions.find((q) => q._id === questionId);
    return question ? sanitizeLabel(question.label) : "Unknown Question";
  };

  const exportToCSV = () => {
    const csvData = [];
  
    // ➡️ Add Section Headers with empty row for styling effect
    csvData.push(["Section", "Label", "Value"]);
  
    // 🟢 Personal Details
    csvData.push(["Personal", "", ""]);  // Section header
    csvData.push(["", "First Name", fullUserData?.personalDetails?.firstName || "N/A"]);
    csvData.push(["", "Last Name", fullUserData?.personalDetails?.lastName || "N/A"]);
    csvData.push(["", "Email", submission.email]);
    csvData.push(["", "Phone", fullUserData?.personalDetails?.phone || "N/A"]);
    csvData.push(["", "Country", fullUserData?.personalDetails?.country || "N/A"]);
  
    // 🟡 Invoice Info
    csvData.push(["Invoice", "", ""]);  // Section header
    csvData.push(["", "Invoice Type", invoiceType]);
    csvData.push(["", "Category Type", categoryType]);
  
    // 🔥 Registration Responses
    csvData.push(["Registration", "", ""]);  // Section header
    submission.responses.forEach((res) => {
      const label = getQuestionLabel(res.questionId);
      csvData.push(["", label, JSON.stringify(res.answer)]);
    });
  
    // 🚀 Convert to CSV format
    const csv = Papa.unparse(csvData);
  
    // 🟠 Create CSV Blob and Trigger Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `user_data_${userData.email}.csv`);
    link.click();
  
    URL.revokeObjectURL(url);
  };

  // 📄 Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const margin = 10;
    let startY = 25;
  
    // 🛠️ Utility function for text wrapping
    const splitText = (text, maxWidth) => {
      return doc.splitTextToSize(text, maxWidth);
    };
  
    // 🔥 PDF Header
    doc.setFontSize(18);
    doc.text("User & Submission Details", margin, startY);
    startY += 10;
  
    // 🟢 Personal Details
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Personal Details", margin, startY);
    startY += 5;
  
    doc.autoTable({
      startY: startY,
      head: [["Label", "Value"]],
      body: [
        ["First Name", fullUserData?.personalDetails?.firstName || "N/A"],
        ["Last Name", fullUserData?.personalDetails?.lastName || "N/A"],
        ["Email", submission.email],
        ["Phone", fullUserData?.personalDetails?.phone || "N/A"],
        ["Country", fullUserData?.personalDetails?.country || "N/A"],
      ],
      margin: { top: 10, left: margin, right: margin },
      styles: { cellPadding: 4, fontSize: 10, overflow: "linebreak" },
    });
  
    startY = doc.lastAutoTable.finalY + 10;
  
    // 🟡 Invoice Information
    doc.setFontSize(14);
    doc.text("Invoice Information", margin, startY);
    startY += 5;
  
    doc.autoTable({
      startY: startY,
      head: [["Label", "Value"]],
      body: [
        ["Invoice Type", splitText(invoiceType, 160)],  // Wrap long text
        ["Category Type", splitText(categoryType, 160)],  // Wrap long text
      ],
      margin: { top: 10, left: margin, right: margin },
      styles: { cellPadding: 4, fontSize: 10, overflow: "linebreak" },
    });
  
    startY = doc.lastAutoTable.finalY + 10;
  
    // 🔥 Registration Responses
    doc.setFontSize(14);
    doc.text("Registration Responses", margin, startY);
    startY += 5;
  
    const registrationData = submission.responses.map((res) => [
      splitText(getQuestionLabel(res.questionId), 80),  // Wrap label
      splitText(JSON.stringify(res.answer), 160),       // Wrap answer
    ]);
  
    doc.autoTable({
      startY: startY,
      head: [["Label", "Answer"]],
      body: registrationData,
      margin: { top: 10, left: margin, right: margin },
      styles: { cellPadding: 4, fontSize: 10, overflow: "linebreak" },
    });
  
    // Add other forms data to PDF
    Object.entries(otherFormsData).forEach(([formId, formData]) => {
      startY = doc.lastAutoTable.finalY + 10;
      
      doc.setFontSize(14);
      doc.text(formData.formName, margin, startY);
      startY += 5;
      
      const formSubmissionData = formData.submission.responses.map((res) => [
        splitText(getQuestionLabel(res.questionId, formId), 80),
        splitText(JSON.stringify(res.answer), 160)
      ]);
      
      doc.autoTable({
        startY: startY,
        head: [["Label", "Answer"]],
        body: formSubmissionData,
        margin: { top: 10, left: margin, right: margin },
        styles: { cellPadding: 4, fontSize: 10, overflow: "linebreak" },
      });
    });
  
    // 💾 Save PDF
    doc.save(`user_data_${userData.email}.pdf`);
  };

  // Render form submissions
  const renderFormSubmissions = (formId) => {
    const formData = otherFormsSubmissions[formId];
    if (!formData) return <div>No submission data found for this form.</div>;
    
    return (
      <div className="content-info">
        <h3>{formData.formName}</h3>
        <ul>
          {formData.submission.responses.map((res, idx) => {
            const label = getQuestionLabel(res.questionId, formId);
            return (
              <li key={idx}>
                <strong>{label}:</strong> {JSON.stringify(res.answer)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="userdeatils-modal-overlay" onClick={closeModal}>
      <div className="userdeatils-modal-content" onClick={(e) => e.stopPropagation()}>

        {/* 🟠 Header */}
        <div className="modal-header">
          <h2>{t("userDetailsModal.header")}</h2>
          <span className="user-details-close-btn" onClick={closeModal}>&times;</span>
        </div>

        {/* 🟡 User Info with Photo */}
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
                {`${fullUserData?.personalDetails?.firstName || "N/A"} 
                ${fullUserData?.personalDetails?.lastName || ""}`}
              </h3>
              <p>{submission.email}</p>
            </div>
          </div>

          <div className="export-buttons">
            <button className="export-btn" onClick={exportToCSV}>
              {t('userDetailsModal.exportCSV')}
            </button>
            <button className="export-btn" onClick={exportToPDF}>
              {t('userDetailsModal.exportPDF')}
            </button>
          </div>
        </div>

        {/* 🚀 Navigation Bar */}
        <div className="nav-bar">
          {["Personal", "Invoice", "Registration", ...otherForms.map(form => form.formId)].map((tab) => {
            // For other forms, use formId as tab identifier and display formName
            const form = otherForms.find(f => f.formId === tab);
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

        {/* 🔥 Scrollable Content */}
        <div className="userdetails-content-section">
          {isLoading ? (
            <div>{t("userDetailsModal.loading")}</div>
          ) : (
            <>
              {activeTab === "Personal" && (
                <div className="content-info">
                  <div className="subcontent-info">
                    <h3>{t("userDetailsModal.personalDetails")}</h3>
                    <p><strong>{t("userDetailsModal.phone")}:</strong> {fullUserData?.personalDetails?.phone || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.country")}:</strong> {fullUserData?.personalDetails?.country || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.gender")}:</strong> {fullUserData?.personalDetails?.gender || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.dob")}</strong> {fullUserData?.personalDetails?.dob || "N/A"}</p>
                  </div>

                  <div className="subcontent-info">
                    <h3>{t("userDetailsModal.professionalDetails")}</h3>
                    <p><strong>{t("userDetailsModal.university")}:</strong> {fullUserData?.professionalDetails?.university || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.department")}:</strong> {fullUserData?.professionalDetails?.department || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.profession")}:</strong> {fullUserData?.professionalDetails?.profession || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.position")}:</strong> {fullUserData?.professionalDetails?.position || "N/A"}</p>
                  </div>
                </div>
              )}

              {activeTab === "Invoice" && (
                <div className="content-info">
                  <div className="subcontent-info">
                    <h3>{t("userDetailsModal.invoiceInfo")}</h3>
                    <p><strong>{t("userDetailsModal.invoiceType")}:</strong> {invoiceType}</p>
                    <p><strong>{t("userDetailsModal.categoryType")}:</strong> {categoryType}</p>
                    <p><strong>{t("userDetailsModal.registeredAt")}:</strong> {new Date(submission.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="subcontent-info">
                    <h3>{t("userDetailsModal.paymentInfo")}</h3>
                    <p><strong>{t("userDetailsModal.package")}:</strong> {fullUserData?.courses[0]?.payments[0]?.package || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.amount")}:</strong> {fullUserData?.courses[0]?.payments[0]?.amount || "N/A"} {fullUserData?.courses[0]?.payments[0]?.currency || "N/A"}</p>
                    <p><strong>{t("userDetailsModal.status")}:</strong> {fullUserData?.courses[0]?.payments[0]?.status || "N/A"}</p>
                  </div>
                </div>
              )}

              {activeTab === "Registration" && (
                <div className="content-info">
                  <h3>{t("userDetailsModal.submissionDetails")}</h3>
                  <ul>
                    {submission.responses.map((res, idx) => {
                      const label = getQuestionLabel(res.questionId);

                      return (
                        <li key={idx}>
                          <strong>{label}:</strong> {JSON.stringify(res.answer)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Render other forms when their tab is active */}
              {otherForms.some(form => form.formId === activeTab) && (
                renderFormSubmissions(activeTab)
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;