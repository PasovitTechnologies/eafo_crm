import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import "./QuestionsPreviewModal.css";
import { Multiselect } from "multiselect-react-dropdown";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

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

    setVisibleQuestions(updatedVisibleQuestions);
  };

  const renderInputField = (question) => {
    const value =
      answers[question._id] ?? (question.type === "accept" ? false : "");

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
      marginTop: "10px",
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
        return (
          <div style={commonWrapperStyles}>
            {!value && (
              <div
                style={placeholderStyles}
                dangerouslySetInnerHTML={{ __html: question.label }}
              />
            )}
            <input
              type={question.type}
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              style={inputStyles}
            />
          </div>
        );

      case "phone":
        return (
          <div style={commonWrapperStyles}>
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
              specialLabel=""
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
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              style={{ ...inputStyles, height: "120px" }}
            />
          </div>
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
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
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
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

      case "name":
        const nameValues = value || [
          { firstName: "", middleName: "", lastName: "" },
        ];
        const isRussian = question.isUsedForRussian;

        const updateNameField = (index, field, val) => {
          const updated = [...nameValues];
          updated[index][field] = val;
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
              <div
                key={index}
                className="name-entry-row"
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                {isRussian ? (
                  <>
                    <div style={{ flex: "1" }}>
                      <label>Фамилия *</label>
                      <input
                        type="text"
                        value={entry.lastName}
                        onChange={(e) =>
                          updateNameField(index, "lastName", e.target.value)
                        }
                      />
                    </div>
                    <div style={{ flex: "1" }}>
                      <label>Имя *</label>
                      <input
                        type="text"
                        value={entry.firstName}
                        onChange={(e) =>
                          updateNameField(index, "firstName", e.target.value)
                        }
                      />
                    </div>
                    <div style={{ flex: "1" }}>
                      <label>Отчество</label>
                      <input
                        type="text"
                        value={entry.middleName}
                        onChange={(e) =>
                          updateNameField(index, "middleName", e.target.value)
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ flex: "1" }}>
                      <label>First Name *</label>
                      <input
                        type="text"
                        value={entry.firstName}
                        onChange={(e) =>
                          updateNameField(index, "firstName", e.target.value)
                        }
                      />
                    </div>
                    <div style={{ flex: "1" }}>
                      <label>Middle Name</label>
                      <input
                        type="text"
                        value={entry.middleName}
                        onChange={(e) =>
                          updateNameField(index, "middleName", e.target.value)
                        }
                      />
                    </div>
                    <div style={{ flex: "1" }}>
                      <label>Last Name *</label>
                      <input
                        type="text"
                        value={entry.lastName}
                        onChange={(e) =>
                          updateNameField(index, "lastName", e.target.value)
                        }
                      />
                    </div>
                  </>
                )}
                {question.multipleNames && nameValues.length > 1 && (
                  <button type="button" onClick={() => removeNameEntry(index)}>
                    Remove
                  </button>
                )}
              </div>
            ))}

            {question.multipleNames && (
              <button type="button" onClick={addNameEntry}>
                Add Another Name
              </button>
            )}
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
                  <span dangerouslySetInnerHTML={{ __html: question.label }} />
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
          <button className="preview-close-btn" onClick={onClose}>
            X
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default QuestionsPreviewModal;
