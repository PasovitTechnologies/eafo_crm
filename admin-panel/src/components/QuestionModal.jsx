import React, { useState, useEffect } from "react";
import "./QuestionModal.css";
import { Multiselect } from "multiselect-react-dropdown"; // ✅ MultiSelect Component
import { useTranslation } from "react-i18next";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";



const QuestionModal = ({ initialQuestion, onSave, onCancel, isOpen }) => {
  const [question, setQuestion] = useState(
    initialQuestion || {
      label: "",
      description: "",
      type: "text",
      isConditional: false,
      isUsedForInvoice: false,
      options: [],
      isRequired: false,
      multiple: false,
    }
  );

  const [isConditional, setIsConditional] = useState(false);
  const [isRequired, setIsRequired] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    setQuestion(
      initialQuestion || {
        label: "",
        description: "",
        type: "text",
        options: [],
        isConditional: false,
        isUsedForInvoice: false,
        isRequired: false,
      }
    );
    setIsConditional(initialQuestion?.isConditional || false);
    setIsRequired(initialQuestion?.isRequired || false);
  }, [initialQuestion]);

  const handleSave = () => {
    if (!question.label.trim()) {
      toast.error(t("QuestionModal.labelRequired"));
      return;
    }
  
    if (
      ["select", "radio", "checkbox", "multi-select"].includes(question.type) &&
      question.options.length === 0
    ) {
      toast.error(t("QuestionModal.optionsRequired"));
      return;
    }
  
    if (onSave) onSave(question);
  };

  const handleChange = (field, value) => {
    setQuestion((prev) => ({ ...prev, [field]: value }));
  };

  const applyFormatting = (format) => {
    const textarea = document.getElementById("labelTextarea");
    const { selectionStart, selectionEnd, value } = textarea;

    if (selectionStart === selectionEnd) return; // No text selected

    const selectedText = value.substring(selectionStart, selectionEnd);
    let formattedText = selectedText;

    switch (format) {
      case "bold":
        formattedText = `<b>${selectedText}</b>`;
        break;
      case "italic":
        formattedText = `<i>${selectedText}</i>`;
        break;
      case "bullet":
        formattedText = `<p>• ${selectedText}</p>`;
        break;
      case "link":
        const url = prompt("Enter the URL:", "https://");
        if (url) {
          formattedText = `<a href="${url}" target="_blank">${selectedText}</a>`;
        }
        break;
      default:
        break;
    }

    const updatedLabel =
      value.substring(0, selectionStart) +
      formattedText +
      value.substring(selectionEnd);

    handleChange("label", updatedLabel);
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setQuestion((prev) => ({
      ...prev,
      type: newType,
      options: ["select", "radio", "checkbox", "multi-select"].includes(newType)
        ? prev.options
        : [],
        ...(newType !== "file" && { multiple: false })
    }));
  };

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...question.options];
    updatedOptions[index] = value;
    setQuestion({ ...question, options: updatedOptions });
  };

  const addOption = () => {
    if (question.options.some((opt) => opt.trim() === "")) {
      toast.warning(t("FormEntries.fillExistingOptions"));
      return;
    }
    setQuestion({ ...question, options: [...question.options, ""] });
  };
  

  const removeOption = (index) => {
    const updatedOptions = question.options.filter((_, i) => i !== index);
    setQuestion({ ...question, options: updatedOptions });
  };

  return (
    <div className="question-model-page">
      <div className={`question-modal-container ${isOpen ? "open" : ""}`}>
      <div className="question-modal-content">
        <button
          className="question-model-close-btn"
          onClick={onCancel}
          aria-label="Close modal"
        >
          ✕
        </button>

        <h3>{question._id ? t('QuestionModel.editQuestion') : t('QuestionModel.addQuestion')}</h3>

        <div className="question-model-inner-container">
          <div className="label-editor">
            <div className="toolbar">
              <button onClick={() => applyFormatting("bold")}>
                <b>B</b>
              </button>
              <button onClick={() => applyFormatting("italic")}>
                <i>I</i>
              </button>
              <button onClick={() => applyFormatting("bullet")}>•</button>
              <button onClick={() => applyFormatting("link")}>
                🔗 Link
              </button>{" "}
              {/* ✅ New Link Button */}
            </div>

            <div
              className="label-preview"
              dangerouslySetInnerHTML={{ __html: question.label }}
            />

            <textarea
              id="labelTextarea"
              placeholder={t('QuestionModel.labelPlaceholder')}
              value={question.label}
              onChange={(e) => handleChange("label", e.target.value)}
            />

            <textarea
              id="description"
              placeholder={t('QuestionModel.descriptionPlaceholder')}
              value={question.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <select value={question.type} onChange={handleTypeChange}>
            <option value="text">Text</option>
            <option value="textarea">Text Area</option>
            <option value="select">Select</option>
            <option value="radio">Radio</option>
            <option value="checkbox">Checkbox</option>
            <option value="multi-select">Multi-Select</option>
            <option value="file">File Upload</option>
            <option value="date">Date</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="number">Number</option>
            <option value="content">Content</option>
            <option value="accept">Accept</option>
          </select>

          {["select", "radio", "checkbox", "multi-select"].includes(
            question.type
          ) && (
            <div>
              <h4>{t('QuestionModel.options')}</h4>
              {question.options.map((option, index) => (
                <div key={index} className="option-item">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    className="remove-option-btn"
                    onClick={() => removeOption(index)}
                  >
                    {t('QuestionModel.removeOption')}
                  </button>
                </div>
              ))}
              <button className="add-option-btn" onClick={addOption}>
              {t('QuestionModel.addOption')}
              </button>
            </div>
          )}

{question.type === "file" && (
            <div className="file-upload-settings">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={question.multiple}
                  onChange={(e) => handleChange("multiple", e.target.checked)}
                />
                <span>{t('QuestionModel.allowMultipleFiles')}</span>
              </label>
            </div>
          )}

          <div className="conditional-checkbox">
            <label>
              <input
                type="checkbox"
                checked={question.isRequired}
                onChange={(e) => handleChange("isRequired", e.target.checked)}
              />
              {t('QuestionModel.required')}
            </label>
          </div>

          <div className="conditional-checkbox">
            <label>
              <input
                type="checkbox"
                checked={question.isConditional}
                onChange={(e) =>
                  handleChange("isConditional", e.target.checked)
                }
              />
              {t('QuestionModel.conditional')}
            </label>
          </div>

          <div className="conditional-checkbox">
            <label>
              <input
                type="checkbox"
                checked={question.isUsedForInvoice}
                onChange={(e) =>
                  handleChange("isUsedForInvoice", e.target.checked)
                }
              />
              {t('QuestionModel.usedForInvoice')}
            </label>
          </div>

          <div className="modal-actions">
            <button className="save-btn" onClick={handleSave}>
            {t('QuestionModel.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
    
  );
};

export default QuestionModal;
