import React from "react";
import Multiselect from "multiselect-react-dropdown";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./QuestionsPreviewModal.css";

const RenderInputField = ({ question, handleMultiSelectChange }) => {
  switch (question.type) {
    case "text":
    case "email":
    case "number":
    case "date":
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
    
      case "name":
        const isRussian = question.isUsedForRussian;
        return (
          <div className="name-fields-wrapper">
            <div className="name-entry responsive-name-entry">
              {isRussian ? (
                <>
                  <div className="form-group">
                    <label>Фамилия<span className="required-star"> *</span></label>
                    <input type="text" className="question-input responsive-input" />
                  </div>
                  <div className="form-group">
                    <label>Имя<span className="required-star"> *</span></label>
                    <input type="text" className="question-input responsive-input" />
                  </div>
                  <div className="form-group">
                    <label>Отчество</label>
                    <input type="text" className="question-input responsive-input" />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>First Name<span className="required-star"> *</span></label>
                    <input type="text" className="question-input responsive-input" />
                  </div>
                  <div className="form-group">
                    <label>Middle Name</label>
                    <input type="text" className="question-input responsive-input" />
                  </div>
                  <div className="form-group">
                    <label>Last Name<span className="required-star"> *</span></label>
                    <input type="text" className="question-input responsive-input" />
                  </div>
                </>
              )}
            </div>
          </div>
        );
      
        case "phone":
          return (
            <PhoneInput
              country={"ru"}
              value={""} // No state binding in preview
              onChange={() => {}} // No-op in preview
              inputClass="custom-phone-input"
              containerClass="custom-phone-container"
              buttonClass="custom-flag-dropdown"
              inputProps={{
                name: `question-${question._id}`,
                required: false,
                disabled: true, // Since it's a preview
              }}
              disableDropdown={true}
            />
          );
        
    
    default:
      return <span className="unsupported-message">Unsupported question type</span>;
  }
};

export default RenderInputField;
