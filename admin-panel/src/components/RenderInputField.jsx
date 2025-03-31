// RenderInputField.js
import React from "react";
import Multiselect from "multiselect-react-dropdown";

const RenderInputField = ({ question, handleMultiSelectChange }) => {
  switch (question.type) {
    // 📂 Standard Input Types
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
          className="question-input"
          placeholder={`Enter ${question.label}`}
        />
      );

    // 📝 Text Area
    case "textarea":
      return (
        <textarea
          className="question-input"
          placeholder={`Enter ${question.label}`}
        />
      );

    // 📁 File Upload
    case "file":
      return <input type="file" className="question-input" />;

    // 📋 Dropdown Select
    case "select":
      return (
        <select className="question-input">
          <option>Select an option</option>
          {(question.options ?? []).map((opt, index) => (
            <option key={index} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    // 🔘 Radio & Checkbox
    case "radio":
    case "checkbox":
      return (
        <div className="question-options">
          {(question.options ?? []).map((opt, index) => (
            <label key={index}>
              <input
                type={question.type}
                name={`question-${question._id}`}
                value={opt}
              />
              {opt}
            </label>
          ))}
        </div>
      );

    // 🆕 Multi-Select as Checkboxes
    case "multi-select":
      return (
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
          className="multi-select-dropdown"
        />
      );

    // 🆕 📄 Content Type: Display Static HTML Content
    case "content":
      return (
        <div
          className="content-display"
          dangerouslySetInnerHTML={{ __html: question.content }}
        ></div>
      );

    // 🆕 📑 Accept Terms
    case "accept":
      return (
        <div className="accept-checkbox">
          <label htmlFor={`accept-${question._id}`}>
            <input type="checkbox" id={`accept-${question._id}`} />
            <span
              className="accept-label"
              dangerouslySetInnerHTML={{
                __html: `I accept the <a href="https://www.eafo.com" target="_blank"><b>terms and conditions</b></a> of EAFO.`,
              }}
            />
          </label>
        </div>
      );

    default:
      return <span>Unsupported question type</span>;
  }
};

export default RenderInputField;
