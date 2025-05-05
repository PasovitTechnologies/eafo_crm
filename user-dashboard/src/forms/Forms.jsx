import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Multiselect } from "multiselect-react-dropdown";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import "./Forms.css";
import { useTranslation } from "react-i18next"; // 🌍 Import translation hook


const Forms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formId } = location.state || {}; // Retrieve formId from state
  const [questions, setQuestions] = useState([]);
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(true); // ✅
  const [formDetails, setFormDetails] = useState({
    title: "",
    description: "",
    hasLogo: false,
    isUsedForRussian:false
  });
  
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const {t} = useTranslation();

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
    setLoading(true);

    // Authentication and validation
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    if (!email || !token) {
      toast.error("You must be logged in to submit this form.");
      setLoading(false);
      return;
    }

    // Validate required fields
    let newErrors = {};
    visibleQuestions.forEach((question) => {
      if (question.isRequired) {
        if (question.type === "file") {
          if (!answers[question._id]?.file) {
            newErrors[question._id] = "This field is required";
          }
        } else if (
          !answers[question._id] ||
          answers[question._id].length === 0
        ) {
          newErrors[question._id] = "This field is required";
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      // Prepare submissions with base64 data for files
      const submissions = await Promise.all(
        Object.keys(answers).map(async (questionId) => {
          const question = questions.find((q) => q._id === questionId);
          const answer = answers[questionId];

          if (question.type === "file" && answer?.file) {
            const base64Data = await fileToBase64(answer.file);
            return {
              questionId,
              isUsedForInvoice: question?.isUsedForInvoice || false,
              isFile: true,
              fileData: {
                base64: base64Data.split(",")[1],
                contentType: answer.file.type,
              },
              fileName: answer.file.name,
            };
          } else {
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
      navigate(-1);
      return result;
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        error.message || "An error occurred while submitting the form."
      );
      throw error;
    } finally {
      setLoading(false);
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
      case "phone":
        return (
          <input
            type={question.type === "phone" ? "tel" : question.type}
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
            required={question.required}
            className="form-input"
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
            return (
              <div className="file-upload-container">
                {/* Info message about file size */}
                <p className="file-info-message">
                  {formDetails.isUsedForRussian 
                    ? "Максимальный размер файла: 5MB" 
                    : "Max file size: 5MB"}
                </p>
          
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
          
                    // Check file size (5MB limit)
                    if (file.size > 5 * 1024 * 1024) {
                        toast.error(
                        formDetails.isUsedForRussian
                          ? "Размер файла превышает 5MB" 
                          : "File size exceeds 5MB limit"
                      );
                      e.target.value = ""; // Clear file input
                      return;
                    }
          
                    const fileName =
                      file.name.length > 15
                        ? file.name.substring(0, 10) + "..." + file.name.split('.').pop()
                        : file.name;
          
                    if (file.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        handleAnswerChange(question._id, {
                          file,
                          preview: event.target.result, // Store preview
                          name: fileName,
                          size: file.size,
                          type: file.type,
                        });
                      };
                      reader.readAsDataURL(file);
                    } else {
                      handleAnswerChange(question._id, {
                        file,
                        name: fileName,
                        size: file.size,
                        type: file.type,
                      });
                    }
                  }}
                  required={question.required && !answers[question._id]}
                  className="form-file"
                  accept={question.acceptedFileTypes?.join(",") || "*"}
                />
          
                {/* File details */}
                {value?.file && (
                  <div className="file-info-container">
                    <div className="file-icon">{getFileIcon(value.type)}</div>
                    <div className="file-details">
                      <p className="file-name">{value.name}</p>
                      <p className="file-type">{value.type}</p>
                      <p className="file-size">
                        {(value.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  
                  </div>
                )}
          
                {/* Show image preview at the bottom */}
                {value?.preview && (
                  <div className="file-preview-container">
                    <img
                      src={value.preview}
                      alt="Preview"
                      className="preview-image"
                    />
                  </div>
                )}
                  <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => {
                        handleAnswerChange(question._id, null);
                        document.querySelector(`input[type="file"]`).value = "";
                      }}
                    >
                      {formDetails.isUsedForRussian ? "Удалить" : "Remove"}
                    </button>
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

      default:
        return <span>Unsupported question type: {question.type}</span>;
    }
  };




  return (
    <div className="form-container">
      {loading ? (
         <div className="skeleton-wrapper">
         {/* Header */}
         <div className="skeleton-header" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
           <Skeleton circle height={80} width={80} />
           <div style={{ flex: 1 }}>
             <Skeleton height={24} width="50%" style={{ marginBottom: 10 }} />
             <Skeleton height={16} width="30%" />
           </div>
         </div>
       
         {/* Tabs */}
         <div className="skeleton-tabs" style={{ display: "flex", gap: "1rem", margin: "1rem 0" }}>
           {Array.from({ length: 4 }).map((_, index) => (
             <Skeleton key={index} height={30} width={100} />
           ))}
         </div>
       
         {/* Questions Section */}
         <div className="skeleton-questions">
           {Array.from({ length: 5 }).map((_, index) => (
             <div key={index} className="skeleton-question" style={{ marginBottom: "2rem" }}>
               {/* Question label */}
               <Skeleton height={20} width="40%" style={{ marginBottom: 8 }} />
       
               {/* Input field */}
               <Skeleton height={40} width="100%" />
             </div>
           ))}
         </div>
       </div>
       
                ) :
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
      <span className="error-message">{errors[question._id]}</span>
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
          <button type="submit" className="submit-btn" disabled={loading}>
      {loading ? (
        <>
          <span className="spinner"></span>
          {t('submitting')}
        </>
      ) : (
        t('submit')
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
                
                </>}
      
    </div>
  );
};

export default Forms;
