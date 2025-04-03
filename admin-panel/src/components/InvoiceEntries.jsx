import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate  } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiFilter,  FiMail, FiMessageCircle  } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import InvoiceModal from "./InvoiceModal";
import "./InvoiceEntries.css";
import { useTranslation } from "react-i18next";
import EmailModal from "./EmailModal";
import WhatsAppChatBot from "./WhatsAppChatBot";


const InvoiceEntries = () => {
  const { courseId } = useParams();
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { t } = useTranslation();

  const [formName, setFormName] = useState("");
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [courseData, setCourseData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [validFormId, setValidFormId] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const [registrationDetails, setRegistrationDetails] = useState({}); // ✅ Store package, type, and category
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [userNames, setUserNames] = useState({}); // ✅ Store user names
  const [activeFilter, setActiveFilter] = useState("All");
  const filterRef = useRef(null);  
  const navigate = useNavigate();
  const [showEmailModal, setShowEmailModal] = useState(false);  // ✅ Toggle email modal
  const [emailDetails, setEmailDetails] = useState({
    to: "",
    subject: "",
    body: "",
    attachment: null
  });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false); // ✅ WhatsApp modal state
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState(""); // ✅ Store phone number
  


  useEffect(() => {
    if (!courseId) return;
  
    const fetchCourseData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl}/api/courses/${courseId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) throw new Error("Failed to fetch course data");
  
        const data = await response.json();
        setCourseData(data);
  
        // 🔥 Filter forms with isUsedForRegistration === true
        const registrationForms = data.forms.filter((form) => form.isUsedForRegistration);
  
        if (registrationForms.length > 0) {
          const allSubmissions = await fetchAllRegistrationSubmissions(registrationForms, token);
          setSubmissions(allSubmissions);
        }
      } catch (error) {
        console.error("❌ Error fetching course data:", error);
      }
    };
  
    fetchCourseData();
  }, [courseId]);
  

  useEffect(() => {
    if (submissions.length > 0) {
      fetchAllPaymentStatuses();
      mapRegistrationDetails(); // ✅ Map registration details for display
      fetchAllUserNames(); 
    }
  }, [submissions]);


  const findValidForm = async (forms, token) => {
    for (let form of forms) {
      try {
        const response = await fetch(`${baseUrl}/api/form/${form.formId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) continue;

        const formData = await response.json();
        if (formData.isUsedForRegistration) return formData;
      } catch (error) {
        console.error(`❌ Error fetching form ${form.formId}:`, error);
      }
    }
    return null;
  };

  const fetchAllUserNames = async () => {
    const token = localStorage.getItem("token");
    const namesMap = { ...userNames };
    const fallbackUser = { fullName: "N/A", phoneNumber: "N/A", country: "N/A" };  // ✅ Include country fallback
  
    await Promise.all(
      submissions.map(async (submission) => {
        const email = getEmailFromSubmission(submission);
  
        if (namesMap[email]) return;  // ✅ Avoid duplicate requests
  
        try {
          const response = await fetch(`${baseUrl}/api/user/${email}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
  
          if (response.ok) {
            const userData = await response.json();
            const personalDetails = userData.personalDetails || {};
  
            // 🔥 Extracting country, full name, and phone number
            const fullName = `${personalDetails.title || ""} ${personalDetails.firstName || ""} ${personalDetails.middleName || ""} ${personalDetails.lastName || ""}`.trim();
            const phoneNumber = personalDetails?.phone ? `${personalDetails.phone}` : "N/A";
            const country = personalDetails?.country || "N/A";  // ✅ Get country
  
            // ✅ Store fetched details in map
            namesMap[email] = {
              fullName: fullName || "N/A",
              phoneNumber: phoneNumber,
              country: country,   // ✅ Add country
            };
          } else {
            namesMap[email] = fallbackUser;  // Fallback in case of an error response
          }
        } catch (error) {
          console.error(`❌ Error fetching name for ${email}:`, error);
          namesMap[email] = fallbackUser;  // Fallback on error
        }
      })
    );
  
    setUserNames(namesMap);
    console.log("📲 Fetched User Names with Phone Numbers and Country:", namesMap);  // ✅ Debug log
  };
  
  

  const fetchAllPaymentStatuses = async () => {
    const token = localStorage.getItem("token");
    const statusMap = {};
  
    const fetchStatusByEmail = async (email) => {
      try {
        const response = await fetch(`${baseUrl}/api/user/${email}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
  
        if (response.ok) {
          const userData = await response.json();
          
          // Find the course matching the current courseId
          const course = userData.courses.find((c) => c.courseId === courseId);
  
          if (course && course.payments && course.payments.length > 0) {
            const latestPayment = course.payments[0];  
            statusMap[email] = latestPayment.status || "Unknown";
          } else {
            statusMap[email] = "Not Created";  // ✅ Ensure missing payments are marked as "Not Created"
          }
        } else {
          statusMap[email] = "Not Created";  // ✅ Handle non-200 responses as "Not Created"
        }
      } catch (error) {
        console.error("❌ Error fetching payment status:", error);
        statusMap[email] = "Error";
      }
    };
  
    // Fetch all payment statuses concurrently
    await Promise.all(submissions.map(async (submission) => {
      const email = getEmailFromSubmission(submission);
      await fetchStatusByEmail(email);
    }));
  
    setPaymentStatuses(statusMap);
  };
  

  const mapRegistrationDetails = () => {
    const detailsMap = {};

    submissions.forEach((submission) => {
      const {
        type,
        category,
        package: packageName,
      } = getRegistrationDetails(submission);
      const email = getEmailFromSubmission(submission);

      detailsMap[email] = {
        type,
        category,
        package: packageName,
      };
    });

    setRegistrationDetails(detailsMap); // ✅ Store registration details in state
  };

  
  const fetchAllRegistrationSubmissions = async (forms, token) => {
    let allSubmissions = [];
  
    await Promise.all(forms.map(async (form) => {
      try {
        const response = await fetch(`${baseUrl}/api/form/${form.formId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) throw new Error(`Failed to fetch form ${form.formId}`);
  
        const formData = await response.json();
        allSubmissions = [...allSubmissions, ...formData.submissions];
  
      } catch (error) {
        console.error(`❌ Error fetching submissions for form ${form.formId}:`, error);
      }
    }));
  
    return allSubmissions;
  };
  
  const fetchFormData = async (validFormId, token) => {
    try {
      const response = await fetch(`${baseUrl}/api/form/${validFormId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch form data");

      const formData = await response.json();
      setFormName(formData.formName);
      setQuestions(formData.questions || []);
      setSubmissions(formData.submissions || []);
    } catch (error) {
      console.error("❌ Error fetching form data:", error);
    }
  };

  const getQuestionIds = () => {
    if (!questions.length) return {};
    return {
      emailQuestionId:
        questions.find((q) => q.label.trim().toLowerCase() === "email")?._id ||
        null,
    };
  };

  const { emailQuestionId } = getQuestionIds();

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getEmailFromSubmission = (submission) => {
    if (submission.email && isValidEmail(submission.email)) {
      return submission.email;
    }

    const emailResponse = submission.responses.find(
      (r) => r.questionId === emailQuestionId
    )?.answer;
    return isValidEmail(emailResponse) ? emailResponse : "No email";
  };

  const getRegistrationDetails = (submission) => {
    if (!courseData?.rules?.length) {
      return {
        type: conditions[0].option,
        category: conditions[1].option,
        package: packageInfo?.name || "N/A",
        amount: packageInfo ? parseFloat(packageInfo.amount) || 0 : 0, // ✅ Amount included
        currency: packageInfo?.currency || "USD",
      };
    }

    for (let rule of courseData.rules) {
      const conditions = rule.conditions;
      if (conditions.length < 2) continue;

      const matchesFirst = submission.responses.some(
        (resp) =>
          resp.questionId === conditions[0].questionId &&
          resp.answer === conditions[0].option
      );

      const matchesSecond = submission.responses.some(
        (resp) =>
          resp.questionId === conditions[1].questionId &&
          resp.answer === conditions[1].option
      );

      if (matchesFirst && matchesSecond) {
        const packageId = rule.linkedItems[0];
        const packageInfo = courseData.items.find(
          (item) => item._id === packageId
        );

        return {
          type: conditions[0].option,
          category: conditions[1].option,
          package: packageInfo?.name || "N/A",
          amount: packageInfo ? parseFloat(packageInfo.amount) || 0 : 0,
          currency: packageInfo?.currency || "USD",
        };
      }
    }

    return {
      type: "No Match",
      category: "No Match",
      package: "N/A",
      amount: 0,
      currency: "USD",
    };
  };

  const toggleFilterModal = () => {
    setShowFilterModal((prev) => !prev);
  };

  const handleFilterSelect = (filter) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
  };

  const filteredSubmissions = submissions
  .filter((submission) =>
    getEmailFromSubmission(submission).toLowerCase().includes(searchTerm.toLowerCase())
  )
  .filter((submission) => {
    const email = getEmailFromSubmission(submission);
    let status = paymentStatuses[email] || "Unknown";

    // ✅ Normalize the "Invoice not created (Send)" to "Not Created"
    if (status.toLowerCase() === "invoice not created (send)") {
      status = "Not Created";
    }

    return activeFilter === "All" || status.toLowerCase() === activeFilter.toLowerCase();
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterModal(false);
      }
    };

    // ✅ Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // ✅ Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const handleNameClick = (email) => {
    if (email) {
      console.log("📩 Navigating with state:", email);
      
      // ✅ Store in localStorage
      localStorage.setItem("modalState", JSON.stringify({ email, open: true }));
      
      navigate(`/course-entries/${courseId}`, {
        state: { email, open: true },  // For initial navigation
      });
    } else {
      console.log("❌ No email found!");
    }
  };
  
   const handleEmailClick = (email) => {
    // ✅ Open the email modal with empty subject and body
    setEmailDetails({
      to: email,
      subject: "",   // Empty subject
      body: "",      // Empty body
      attachment: null
    });
    setShowEmailModal(true);
  };
  
  const handleWhatsAppClick = (email) => {
    const user = userNames[email];  // ✅ Use the correct object
  
    if (user && user.phoneNumber) {
      console.log("📞 Opening WhatsApp for:", user.phoneNumber);
      setWhatsappPhoneNumber(user.phoneNumber); // ✅ Set phone number
      setShowWhatsAppModal(true);              // ✅ Open WhatsApp modal
    } else {
      alert("Phone number not available for this user.");
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
                    placeholder={t('InvoiceEntries.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="course-search-input"
                  />
                </div>
        
                {/* 🛠️ Filter Icon */}
                <div className="filter-icon-wrapper" ref={filterRef}>
            <FiFilter onClick={toggleFilterModal} />
            
            {showFilterModal && (
  <div className="filter-bubble">
    <button
      className={`filter-option ${activeFilter === "All" ? "active" : ""}`}
      onClick={() => handleFilterSelect("All")}
    >
      {t('InvoiceEntries.filterAll')}
    </button>
    <div className="filter-divider"></div>

    <button
      className={`filter-option ${activeFilter === "Paid" ? "active" : ""}`}
      onClick={() => handleFilterSelect("Paid")}
    >
       {t('InvoiceEntries.filterPaid')}
    </button>
    <div className="filter-divider"></div>

    <button
      className={`filter-option ${activeFilter === "Pending" ? "active" : ""}`}
      onClick={() => handleFilterSelect("Pending")}
    >
       {t('InvoiceEntries.filterPending')}
    </button>
    <div className="filter-divider"></div>

    <button
      className={`filter-option ${activeFilter === "Not Created" ? "active" : ""}`}
      onClick={() => handleFilterSelect("Not Created")}
    >
       {t('InvoiceEntries.filterNotCreated')}
    </button>
    <div className="filter-divider"></div>

    <button
      className={`filter-option ${activeFilter === "Error" ? "active" : ""}`}
      onClick={() => handleFilterSelect("Error")}
    >
       {t('InvoiceEntries.filterError')}
    </button>
  </div>
)}

          </div>
              </div>
       
      </div>

      <div className="invoice-table-container">
        {filteredSubmissions.length > 0 ? (
          <table className="entries-table">
            <thead>
              <tr>
                <th> {t('InvoiceEntries.entry')}</th>
                <th> {t('InvoiceEntries.name')}</th>
                <th> {t('InvoiceEntries.email')}</th>
                <th> {t('InvoiceEntries.phoneNumber')}</th>
                <th> {t('InvoiceEntries.package')}</th>
                <th> {t('InvoiceEntries.amount')}</th>
                <th> {t('InvoiceEntries.paymentStatus')}</th> {/* ✅ New Action column */}
              </tr>
            </thead>

            <tbody>
  {filteredSubmissions.map((submission, index) => {
    const email = getEmailFromSubmission(submission);
    const details = registrationDetails[email] || {};
    let paymentStatus = paymentStatuses[email] || "Loading...";

    const name = userNames[email]?.fullName || "N/A";
    const phoneNumber = userNames[email]?.phoneNumber || "N/A";

    // ✅ Convert "Invoice not created (Send)" to "Not Created"
    if (paymentStatus.toLowerCase() === "invoice not created (send)") {
      paymentStatus = "Not Created";
    }

    const { type, category, package: packageName, amount, currency } = getRegistrationDetails(submission);

    // ✅ Determine the status class based on the payment status
    const getStatusClass = (status) => {
      switch (status.toLowerCase()) {
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

    return (
      <tr key={submission._id} className="clickable-row">
        <td>{index + 1}</td>

        {/* Clickable Name with Button */}
        <td>
          <button
            onClick={() => {
              console.log("🔎 Clicked Email:", email);  // ✅ Debug log
              handleNameClick(email);
            }}
            className="name-link"
          >
            {name}
          </button>
        </td>

        {/* Email and Phone Number */}
        <td>
          <div>{email}</div>
          <div className="phone-number">{phoneNumber}</div>
        </td>

        <td>{packageName || "N/A"}</td>
        <td>{`${amount} ${currency}` || "N/A"}</td>

        <td>
          <div className={`status-indicator ${getStatusClass(paymentStatus)}`}>
            {paymentStatus}
          </div>
        </td>

        <td className="invoice-actions">
          <div className="actions-container">
            {/* Send Invoice Button */}
            <button
              onClick={() => {
                setSelectedSubmission({
                  ...submission,
                  type,
                  category,
                  package: packageName,
                  amount,
                  currency: currency || "USD",
                });
              }}
              className="send-invoice-btn"
            >
              {t('InvoiceEntries.sendInvoice')}
            </button>

            {/* Icon Container */}
            <div className="icon-container">
              <div
                className="icon-circle email-bg"
                title="Send Email"
                onClick={() => handleEmailClick(email)}
              >
                <FiMail className="chat-icon" />
              </div>

              <div
                className="icon-circle whatsapp-bg"
                title="Send WhatsApp"
                onClick={() => handleWhatsAppClick(email)}
              >
                <FaWhatsapp className="chat-icon" />
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  })}
</tbody>




          </table>
        ) : (
          <p>{t('InvoiceEntries.noSubmissions')}</p>
        )}
      </div>
      {selectedSubmission && (
        <InvoiceModal
          submission={selectedSubmission}
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          type={selectedSubmission.type} // ✅ Passing type
          category={selectedSubmission.category} // ✅ Passing category
          formId={validFormId} // ✅ Passing formId
          courseId={courseId} // ✅ Passing courseId
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

export default InvoiceEntries;
