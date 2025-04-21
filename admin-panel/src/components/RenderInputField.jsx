import React from "react";
import Multiselect from "multiselect-react-dropdown";
import "./QuestionsPreviewModal.css";

const RenderInputField = ({ question, handleMultiSelectChange }) => {
  switch (question.type) {
    case "text":
    case "email":
    case "number":
    case "date":
    case "phone":
    case "country":
    case "category":
      return (
        <input
          type={question.type === "phone" ? "tel" : question.type}
          className="question-input responsive-input"
          placeholder={`Enter ${question.label}`}
        />
      );

    case "textarea":
      return (
        <textarea
          className="question-input responsive-input"
          placeholder={`Enter ${question.label}`}
        />
      );

    case "file":
      return <input type="file" className="question-input responsive-input" />;

    case "select":
      return (
        <select className="question-input responsive-input">
          <option>Select an option</option>
          {(question.options ?? []).map((opt, index) => (
            <option key={index} value={opt} className="responsive-option truncate-text">
              {opt}
            </option>
          ))}
        </select>
      );

    case "radio":
    case "checkbox":
      return (
        <div className="question-options responsive-options">
          {(question.options ?? []).map((opt, index) => (
            <label key={index} className="responsive-label responsive-option truncate-text">
              <input
                type={question.type}
                name={`question-${question._id}`}
                value={opt}
              />
              <span className="truncate-text">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "multi-select":
      return (
        <div className="responsive-input">
          <Multiselect
            isObject={false}
            options={question.options ?? []}
            onSelect={(selectedList) =>
              handleMultiSelectChange(selectedList, question._id)
            }
            onRemove={(selectedList) =>
              handleMultiSelectChange(selectedList, question._id)
            }
            placeholder={`Select ${question.label}`}
            showCheckbox={true}
            className="multi-select-dropdown truncate-text"
          />
        </div>
      );

    case "content":
      return (
        <div
          className="content-display responsive-content"
          dangerouslySetInnerHTML={{ __html: question.content }}
        ></div>
      );

    case "accept":
      return (
        <div className="accept-container">
          <label htmlFor={`accept-${question._id}`} className="accept-label responsive-label truncate-text">
            <input type="checkbox" id={`accept-${question._id}`} />
            <span
              className="accept-text responsive-option truncate-text"
              dangerouslySetInnerHTML={{
                __html: `I accept the <a href="https://www.eafo.com" target="_blank"><b>terms and conditions</b></a> of EAFO.`,
              }}
            />
          </label>
        </div>
      );

    default:
      return <span className="unsupported-message">Unsupported question type</span>;
  }
};

export default RenderInputField;
