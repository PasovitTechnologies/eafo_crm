import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import "./QuestionsPreviewModal.css";
import { Multiselect } from "multiselect-react-dropdown";

Modal.setAppElement("#root");

const QuestionsPreviewModal = ({ isOpen, questions, onClose }) => {
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (isOpen) {
      setVisibleQuestions(questions.filter((q) => !q.isConditional));
      setAnswers({});
    }
  }, [isOpen, questions]);

  const handleAnswerChange = (questionId, answer) => {
    const updatedAnswers = { ...answers, [questionId]: answer };
    setAnswers(updatedAnswers);

    const updatedVisibleQuestions = questions.filter((q) => {
      if (!q.isConditional) return true;

      const applicableRules = questions.flatMap((mainQ) =>
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

    setVisibleQuestions(updatedVisibleQuestions);
  };

  const renderInputField = (question) => {
    const value = answers[question._id] ?? (question.type === "accept" ? false : "");

    const commonWrapperStyles = {
      position: "relative",
      marginBottom: "1.5rem",
    };

    const placeholderStyles = {
      position: "absolute",
      top: "10px",
      left: "12px",
      color: "#888",
      pointerEvents: "none",
      zIndex: 1,
      fontSize: "0.95rem",
      marginTop: "10px"
    };

    const inputStyles = {
      width: "100%",
      padding: "12px",
      fontSize: "1rem",
      backgroundColor: "transparent",
      position: "relative",
      zIndex: 2,
      border: "1px solid #ccc",
      borderRadius: "4px",
    };

    switch (question.type) {
      case "text":
      case "email":
      case "number":
      case "phone":
        return (
          <div style={commonWrapperStyles}>
            {!value && (
              <div
                style={placeholderStyles}
                dangerouslySetInnerHTML={{ __html: question.label }}
              />
            )}
            <input
              type={question.type === "phone" ? "tel" : question.type}
              value={value}
              onChange={(e) =>
                handleAnswerChange(question._id, e.target.value)
              }
              style={inputStyles}
            />
          </div>
        );

      case "textarea":
        return (
          <div style={commonWrapperStyles}>
            {!value && (
              <div
                style={placeholderStyles}
                dangerouslySetInnerHTML={{ __html: question.label }}
              />
            )}
            <textarea
              value={value}
              onChange={(e) =>
                handleAnswerChange(question._id, e.target.value)
              }
              style={{ ...inputStyles, height: "120px" }}
            />
          </div>
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) =>
              handleAnswerChange(question._id, e.target.value)
            }
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
              <label key={index}>
                <input
                  type="radio"
                  name={`question-${question._id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) =>
                    handleAnswerChange(question._id, e.target.value)
                  }
                />
                <span dangerouslySetInnerHTML={{ __html: opt }} />
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="question-options">
            {(question.options ?? []).map((opt, index) => (
              <label key={index}>
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
                />
                <span dangerouslySetInnerHTML={{ __html: opt }} />
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
            onChange={(e) =>
              handleAnswerChange(question._id, e.target.value)
            }
          />
        );

      case "file":
        return (
          <input
            type="file"
            onChange={(e) =>
              handleAnswerChange(question._id, e.target.files[0])
            }
          />
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
    <div className="question-preview-page">
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <h2>Preview All Questions</h2>

        <div className="preview-questions-container">
          {visibleQuestions.map((question) => (
            <div key={question._id} className="modal-question">
              {question.type !== "accept" && question.type !== "content" && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <span
                    dangerouslySetInnerHTML={{ __html: question.label }}
                  />
                </div>
              )}
              <div className="question-input-wrapper">
                {renderInputField(question)}
              </div>
            </div>
          ))}

          {visibleQuestions.length === 0 && (
            <div className="no-questions-message">
              No questions available based on the rules.
            </div>
          )}
        </div>

        <div className="modal-controls">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default QuestionsPreviewModal;
