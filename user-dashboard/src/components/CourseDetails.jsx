import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import "./CourseDetails.css";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import { ArrowLeft} from 'lucide-react';
import { toast } from "react-toastify";

const baseUrl = import.meta.env.VITE_BASE_URL;

const CourseDetails = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const [course, setCourse] = useState(null);
  const [userForms, setUserForms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredForms, setFilteredForms] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredLanguage, setRegisteredLanguage] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showSubmissionPopup, setShowSubmissionPopup] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const email = localStorage.getItem("email");

  const currentLanguage = i18n.language;
  console.log(currentLanguage);

  const previousLanguage = useRef(i18n.language); // Store previous language

  // ✅ Only triggers when language changes

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/"); // Redirect to / if token is missing
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const token = localStorage.getItem("token");
        const currentLanguage = localStorage.getItem("language") || "en";
        const registeredLang = localStorage.getItem("registeredLanguage");

        if (!token || !email) {
          throw new Error("Unauthorized. Please log in.");
        }

        // Fetch course details
        const courseResponse = await fetch(`${baseUrl}/api/courses/${slug}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (courseResponse.status === 401) {
          navigate("/login");
          return;
        }

        if (!courseResponse.ok) {
          throw new Error("Failed to fetch course details.");
        }

        const courseData = await courseResponse.json();

        // Fetch user details
        const userResponse = await fetch(`${baseUrl}/api/user/${email}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user data.");
        }

        const userData = await userResponse.json();

        // Check if the user is registered
        const userCourse = userData.courses.find(
          (c) => c.courseId === courseData._id
        );

        const userForms = userCourse ? userCourse.registeredForms : [];
        const userPayments = userCourse ? userCourse.payments : [];

        setUserForms(userForms);
        setPayments(userPayments);

        // Find the registration form
        const registrationForm = userForms.find(
          (form) => form.isUsedForRegistration
        );

        const isUserRegistered = !!registrationForm;
        const regLanguage = registrationForm
          ? registrationForm.isUsedForRussian
            ? "ru"
            : "en"
          : null;

        setIsRegistered(isUserRegistered);
        setRegisteredLanguage(regLanguage);

        const forms = courseData.forms || [];

        // Filter forms based on registration status
        const filteredForms = forms.filter((form) => {
          // For registered users, use registration language for ALL forms
          if (isUserRegistered) {
            return regLanguage === "ru"
              ? form.isUsedForRussian
              : !form.isUsedForRussian;
          }
          // For unregistered users, use current language
          return currentLanguage === "ru"
            ? form.isUsedForRussian
            : !form.isUsedForRussian;
        });

        setCourse(courseData);
        setFilteredForms(filteredForms);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCourse();
    }
  }, [slug, navigate, email]);

  useEffect(() => {
    if (previousLanguage.current !== i18n.language) {
      previousLanguage.current = i18n.language; // Update stored language
      window.location.reload(); // 🔄 Refresh only once when language actually changes
    }
  }, [i18n.language]);

  // ✅ Navigate to form page with formId in state
  const handleFormNavigation = (form) => {
    if (form) {
      // Store the registration language when navigating to the form
      if (form.isUsedForRegistration) {
        const registeredLang = form.isUsedForRussian ? "ru" : "en";
        localStorage.setItem("registeredLanguage", registeredLang);
      }
  
      navigate(`/dashboard/courses/${slug}/forms/${form.formName}`, {
        state: { 
          formId: form.formId,
          courseSlug: slug,   // pass course.slug here
        },
      });
    }
  };
  

  const fetchSubmissionDetails = async (formId) => {
    try {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email");

      if (!token || !email || !formId) {
        throw new Error("Missing required parameters");
      }

      // Fetch form with questions
      const formResponse = await fetch(`${baseUrl}/api/form/${formId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!formResponse.ok) {
        throw new Error("Failed to fetch form questions");
      }

      const formData = await formResponse.json();
      const formQuestions = formData.questions || [];

      // Fetch submission for this user/form
      const submissionResponse = await fetch(
        `${baseUrl}/api/form/${formId}/submission`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!submissionResponse.ok) {
        throw new Error("Failed to fetch submission data");
      }

      const submissionData = await submissionResponse.json();

      // Ensure we have a submission date
      if (!submissionData.createdAt) {
        console.warn("No submission date found in response");
        submissionData.createdAt = new Date().toISOString(); // fallback
      }

      // Map question labels and handle both single and multiple files
      const mappedResponses = submissionData.responses.map((response) => {
        const matchingQuestion = formQuestions.find(
          (q) => q._id === response.questionId
        );

        return {
          questionId: response.questionId,
          label: matchingQuestion ? matchingQuestion.label : "Unknown Question",
          answer: response.answer || null,

          // Single legacy file support
          file: response.file
            ? {
                fileId: response.file.fileId,
                fileName: response.file.fileName,
                size: response.file.size,
                contentType: response.file.contentType,
                uploadDate: response.file.uploadDate || null,
              }
            : null,

          // New multiple file support
          files: Array.isArray(response.files)
            ? response.files.map((file) => ({
                fileId: file.fileId,
                fileName: file.fileName,
                size: file.size,
                contentType: file.contentType,
                uploadDate: file.uploadDate,
              }))
            : [],
        };
      });

      setSubmissionDetails({
        ...submissionData,
        responses: mappedResponses,
        submittedAt: submissionData.createdAt,
      });

      setShowSubmissionPopup(true);
    } catch (error) {
      console.error("Fetch submission error:", error);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const downloadFile = async (file) => {
    try {
      if (!file.fileId) {
        console.error("No file ID available for download");
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

      // Get filename from Content-Disposition header or use the stored filename
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = file.name;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Handle the file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const viewFile = async (file) => {
    const previewableTypes = ["application/pdf", "image/", "image/svg+xml"];

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
      toast.error("Unable to preview this file.");
    }
  };

  // ✅ Open payment popup
  const openPaymentPopup = () => {
    setShowPaymentPopup(true);
  };

  // ✅ Close payment popup
  const closePaymentPopup = () => {
    setShowPaymentPopup(false);
  };

  // ✅ Open payment link in new tab
  const handlePayNow = (link) => {
    window.open(link, "_blank");
  };

  const handleGoBack = () => {
    navigate("/dashboard", { replace: true });
  };

  console.log(submissionDetails);

  if (loading) {
    return (
      <div className="course-details-page loading-skeleton-page">
        <div className="skeleton-title shimmer" />
        <div className="skeleton-banner shimmer" />
        <div className="skeleton-title shimmer" />
        <div className="skeleton-description shimmer" />
        <div className="skeleton-dates">
          <div className="skeleton-date shimmer" />
          <div className="skeleton-date shimmer" />
        </div>
        <div className="skeleton-form-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="skeleton-form-card shimmer" key={index}>
              <div className="skeleton-form-name shimmer" />
              <div className="skeleton-form-btn shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="course-details-page-div"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="course-details-page">

        <div className="breadcrumb">
          <button
                      type="button"
                      className="back-button"
                      aria-label={t("forgetPasswordPage.backToLogin")}
                      onClick={handleGoBack}
                    >
                      <ArrowLeft className="back-icon" />
                    </button>
          <span onClick={() => navigate("/dashboard")}>
            {t("course_details.breadcrumb_dashboard")}
          </span>{" "}
          /
          <span onClick={() => navigate("/dashboard/courses")}>
            {" "}
            {t("course_details.breadcrumb_courses")}{" "}
          </span>{" "}
          /
          <span className="active">
            {currentLanguage === "ru" ? course?.nameRussian : course?.name}
          </span>
        </div>

        {error && <p className="error">{error}</p>}

        {course && (
          <div className="course-details-container">
            <motion.div
              className="course-banner-container"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
            >
              <a
                href={course?.websiteLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!course?.websiteLink) {
                    e.preventDefault(); // Prevent navigation if no link exists
                  }
                }}
              >
                <img
                  src={
                    currentLanguage === "ru"
                      ? course?.bannerUrlRussian || course?.bannerUrl
                      : course?.bannerUrl
                  }
                  className="course-banner-img"
                  style={{
                    cursor: course?.websiteLink ? "pointer" : "default",
                  }}
                  alt={
                    currentLanguage === "ru"
                      ? course?.nameRussian
                      : course?.name
                  }
                />
              </a>
            </motion.div>

            <h2 className="course-title">
              {currentLanguage === "ru" ? course.nameRussian : course.name}
            </h2>

            {/* Add this new section for description and dates */}
            <div className="course-meta-section">
              <div className="course-description">
                {currentLanguage === "ru"
                  ? course.descriptionRussian || course.description
                  : course.description}
              </div>

              <div className="course-dates">
                <div className="date-item">
                  <span className="date-label">
                    {t("course_details.start_date")}:
                  </span>
                  <span className="date-value">
                    {course.date
                      ? new Date(course.date).toLocaleDateString("en-GB")
                      : "N/A"}
                  </span>
                </div>
                <div className="date-item">
                  <span className="date-label">
                    {t("course_details.end_date")}:
                  </span>
                  <span className="date-value">
                    {course.endDate
                      ? new Date(course.endDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {course.websiteLink && (
              <div className="website-link-container">
                <a
                  href={course.websiteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="website-link-button"
                >
                  <i className="fas fa-external-link-alt"></i>
                  {t("course_details.visit_website")}
                </a>
              </div>
            )}

            {/* ✅ Display Available Forms */}
            <div className="available-forms">
              <h3>{t("course_details.available_forms")}</h3>

              {(() => {
                // ✅ Separate registration form from sub-forms
                const registrationForms = filteredForms.filter(
                  (form) => form.isUsedForRegistration
                );
                const subForms = filteredForms.filter(
                  (form) => !form.isUsedForRegistration
                );

                // ✅ Sort forms: registration form first, then sub-forms
                const sortedForms = [...registrationForms, ...subForms];

                return (
                  <ul>
                    {sortedForms.map((form) => {
                      const isAlreadyRegistered = userForms.some(
                        (f) => f.formId === form.formId
                      );

                      return (
                        <li key={form.formId} className="form-list-item">
                          <div className="form-list-content-wrapper">
                            {/* Form name on the left */}
                            <div className="form-info">
                              <strong className="form-name">{form.formName}</strong>
                            </div>

                            {/* Action buttons on the right */}
                            <div className="form-actions-buttons">
                              {isRegistered && form.isUsedForRegistration ? (
                                <div className="registered-form-container">
                                  {/* Registered status button spanning full width */}
                                  <div className="registered-status-fullwidth">
                                    <i className="fas fa-check-circle"></i>
                                    <span>
                                      {t("course_details.registered")}
                                    </span>
                                  </div>

                                  {/* Action buttons below - each taking half width */}
                                  <div className="registered-actions-row">
                                    <button
                                      className="user-view-details"
                                      onClick={() =>
                                        fetchSubmissionDetails(form.formId)
                                      }
                                    >
                                      <span>
                                        {t("course_details.view_details")}
                                      </span>
                                    </button>
                                    <button
                                      className="payment-amount-btn"
                                      onClick={openPaymentPopup}
                                    >
                                      <i className="fas fa-credit-card"></i>
                                      <span>
                                        {t("course_details.pay_amount")}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              ) : isAlreadyRegistered ? (
                                <div className="submitted-state">
                                  <span className="status-badge submitted">
                                    <i className="fas fa-check"></i>
                                    {t("course_details.submitted")}
                                  </span>
                                  <button
                                    className="btn view-details"
                                    onClick={() =>
                                      fetchSubmissionDetails(form.formId)
                                    }
                                  >
                                    <i className="fas fa-eye"></i>
                                    <span className="btn-text">
                                      {t("course_details.view_details")}
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={`btn ${
                                    form.isUsedForRegistration
                                      ? "register"
                                      : "submit"
                                  }`}
                                  onClick={() => handleFormNavigation(form)}
                                >
                                  <i
                                    className={`fas ${
                                      form.isUsedForRegistration
                                        ? "fa-user-plus"
                                        : "fa-paper-plane"
                                    }`}
                                  ></i>
                                  <span className="btn-text">
                                    {form.isUsedForRegistration
                                      ? t("course_details.register")
                                      : t("course_details.submit")}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>

            {showPaymentPopup && (
              <div className="payment-overlay" onClick={closePaymentPopup}>
                <div
                  className="payment-popup"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Icon */}
                  <button
                    className="close-icon-btn"
                    onClick={closePaymentPopup}
                    aria-label="Close"
                  >
                    <FaTimes className="close-icon" />
                  </button>

                  <h2 className="popup-title">
                    {t("course_details.payment_details")}
                  </h2>

                  <div className="payment-list">
                    {payments.length > 0 ? (
                      payments.map((payment) => {
                        // Crosscheck real status from Course
                        const coursePayment = course?.payments?.find(
                          (cp) => cp.invoiceNumber === payment.invoiceNumber
                        );
                        const realStatus = coursePayment
                          ? coursePayment.status
                          : payment.status;

                        // Disable button if Paid, Expired, or Not created
                        const disablePayButton = [
                          "Paid",
                          "Expired",
                          "Not created",
                        ].includes(realStatus);

                        return (
                          <div className="payment-card" key={payment.paymentId}>
                            <div>
                              <div className="payment-header">
                                <h3>{payment.package}</h3>
                              </div>

                              <div className="payment-info">
                                <p>
                                  {t("course_details.amount")}:{" "}
                                  <span className="payment-amount">
                                    {payment.payableAmount} {payment.currency}
                                  </span>
                                </p>
                                <p>
                                  {t("course_details.status")}:{" "}
                                  <span
                                    className={`payment-status ${realStatus
                                      .toLowerCase()
                                      .replace(/\s/g, "-")}`}
                                  >
                                    {realStatus}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="popup-buttons">
                              {!disablePayButton ? (
                                <button
                                  className="payment-button"
                                  onClick={() =>
                                    handlePayNow(payment.paymentLink)
                                  }
                                >
                                  {t("course_details.pay_now")}
                                </button>
                              ) : (
                                <span
                                  className={`payment-status ${realStatus
                                    .toLowerCase()
                                    .replace(/\s/g, "-")} payment-button`}
                                >
                                  {realStatus === "Paid"
                                    ? t("course_details.paid")
                                    : realStatus === "Expired"
                                    ? t("course_details.payment_expired")
                                    : t("course_details.not_created")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-payments-message">
                        <i className="fas fa-info-circle"></i>
                        <p>{t("course_details.no_payments_available")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showSubmissionPopup && submissionDetails && (
              <div
                className="submission-overlay"
                onClick={() => setShowSubmissionPopup(false)}
              >
                <div
                  className="submission-popup"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3>{t("submissionPopup.title")}</h3>

                  <div className="submission-content">
                    <div className="submission-meta">
                      <p>
                        <strong>{t("submissionPopup.submittedOn")}</strong>{" "}
                        {new Date(
                          submissionDetails.submittedAt ||
                            submissionDetails.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="submission-responses">
                      <h4 style={{ marginBottom: "10px" }}>
                        {t("submissionPopup.responses")}
                      </h4>

                      {submissionDetails.responses?.length > 0 ? (
                        <ul className="responses-list">
                          {submissionDetails.responses.map(
                            (response, index) => (
                              <li key={index} className="response-item">
                                <div className="response-question">
                                  <strong
                                    dangerouslySetInnerHTML={{
                                      __html: response.label,
                                    }}
                                  />
                                </div>

                                {/* ✅ Only show the answer if there are no files */}
                                {response.answer && (
                                  <div className="response-answer">
                                    {typeof response.answer === "string" ||
                                    typeof response.answer === "number" ? (
                                      response.answer
                                    ) : Array.isArray(response.answer) ? (
                                      response.answer.every(
                                        (item) =>
                                          typeof item === "object" &&
                                          item.firstName
                                      ) ? (
                                        <ul>
                                          {response.answer.map((entry, i) => (
                                            <li key={i}>
                                              {entry.firstName}{" "}
                                              {entry.middleName
                                                ? `${entry.middleName} `
                                                : ""}
                                              {entry.lastName}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        response.answer.join(", ")
                                      )
                                    ) : response.answer &&
                                      typeof response.answer === "object" ? (
                                      response.answer.name ? (
                                        <span>
                                          <strong>Uploaded File:</strong>{" "}
                                          {response.answer.name}
                                        </span>
                                      ) : response.answer.firstName ? (
                                        <p>
                                          {response.answer.firstName}{" "}
                                          {response.answer.middleName
                                            ? `${response.answer.middleName} `
                                            : ""}
                                          {response.answer.lastName}
                                        </p>
                                      ) : (
                                        <pre>
                                          {JSON.stringify(
                                            response.answer,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      )
                                    ) : (
                                      <i>{t("submissionPopup.noAnswer")}</i>
                                    )}
                                  </div>
                                )}

                                {/* ✅ Render multiple uploaded files */}
                                {Array.isArray(response.files) &&
                                  response.files.length > 0 &&
                                  response.files.map((file, fileIndex) => (
                                    <div
                                      className="file-container"
                                      key={fileIndex}
                                    >
                                      <div className="file-info">
                                        <p>
                                          <strong>File:</strong> {file.fileName}
                                        </p>
                                        <p>
                                          <strong>Size:</strong>{" "}
                                          {(file.size / 1024).toFixed(2)} KB
                                        </p>
                                        <p>
                                          <strong>Uploaded on:</strong>{" "}
                                          {new Date(
                                            file.uploadDate
                                          ).toLocaleString()}
                                        </p>
                                      </div>

                                      <button
                                        className="download-btn"
                                        onClick={() => downloadFile(file)}
                                      >
                                        <i className="fas fa-download"></i>{" "}
                                        Download
                                      </button>
                                      <button
                                        className="view-btn download-btn"
                                        onClick={() => viewFile(file)}
                                      >
                                        <i className="fas fa-download"></i> view
                                      </button>
                                    </div>
                                  ))}

                                {/* ✅ Fallback for single legacy-style file */}
                                {!response.files?.length && response.file && (
                                  <div className="file-container">
                                    <div className="file-info">
                                      <p>
                                        <strong>
                                          {t("submissionPopup.name")}
                                        </strong>{" "}
                                        {response.file.fileName}
                                      </p>
                                      <p>
                                        <strong>
                                          {t("submissionPopup.size")}
                                        </strong>{" "}
                                        {(response.file.size / 1024).toFixed(2)}{" "}
                                        KB
                                      </p>
                                      <p>
                                        <strong>
                                          {t("submissionPopup.type")}
                                        </strong>{" "}
                                        {response.file.contentType}
                                      </p>
                                    </div>
                                    <button
                                      className="download-btn"
                                      onClick={() =>
                                        downloadFile(response.file)
                                      }
                                    >
                                      <i className="fas fa-download"></i>{" "}
                                      {t("submissionPopup.download")}
                                    </button>
                                  </div>
                                )}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p>{t("submissionPopup.noResponses")}</p>
                      )}
                    </div>
                  </div>

                  <button
                    className="close-icon-btn"
                    onClick={() => setShowSubmissionPopup(false)}
                  >
                    <FaTimes className="close-icon" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CourseDetails;
