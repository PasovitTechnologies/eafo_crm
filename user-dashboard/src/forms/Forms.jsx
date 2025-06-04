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
import { FaExclamationCircle } from "react-icons/fa";

const isQuestionVisible = (question, answers, questions) => {
  if (!question.isConditional) return true;

  const triggeredRules = questions.flatMap(
    (q) =>
      q.rules?.filter((rule) =>
        rule.targetQuestionIds?.includes(question._id)
      ) ?? []
  );

  return triggeredRules.some((rule) =>
    rule.conditions.every((cond) => {
      const triggerAnswer = answers[cond.triggerQuestionId];
      return Array.isArray(triggerAnswer)
        ? triggerAnswer.includes(cond.condition)
        : triggerAnswer === cond.condition;
    })
  );
};

function getVisibleQuestionsRecursively(allQuestions, answers) {
  const visible = new Set();

  function reveal(question) {
    if (visible.has(question._id)) return;
    visible.add(question._id);

    // Find rules where this question is the trigger
    const triggeredRules = allQuestions
      .flatMap((q) => q.rules || [])
      .filter((rule) =>
        rule.conditions.some(
          (cond) =>
            cond.triggerQuestionId === question._id &&
            (answers[cond.triggerQuestionId] === cond.condition ||
              (Array.isArray(answers[cond.triggerQuestionId]) &&
                answers[cond.triggerQuestionId].includes(cond.condition)))
        )
      );

    for (const rule of triggeredRules) {
      for (const targetId of rule.targetQuestionIds) {
        const targetQ = allQuestions.find((q) => q._id === targetId);
        if (targetQ) {
          reveal(targetQ);
        }
      }
    }
  }

  // Always start from root (non-conditional questions)
  allQuestions.forEach((q) => {
    if (!q.isConditional) {
      reveal(q);
    }
  });

  return [...visible].map((id) => allQuestions.find((q) => q._id === id));
}

const Forms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formId, courseSlug: slug } = location.state || {};
  const [questions, setQuestions] = useState([]);
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [promoCodeStatus, setPromoCodeStatus] = useState({});
  const [validatingPromoCodes, setValidatingPromoCodes] = useState({});
  const [discountInfo, setDiscountInfo] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [formDetails, setFormDetails] = useState({
    title: "",
    description: "",
    hasLogo: false,
    isUsedForRussian: false,
  });

  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { t } = useTranslation();

  useEffect(() => {
    // Check if token is available in localStorage
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
    const email = localStorage.getItem("email");

    if (!token || !email) {
      console.error("Missing token or email");
      setError("Unauthorized: Please log in.");
      setLoading(false);
      return;
    }

    const checkIfSubmitted = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Unauthorized: No token found.");
        setLoading(false);
        return;
      }

      try {
        // Call the new backend endpoint using JWT-based email
        const res = await fetch(`${baseUrl}/api/form/${formId}/submitted`, {
          method: "POST", // Must be POST to include body
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slug }), // Include slug in the body
        });

        if (!res.ok) throw new Error("Failed to check submission");

        const { submitted } = await res.json();

        if (submitted) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        // Not submitted — load form questions and metadata
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
          name:formData.formName
        });
      } catch (err) {
        console.error("Error checking submission:", err);
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    checkIfSubmitted();
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
          name:data.formName
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
    console.log("🔄 User changed answer", {
      questionId,
      answer,
    });

    const updatedAnswers = {
      ...answers,
      [questionId]: answer,
    };

    // Determine which questions are now visible
    const visibleQuestions = getVisibleQuestionsRecursively(
      questions,
      updatedAnswers
    );
    const visibleIds = new Set(visibleQuestions.map((q) => q._id));

    // Clean answers for now-hidden questions
    const cleanedAnswers = Object.fromEntries(
      Object.entries(updatedAnswers).filter(([key]) => visibleIds.has(key))
    );

    const removedAnswers = Object.keys(updatedAnswers).filter(
      (key) => !visibleIds.has(key)
    );

    setAnswers(cleanedAnswers);
    setVisibleQuestions(visibleQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

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
              (entry) => !entry.firstName?.trim() || !entry.lastName?.trim()
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
      toast.error(
        formDetails.isUsedForRussian
          ? "Пожалуйста, заполните все необходимые поля"
          : "Please fill in all required fields."
      );

      setIsSubmitting(false);
      return;
    }

    try {
      const submissions = await Promise.all(
        Object.keys(answers).map(async (questionId) => {
          const question = questions.find((q) => q._id === questionId);
          const answer = answers[questionId];

          // Handle file uploads
          if (question.type === "file" && answer) {
            const fileArray = Array.isArray(answer) ? answer : [answer];

            const fileDataArray = await Promise.all(
              fileArray.map(async (fileEntry) => {
                const base64Data = fileEntry.preview
                  ? fileEntry.preview
                  : await fileToBase64(fileEntry.file);

                return {
                  preview: base64Data,
                  type:
                    fileEntry.type ||
                    fileEntry.file?.type ||
                    "application/octet-stream",
                  name:
                    fileEntry.name || fileEntry.file?.name || "uploaded_file",
                  size: fileEntry.size || fileEntry.file?.size || 0,
                };
              })
            );

            return {
              questionId,
              isUsedForInvoice: question?.isUsedForInvoice || false,
              isFile: true,
              fileData: question.multiple ? fileDataArray : fileDataArray[0],
            };
          }

          // Default answer for other questions
          return {
            questionId,
            answer: answer,
            isUsedForInvoice: question?.isUsedForInvoice || false,
            isFile: false,
          };
        })
      );

      const submissionData = {
        formId,
        email,
        submissions,
        discountInfo,
      };

      console.log(submissionData);

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

  const validatePromoCode = async (questionId, code) => {
    if (!code) {
      setPromoCodeStatus((prev) => ({ ...prev, [questionId]: null }));
      return;
    }

    setValidatingPromoCodes((prev) => ({ ...prev, [questionId]: true }));

    try {
      const userEmail = localStorage.getItem("email");
      const courseSlug = slug;

      const response = await fetch(`${baseUrl}/api/courses/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, email: userEmail, slug: courseSlug }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      setPromoCodeStatus((prev) => ({ ...prev, [questionId]: data.valid }));

      if (data.valid) {
        setDiscountInfo((prev) => ({
          ...prev,
          [questionId]: {
            amount: data.coupon.percentage,
            type: data.coupon.type,
            code: data.coupon.code,
            id: data.coupon._id,
            totalLimit: data.coupon.totalLimit,
            currentLimit: data.coupon.currentLimit,
          },
        }));
      }
    } catch (error) {
      console.error("Promo code validation error:", error);
      setPromoCodeStatus((prev) => ({ ...prev, [questionId]: false }));
    } finally {
      setValidatingPromoCodes((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handlePromoCodeChange = (questionId, value) => {
    handleAnswerChange(questionId, value);
    // Debounce validation
    const debounceTimer = setTimeout(() => {
      validatePromoCode(questionId, value);
    }, 1000);
    return () => clearTimeout(debounceTimer);
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
            <option value="">
              {formDetails.isUsedForRussian
                ? "Выберите опцию"
                : "Select an option"}
            </option>

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
            placeholder={
              formDetails.isUsedForRussian ? "Выберите опции" : "Select options"
            }
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
                ? `Максимальный размер файла: 5MB${
                    isMultiple ? " (можно загрузить несколько файлов)" : ""
                  }`
                : `Max file size: 5MB${
                    isMultiple ? " (multiple files allowed)" : ""
                  }`}
            </p>

            {/* Custom file input wrapper */}
            <div className="custom-file-input">
              {/* The actual file input (hidden) */}
              <input
                type="file"
                multiple={isMultiple}
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || []);
                  if (!newFiles.length) return;

                  // Validate file sizes
                  const validFiles = newFiles.filter(
                    (file) => file.size <= 5 * 1024 * 1024
                  );
                  const invalidFiles = newFiles.filter(
                    (file) => file.size > 5 * 1024 * 1024
                  );

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
                    validFiles.map((file) => {
                      return new Promise((resolve) => {
                        const fileName =
                          file.name.length > 15
                            ? `${file.name.substring(0, 10)}...${file.name
                                .split(".")
                                .pop()}`
                            : file.name;

                        if (file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onload = (event) =>
                            resolve({
                              file,
                              preview: event.target.result,
                              name: file.name, // ✅ full name to submit
                              displayName: fileName, // ✅ short name for display
                              size: file.size,
                              type: file.type,
                            });
                          reader.readAsDataURL(file);
                        } else {
                          resolve({
                            file,
                            name: file.name, // ✅ full name to submit
                            displayName: fileName, // ✅ short name for display
                            size: file.size,
                            type: file.type,
                          });
                        }
                      });
                    })
                  ).then((processedFiles) => {
                    // For single upload: Replace existing file
                    // For multiple: Append new files
                    const updatedFiles = isMultiple
                      ? [...currentFiles, ...processedFiles]
                      : processedFiles.slice(0, 1); // Only keep first file if not multiple

                    handleAnswerChange(
                      question._id,
                      updatedFiles.length ? updatedFiles : null
                    );
                    e.target.value = ""; // ✅ Fix: reset input value so same file can be re-selected
                  });
                }}
                required={question.required && !currentFiles.length}
                className="form-file"
                accept={question.acceptedFileTypes?.join(",") || "*"}
                id={`file-input-${question._id}`} // Added ID for label
              />

              {/* Custom visible label */}
              <label
                htmlFor={`file-input-${question._id}`}
                className="file-input-label"
              >
                <span className="file-input-button">
                  {formDetails.isUsedForRussian
                    ? "Выберите файл"
                    : "Choose file"}
                </span>
                <span className="file-input-text">
                  {currentFiles.length > 0
                    ? isMultiple
                      ? formDetails.isUsedForRussian
                        ? `Выбрано файлов: ${currentFiles.length}`
                        : `Files selected: ${currentFiles.length}`
                      : currentFiles[0].displayName || currentFiles[0].name
                    : formDetails.isUsedForRussian
                    ? "Файл не выбран"
                    : "No file chosen"}
                </span>
              </label>
            </div>

            {/* Rest of your existing code remains exactly the same */}
            {currentFiles.length > 0 && (
              <div className="file-list">
                {currentFiles.map((fileData, index) => (
                  <div key={index} className="file-info-container">
                    <div className="file-icon">
                      {getFileIcon(fileData.type)}
                    </div>
                    <div className="file-details">
                      <p className="file-name">
                        {fileData.displayName || fileData.name}
                      </p>
                      <p className="file-size">
                        {(fileData.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => {
                        const filteredFiles = currentFiles.filter(
                          (_, i) => i !== index
                        );
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
          { firstName: "", middleName: "", lastName: "" },
        ];

        const updateNameEntry = (index, field, value) => {
          const updated = [...nameValues];
          updated[index][field] = value;
          handleAnswerChange(question._id, updated);
        };

        const addNameEntry = () => {
          handleAnswerChange(question._id, [
            ...nameValues,
            { firstName: "", middleName: "", lastName: "" },
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

      case "promocode":
        return (
          <div className="promo-code-container">
            <div className="promo-code-input-wrapper">
              <input
                type="text"
                value={value}
                onChange={(e) =>
                  handlePromoCodeChange(question._id, e.target.value)
                }
                required={question.required}
                className="form-input"
                placeholder={
                  formDetails.isUsedForRussian
                    ? "Введите промокод"
                    : "Enter promo code"
                }
              />

              {/* Discount percentage badge - only shows when valid */}
              {promoCodeStatus[question._id] === true &&
                discountInfo?.[question._id] && (
                  <div className="discount-badge">
                    {discountInfo[question._id].amount}% OFF
                  </div>
                )}
            </div>

            {validatingPromoCodes[question._id] && (
              <div className="promo-code-status validating">
                {formDetails.isUsedForRussian ? "Проверка..." : "Validating..."}
              </div>
            )}

            {promoCodeStatus[question._id] === false && (
              <div className="promo-code-status invalid">
                ✗{" "}
                {formDetails.isUsedForRussian
                  ? "Недействительный промокод"
                  : "Invalid promo code"}
              </div>
            )}
          </div>
        );

      default:
        return <span>Unsupported question type: {question.type}</span>;
    }
  };

  if (loading) {
    return (
      <div className="form-container">
        <div className="form-header">
          <Skeleton height={40} width={300} style={{ marginBottom: 16 }} />
          <Skeleton height={20} width={500} count={2} />
        </div>

        <div className="form-questions-container">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="form-question">
              <Skeleton height={24} width={200} style={{ marginBottom: 8 }} />
              <Skeleton height={40} width="100%" />
            </div>
          ))}
        </div>

        <div className="form-controls">
          <Skeleton height={45} width={150} />
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      {alreadySubmitted ? (
        <div className="submission-message-container">
          <div className="submission-message-card">
            <div className="message-icon-container">
              <svg
                className="message-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className="message-title">
              {formDetails.isUsedForRussian
                ? "Вы уже заполнили эту форму."
                : "You have already submitted this form."}
            </h2>
            <p className="message-description">
              {formDetails.isUsedForRussian
                ? "Если вы считаете, что это ошибка, пожалуйста, свяжитесь с поддержкой."
                : "If you believe this is a mistake, please contact support."}
            </p>
            <button className="contact-support-btn">
              {formDetails.isUsedForRussian
                ? "Связаться с поддержкой"
                : "Contact Support"}
            </button>
            <div className="contact-details">
              <p>
                {formDetails.isUsedForRussian
                  ? "Свяжитесь с нашей службой поддержки по электронной почте 📧 Support@eafo.info или по телефону ☎ +7 (985) 125-77-88"
                  : "Contact our support team via email at 📧 Support@eafo.info or by phone at ☎ +7 (985) 125-77-88"}
              </p>
            </div>
          </div>
        </div>
      ) : submissionSuccess ? (
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
                ? "Заявка успешно отправлена!"
                : "Form submitted successfully!"}
            </h2>

            <div className="success-message">
              <p>
                {formDetails.isUsedForRussian
                  ? "Подтверждение и дальнейшие инструкции были отправлены на вашу электронную почту с адреса eafo@e-register.org."
                  : "Confirmation & further instructions have been sent to your email from eafo@e-register.org."}
              </p>
            </div>

            <div className="form-reference">
              <p>
                {formDetails.isUsedForRussian
                  ? `Заявка: ${formDetails.title.replace(/<[^>]*>/g, "")}`
                  : `Form: ${formDetails.title.replace(/<[^>]*>/g, "")}`}
              </p>
            </div>

            <button className="success-action-btn" onClick={() => navigate(-1)}>
              {formDetails.isUsedForRussian
                ? "вернуться к заявкам"
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
              
              {formDetails.title && (
                <h1
                  className="form-title"
                  dangerouslySetInnerHTML={{
                    __html: formDetails.title,
                  }}
                />
              )}
              {formDetails.description && (
                <div
                  className="form-description"
                  dangerouslySetInnerHTML={{
                    __html: formDetails.description,
                  }}
                />
              )}
            </div>
           
          </div>

          {formDetails.name && (
    <h2
      className="form-name-title"
      dangerouslySetInnerHTML={{ __html: formDetails.name }}
    />
  )}

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
                        <small
                          dangerouslySetInnerHTML={{
                            __html: question.description,
                          }}
                        />
                      </div>
                    )}
                    {errors[question._id] && (
                      <span className="error-message">
                        <FaExclamationCircle
                          style={{ marginRight: "6px", color: "red" }}
                        />
                        {formDetails.isUsedForRussian
                          ? "Необходимо заполнить это поле"
                          : "This field is required"}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {!loading &&
                questions.length > 0 &&
                visibleQuestions.length === 0 && (
                  <div className="no-questions-message">
                    {formDetails.isUsedForRussian
                      ? "Нет доступных вопросов на основе выбранных параметров."
                      : "No questions available based on the rules."}
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
