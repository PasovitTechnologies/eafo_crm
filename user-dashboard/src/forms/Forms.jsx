import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Multiselect } from "multiselect-react-dropdown";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import "./Forms.css";
import { useTranslation } from "react-i18next"; // 🌍 Import translation hook
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const Forms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formId } = location.state || {}; // Retrieve formId from state
  const [questions, setQuestions] = useState([]);
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [formDetails, setFormDetails] = useState({
    title: "",
    description: "",
    hasLogo: false,
    isUsedForRussian: false,
  });

  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { t } = useTranslation();

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/"); // Redirect to / if token is missing
    }
  }, [navigate]);

  useEffect(() => {
    if (!formId) {
      setError("No form ID provided");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      setError("Unauthorized: Please log in.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [questionsRes, formRes] = await Promise.all([
          fetch(`${baseUrl}/api/form/${formId}/questions`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${baseUrl}/api/form/${formId}/info`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!questionsRes.ok || !formRes.ok) {
          throw new Error("Failed to load form data.");
        }

        const questionsData = await questionsRes.json();
        const formData = await formRes.json();

        setQuestions(questionsData);
        setVisibleQuestions(questionsData.filter((q) => !q.isConditional));
        setAnswers({});
        setFormDetails({
          title: formData.title || "Untitled Form",
          description: formData.description || "",
          hasLogo: !!formData.formLogo,
          isUsedForRussian: formData.isUsedForRussian,
        });
      } catch (err) {
        console.error("Error fetching form data:", err);
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId]);

  useEffect(() => {
    if (!formId) {
      setError("No form ID provided");
      setLoading(false);
      return;
    }

    const fetchFormDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl}/api/form/${formId}/info`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch form: ${response.statusText}`);
        }

        const data = await response.json();
        setFormDetails({
          title: data.title || "Untitled Form",
          description: data.description || "",
          hasLogo: !!data.formLogo, // Just check if logo exists
          isUsedForRussian: data.isUsedForRussian,
        });
      } catch (err) {
        setError(err.message);
        console.error("Error fetching form details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFormDetails();
  }, [formId]);

  const handleAnswerChange = (questionId, answer) => {
    const updatedAnswers = { ...answers, [questionId]: answer };
    setAnswers(updatedAnswers);

    const updatedVisibleQuestions = questions.filter((q) => {
      if (!q.isConditional) return true;

      const applicableRules = questions.flatMap(
        (mainQ) =>
          mainQ.rules?.filter((rule) =>
            rule.targetQuestionIds?.includes(q._id)
          ) ?? []
      );

      return applicableRules.some((rule) =>
        rule.conditions.every((condition) => {
          const triggerAnswer = updatedAnswers[condition.triggerQuestionId];
          return condition.logic === "AND"
            ? triggerAnswer === condition.condition
            : triggerAnswer !== condition.condition;
        })
      );
    });

    // 🔥 Update the required status dynamically
    updatedVisibleQuestions.forEach((q) => {
      if (q.isConditional) {
        q.isRequired = true; // ✅ Mark conditional questions as required when shown
      }
    });

    // 🔥 Clean up old answers: Remove answers for hidden questions
    const visibleQuestionIds = updatedVisibleQuestions.map((q) => q._id);
    const cleanedAnswers = Object.keys(updatedAnswers).reduce((acc, key) => {
      if (visibleQuestionIds.includes(key)) {
        acc[key] = updatedAnswers[key];
      }
      return acc;
    }, {});

    setAnswers(cleanedAnswers);
    setVisibleQuestions(updatedVisibleQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Show submitting state
    setIsSubmitting(true);
    // Authentication and validation
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    if (!email || !token) {
      toast.error("You must be logged in to submit this form.");
      setIsSubmitting(false);
      return;
    }

    // Validate required fields
    let newErrors = {};
    visibleQuestions.forEach((question) => {
      const answer = answers[question._id];
    
      if (!question.isRequired) return;
    
      if (question.type === "file") {
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          newErrors[question._id] = "This field is required";
        }
      } else if (question.type === "name") {
        if (question.multipleNames) {
          if (!Array.isArray(answer) || answer.length === 0) {
            newErrors[question._id] = "At least one full name is required";
          } else {
            const invalidEntry = answer.find(
              (entry) =>
                !entry.firstName?.trim() || !entry.lastName?.trim()
            );
            if (invalidEntry) {
              newErrors[question._id] =
                "Each name must include both first and last name";
            }
          }
        } else {
          if (
            !answer ||
            !answer.firstName?.trim() ||
            !answer.lastName?.trim()
          ) {
            newErrors[question._id] = "First and Last Name are required";
          }
        }
      } else if (
        answer === undefined ||
        answer === null ||
        (typeof answer === "string" && answer.trim() === "") ||
        (Array.isArray(answer) && answer.length === 0)
      ) {
        newErrors[question._id] = "This field is required";
      }
    });
    

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare submissions with base64 data for files
      const submissions = await Promise.all(
        Object.keys(answers).map(async (questionId) => {
          const question = questions.find((q) => q._id === questionId);
          const answer = answers[questionId];

          if (question.type === "file" && answer) {
            const fileArray = Array.isArray(answer) ? answer : [answer];
          
            const fileDataArray = await Promise.all(
              fileArray.map(async (fileEntry) => {
                const base64Data = fileEntry.preview
                  ? fileEntry.preview
                  : await fileToBase64(fileEntry.file);
          
                return {
                  preview: base64Data,
                  type: fileEntry.type || fileEntry.file?.type || "application/octet-stream",
                  name: fileEntry.name || fileEntry.file?.name || "uploaded_file",
                  size: fileEntry.size || fileEntry.file?.size || 0,
                };
              })
            );
          
            return {
              questionId,
              isUsedForInvoice: question?.isUsedForInvoice || false,
              isFile: true,
              fileData: question.multiple ? fileDataArray : fileDataArray[0], // 👈 handle multiple or single
            };
          }
           else {
            return {
              questionId,
              answer: answer,
              isUsedForInvoice: question?.isUsedForInvoice || false,
              isFile: false,
            };
          }
        })
      );

      const submissionData = {
        formId,
        email,
        submissions,
      };

      const response = await fetch(
        `${baseUrl}/api/form/${formId}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(submissionData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Submission failed");
      }

      const result = await response.json();
      toast.success("Form submitted successfully!");
      setAnswers({});
      setErrors({});
      setSubmissionSuccess(true);
      return result;
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        error.message || "An error occurred while submitting the form."
      );
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const validateForm = () => {
    let newErrors = {};
    questions.forEach((question) => {
      if (
        question.isRequired &&
        (!answers[question._id] || answers[question._id].length === 0)
      ) {
        newErrors[question._id] = "This field is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <span>📄</span>;

    if (fileType.startsWith("image/")) return <span>🖼️</span>;
    if (fileType.startsWith("video/")) return <span>🎬</span>;
    if (fileType.startsWith("audio/")) return <span>🎵</span>;
    if (fileType.includes("pdf")) return <span>📕</span>;
    if (fileType.includes("word")) return <span>📄</span>;
    if (fileType.includes("excel") || fileType.includes("spreadsheet"))
      return <span>📊</span>;
    if (fileType.includes("zip") || fileType.includes("compressed"))
      return <span>🗜️</span>;

    return <span>📄</span>;
  };

  const renderInputField = (question) => {
    const value =
      answers[question._id] ?? (question.type === "accept" ? false : "");

    switch (question.type) {
      case "text":
      case "email":
      case "number":
        return (
          <input
            type={question.type}
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
            required={question.required}
            className="form-input"
          />
        );

      case "phone":
        return (
          <PhoneInput
            country={"ru"}
            value={value}
            onChange={(phone) => handleAnswerChange(question._id, phone)}
            inputClass="custom-phone-input"
            containerClass="custom-phone-container"
            buttonClass="custom-flag-dropdown"
            inputProps={{
              name: `question-${question._id}`,
              required: question.required,
            }}
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
            required={question.required}
            className="form-textarea"
          />
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
            required={question.required}
            className="form-select"
          >
            <option value="">Select an option</option>
            {(question.options ?? []).map((opt, index) => (
              <option key={index} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="question-options">
            {(question.options ?? []).map((opt, index) => (
              <label key={index} className="form-radio-label">
                <input
                  type="radio"
                  name={`question-${question._id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) =>
                    handleAnswerChange(question._id, e.target.value)
                  }
                  required={question.required}
                  className="form-radio"
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div
            className={`question-options ${
              question.type === "checkbox" && question.options.length > 4
                ? "checkbox-grid"
                : ""
            }`}
          >
            {(question.options ?? []).map((opt, index) => (
              <label key={index} className="form-checkbox-label">
                <input
                  type="checkbox"
                  name={`question-${question._id}`}
                  value={opt}
                  checked={(value || []).includes(opt)}
                  onChange={(e) => {
                    const newValue = [...(value || [])];
                    if (e.target.checked) {
                      newValue.push(opt);
                    } else {
                      newValue.splice(newValue.indexOf(opt), 1);
                    }
                    handleAnswerChange(question._id, newValue);
                  }}
                  required={question.required}
                  className="form-checkbox"
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "multi-select":
        return (
          <Multiselect
            options={question.options ?? []}
            isObject={false}
            selectedValues={value}
            onSelect={(selectedList) =>
              handleAnswerChange(question._id, selectedList)
            }
            onRemove={(selectedList) =>
              handleAnswerChange(question._id, selectedList)
            }
            placeholder="Select options"
            className="multiselect-wrapper"
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
            required={question.required}
            className="form-date"
          />
        );

      case "file":
          const isMultiple = question.multiple; // Determine if multiple files are allowed
          const currentFiles = value || []; // Always treat value as an array for consistency
        
          return (
            <div className="file-upload-container">
              {/* Info message (dynamic based on single/multiple) */}
              <p className="file-info-message">
                {formDetails.isUsedForRussian
                  ? `Максимальный размер файла: 5MB${isMultiple ? " (можно загрузить несколько файлов)" : ""}`
                  : `Max file size: 5MB${isMultiple ? " (multiple files allowed)" : ""}`}
              </p>
        
              {/* File input (conditionally allow multiple) */}
              <input
                type="file"
                multiple={isMultiple} // Only allow multiple if specified
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || []);
                  if (!newFiles.length) return;
        
                  // Validate file sizes
                  const validFiles = newFiles.filter(file => file.size <= 5 * 1024 * 1024);
                  const invalidFiles = newFiles.filter(file => file.size > 5 * 1024 * 1024);
        
                  if (invalidFiles.length) {
                    toast.error(
                      formDetails.isUsedForRussian
                        ? `Некоторые файлы превышают 5MB (${invalidFiles.length})`
                        : `Some files exceed 5MB limit (${invalidFiles.length})`
                    );
                  }
        
                  if (!validFiles.length) {
                    e.target.value = ""; // Clear input if no valid files
                    return;
                  }
        
                  // Process files (previews, metadata)
                  Promise.all(
                    validFiles.map(file => {
                      return new Promise(resolve => {
                        const fileName =
                          file.name.length > 15
                            ? `${file.name.substring(0, 10)}...${file.name.split('.').pop()}`
                            : file.name;
                    
                        if (file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onload = (event) =>
                            resolve({
                              file,
                              preview: event.target.result,
                              name: file.name,            // ✅ full name to submit
                              displayName: fileName,      // ✅ short name for display
                              size: file.size,
                              type: file.type
                            });
                          reader.readAsDataURL(file);
                        } else {
                          resolve({
                            file,
                            name: file.name,              // ✅ full name to submit
                            displayName: fileName,        // ✅ short name for display
                            size: file.size,
                            type: file.type
                          });
                        }
                      });
                    })
                    
                  ).then(processedFiles => {
                    // For single upload: Replace existing file
                    // For multiple: Append new files
                    const updatedFiles = isMultiple
                      ? [...currentFiles, ...processedFiles]
                      : processedFiles.slice(0, 1); // Only keep first file if not multiple
        
                    handleAnswerChange(question._id, updatedFiles.length ? updatedFiles : null);
                  });
                }}
                required={question.required && !currentFiles.length}
                className="form-file"
                accept={question.acceptedFileTypes?.join(",") || "*"}
              />
        
              {/* File list display */}
              {currentFiles.length > 0 && (
                <div className="file-list">
                  {currentFiles.map((fileData, index) => (
                    <div key={index} className="file-info-container">
                      <div className="file-icon">{getFileIcon(fileData.type)}</div>
                      <div className="file-details">
                      <p className="file-name">{fileData.displayName || fileData.name}</p>
                      <p className="file-size">
                          {(fileData.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() => {
                          const filteredFiles = currentFiles.filter((_, i) => i !== index);
                          handleAnswerChange(
                            question._id, 
                            filteredFiles.length ? filteredFiles : null
                          );
                        }}
                      >
                        {formDetails.isUsedForRussian ? "Удалить" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
        
              {/* Image previews */}
              <div className="file-preview-container">
                {currentFiles.map(
                  (fileData, index) =>
                    fileData.preview && (
                      <img
                        key={index}
                        src={fileData.preview}
                        alt={`Preview ${index + 1}`}
                        className="preview-image"
                      />
                    )
                )}
              </div>
            </div>
          );

      case "content":
        return (
          <div
            className="content-display"
            dangerouslySetInnerHTML={{ __html: question.content }}
          ></div>
        );

      case "accept":
        return (
          <div className="accept-container">
            <label className="accept-label">
              <input
                type="checkbox"
                className="accept-checkbox"
                checked={value}
                onChange={(e) =>
                  handleAnswerChange(question._id, e.target.checked)
                }
                required={question.required}
              />
              <span
                className="accept-text"
                dangerouslySetInnerHTML={{ __html: question.label }}
              ></span>
            </label>
          </div>
        );


        case "name":
          const nameValues = answers[question._id] || [
            { firstName: "", middleName: "", lastName: "" }
          ];
        
          const updateNameEntry = (index, field, value) => {
            const updated = [...nameValues];
            updated[index][field] = value;
            handleAnswerChange(question._id, updated);
          };
        
          const addNameEntry = () => {
            handleAnswerChange(question._id, [
              ...nameValues,
              { firstName: "", middleName: "", lastName: "" }
            ]);
          };
        
          const removeNameEntry = (index) => {
            const updated = nameValues.filter((_, i) => i !== index);
            handleAnswerChange(question._id, updated);
          };
        
          return (
            <div className="name-fields-wrapper">
              {nameValues.map((entry, index) => (
                <div key={index} className="name-entry">
                {formDetails.isUsedForRussian ? (
                  <>
                    {/* Russian Order: Last Name → First Name → Middle Name */}
                    <div className="form-group">
                      <label>
                        Фамилия<span className="required-star"> *</span>
                      </label>
                      <input
                        type="text"
                        value={entry.lastName}
                        onChange={(e) =>
                          updateNameEntry(index, "lastName", e.target.value)
                        }
                        required
                        className="form-input"
                      />
                    </div>
              
                    <div className="form-group">
                      <label>
                        Имя<span className="required-star"> *</span>
                      </label>
                      <input
                        type="text"
                        value={entry.firstName}
                        onChange={(e) =>
                          updateNameEntry(index, "firstName", e.target.value)
                        }
                        required
                        className="form-input"
                      />
                    </div>
              
                    <div className="form-group">
                      <label>Отчество</label>
                      <input
                        type="text"
                        value={entry.middleName}
                        onChange={(e) =>
                          updateNameEntry(index, "middleName", e.target.value)
                        }
                        className="form-input"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* English Order: First Name → Middle Name → Last Name */}
                    <div className="form-group">
                      <label>
                        First Name<span className="required-star"> *</span>
                      </label>
                      <input
                        type="text"
                        value={entry.firstName}
                        onChange={(e) =>
                          updateNameEntry(index, "firstName", e.target.value)
                        }
                        required
                        className="form-input"
                      />
                    </div>
              
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input
                        type="text"
                        value={entry.middleName}
                        onChange={(e) =>
                          updateNameEntry(index, "middleName", e.target.value)
                        }
                        className="form-input"
                      />
                    </div>
              
                    <div className="form-group">
                      <label>
                        Last Name<span className="required-star"> *</span>
                      </label>
                      <input
                        type="text"
                        value={entry.lastName}
                        onChange={(e) =>
                          updateNameEntry(index, "lastName", e.target.value)
                        }
                        required
                        className="form-input"
                      />
                    </div>
                  </>
                )}
              
                {question.multipleNames && nameValues.length > 1 && (
                  <button
                    type="button"
                    className="remove-name-btn"
                    onClick={() => removeNameEntry(index)}
                  >
                    {formDetails.isUsedForRussian ? "Удалить" : "Remove"}
                  </button>
                )}
              </div>
              
              ))}
        
              {question.multipleNames && (
                <button
                  type="button"
                  className="add-name-btn"
                  onClick={addNameEntry}
                >
                  {formDetails.isUsedForRussian
                    ? "Добавить еще имя"
                    : "Add another name"}
                </button>
              )}
        
              {errors[question._id] && (
                <span className="error-message">{errors[question._id]}</span>
              )}
            </div>
          );
        


      default:
        return <span>Unsupported question type: {question.type}</span>;
    }
  };

  return (
    <div className="form-container">
      {submissionSuccess ? (
        <div className="success-animation-container">
          <div className="success-content">
            {/* Animated checkmark */}
            <div className="success-animation">
              <svg
                className="checkmark"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
              >
                <circle
                  className="checkmark-circle"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className="checkmark-check"
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>

            <h2 className="success-title">
              {formDetails.isUsedForRussian
                ? "Форма успешно отправлена!"
                : "Form submitted successfully!"}
            </h2>

            <div className="success-message">
              <p>
                {formDetails.isUsedForRussian
                  ? "Подтверждение и дальнейшие инструкции были отправлены на вашу электронную почту с адреса eafo@e-register.org."
                  : "Confirmation & further instructions have been sent to your email from eafo@e-register.org."}
              </p>
              <p>
                {formDetails.isUsedForRussian
                  ? "Мы отправили детали на вашу электронную почту"
                  : "We've sent the details to your email"}
              </p>
            </div>

            <div className="form-reference">
              <p>
                {formDetails.isUsedForRussian
                  ? `Форма: ${formDetails.title}`
                  : `Form: ${formDetails.title}`}
              </p>
            </div>

            <button className="success-action-btn" onClick={() => navigate(-1)}>
              {formDetails.isUsedForRussian
                ? "Вернуться к формам"
                : "Back to forms"}
            </button>

            <div className="email-note">
              <p>
                {formDetails.isUsedForRussian
                  ? "Не получили письмо? Проверьте папку спам"
                  : "Didn't receive email? Check spam folder"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="form-header">
            <div className="logo-container">
              {formDetails.hasLogo && (
                <div className="form-logo-container">
                  <img
                    src={`${baseUrl}/api/form/${formId}/image`}
                    alt="Form Logo"
                    className="form-logo"
                    onError={(e) => {
                      e.target.style.display = "none"; // Hide if image fails to load
                    }}
                  />
                </div>
              )}
            </div>

            <div className="form-title-description">
              <h1 className="form-title">{formDetails.title}</h1>
              {formDetails.description && (
                <p className="form-description">{formDetails.description}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-questions-container">
              {visibleQuestions.map((question) => (
                <div key={question._id} className="form-question">
                  {question.type !== "accept" && (
                    <label className="form-label">
                      <span
                        dangerouslySetInnerHTML={{ __html: question.label }}
                      ></span>
                      {question.isRequired && (
                        <span className="required-star"> *</span>
                      )}
                    </label>
                  )}

                  <div className="question-input-wrapper">
                    {renderInputField(question)}
                    {question.description && (
                      <div className="question-description">
                        <small>{question.description}</small>
                      </div>
                    )}
                    {errors[question._id] && (
                      <span className="error-message">
                        {errors[question._id]}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {visibleQuestions.length === 0 && (
                <div className="no-questions-message">
                  No questions available based on the rules.
                </div>
              )}
            </div>

            <div className="form-controls">
              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting} // Changed from loading to isSubmitting
              >
                {isSubmitting ? ( // Changed from loading to isSubmitting
                  <>
                    <span className="spinner"></span>
                    {formDetails.isUsedForRussian
                      ? "Отправка..."
                      : "Submitting..."}
                  </>
                ) : formDetails.isUsedForRussian ? (
                  "Отправить"
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </form>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </>
      )}
    </div>
  );
};

export default Forms;
