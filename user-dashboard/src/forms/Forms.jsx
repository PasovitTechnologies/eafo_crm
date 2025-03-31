import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Multiselect } from "multiselect-react-dropdown";
import "./Forms.css";

const Forms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formId } = location.state || {}; // Retrieve formId from state
  const [questions, setQuestions] = useState([]);
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(null);
  const [formDetails, setFormDetails] = useState({
    title: "",
    description: "",
    hasLogo: false
  });
  const baseUrl = import.meta.env.VITE_BASE_URL;


  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);



  useEffect(() => {
    if (!formId) return;

    const controller = new AbortController(); // 🛑 Prevent memory leaks
    const signal = controller.signal;
    const token = localStorage.getItem("token"); // 🔐 Retrieve token from localStorage

    if (!token) {
      console.error("🚨 No authentication token found.");
      setError("Unauthorized: Please log in.");
      setLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `${baseUrl}/api/form/${formId}/questions`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // 🔐 Attach Bearer token
            },
            signal,
          }
        );

        if (!response.ok) {
          if (response.status === 401)
            throw new Error("Unauthorized: Invalid token.");
          if (response.status === 403)
            throw new Error("Forbidden: Access denied.");
          throw new Error(`Failed to fetch questions: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data)
        setQuestions(data);
        setVisibleQuestions(data.filter((q) => !q.isConditional));
        setAnswers({});
      } catch (err) {
        if (err.name === "AbortError") return; // ✅ Ignore if request was aborted
        console.error("🚨 Error fetching questions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();

    return () => controller.abort(); // 🛑 Cleanup function to cancel requests on unmount
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
          hasLogo: !!data.formLogo // Just check if logo exists
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

    // 🔥 Determine visible questions based on current answers
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

    // 🔥 Clean up old answers: Remove answers for hidden questions
    const visibleQuestionIds = updatedVisibleQuestions.map((q) => q._id);
    const cleanedAnswers = Object.keys(updatedAnswers).reduce((acc, key) => {
      if (visibleQuestionIds.includes(key)) {
        acc[key] = updatedAnswers[key];
      }
      return acc;
    }, {});

    setAnswers(cleanedAnswers); // ✅ Save only relevant answers
    setVisibleQuestions(updatedVisibleQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Authentication and validation (same as before)
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    if (!email || !token) {
      alert("You must be logged in to submit this form.");
      return;
    }
  
    // Validate required fields
    let newErrors = {};
    questions.forEach((question) => {
      if (question.isRequired) {
        if (question.type === "file") {
          if (!answers[question._id]?.file) {
            newErrors[question._id] = "This field is required";
          }
        } else if (!answers[question._id] || answers[question._id].length === 0) {
          newErrors[question._id] = "This field is required";
        }
      }
    });
  
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert("Please fill in all required fields.");
      return;
    }
  
    setLoading(true);
  
    try {
      // Prepare submissions with base64 data for files
      const submissions = await Promise.all(
        Object.keys(answers).map(async (questionId) => {
          const question = questions.find((q) => q._id === questionId);
          const answer = answers[questionId];
  
          if (question.type === "file" && answer?.file) {
            // Convert file to base64
            const base64Data = await fileToBase64(answer.file);
            return {
              questionId,
              isUsedForInvoice: question?.isUsedForInvoice || false,
              isFile: true,
              fileData: {
                base64: base64Data.split(',')[1], // Remove data URL prefix
                contentType: answer.file.type
              },
              fileName: answer.file.name
            };
          } else {
            return {
              questionId,
              answer: answer,
              isUsedForInvoice: question?.isUsedForInvoice || false,
              isFile: false
            };
          }
        })
      );
  
      const submissionData = {
        formId,
        email,
        submissions
      };
       console.log(submissionData)
      const response = await fetch(
        `${baseUrl}/api/form/${formId}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(submissionData)
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Submission failed");
      }
  
      const result = await response.json();
      alert("✅ Form submitted successfully!");
      setAnswers({});
      setErrors({});
      navigate(-1);
      return result;
    } catch (error) {
      console.error("🚨 Error submitting form:", error);
      alert(error.message || "An error occurred while submitting the form.");
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
      reader.onerror = error => reject(error);
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
            placeholder={`Enter ${question.label}`}
            required={question.required}
            className="form-input"
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
            placeholder={`Enter ${question.label}`}
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
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Create a preview if it's an image
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          handleAnswerChange(question._id, {
                            file,
                            preview: event.target.result
                          });
                        };
                        reader.readAsDataURL(file);
                      } else {
                        handleAnswerChange(question._id, { file });
                      }
                    }
                  }}
                  required={question.required}
                  className="form-file"
                />
                {value?.preview && (
                  <div className="file-preview">
                    <img src={value.preview} alt="Preview" className="preview-image" />
                    <p className="file-name">{value.file.name}</p>
                  </div>
                )}
                {value?.file && !value.preview && (
                  <div className="file-info">
                    <p className="file-name">{value.file.name}</p>
                    <p className="file-size">
                      {(value.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
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
       <div className="form-header">
        <div className="logo-container">
        {formDetails.hasLogo && (
          <div className="form-logo-container">
            <img 
              src={`${baseUrl}/api/form/${formId}/image`}
              alt="Form Logo"
              className="form-logo"
              onError={(e) => {
                e.target.style.display = 'none'; // Hide if image fails to load
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
          <button type="submit" className="submit-btn">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default Forms;
