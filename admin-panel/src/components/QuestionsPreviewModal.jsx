import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import "./QuestionsPreviewModal.css";
import { Multiselect } from "multiselect-react-dropdown"; // 🆕 Import MultiSelect Component

Modal.setAppElement("#root");

const QuestionsPreviewModal = ({ isOpen, questions, onClose }) => {
    const [visibleQuestions, setVisibleQuestions] = useState([]);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        if (isOpen) {
            // 🚦 Initialize with non-conditional questions
            setVisibleQuestions(questions.filter(q => !q.isConditional));
            setAnswers({});
        }
    }, [isOpen, questions]);

    // 🧠 Handle Answer Changes and Evaluate Conditional Logic
    const handleAnswerChange = (questionId, answer) => {
        const updatedAnswers = { ...answers, [questionId]: answer };
        setAnswers(updatedAnswers);

        // 🚦 Evaluate visible questions based on conditions and updated answers
        const updatedVisibleQuestions = questions.filter((q) => {
            if (!q.isConditional) return true;

            // 🔍 Find matching rules that target the current question
            const applicableRules = questions.flatMap((mainQ) =>
                mainQ.rules?.filter((rule) =>
                    rule.targetQuestionIds?.includes(q._id)
                ) ?? []
            );

            // 🚥 Evaluate if any of the applicable rules are met
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

    // 🎛 Render Input Fields based on Question Type
    // 🎛 Render Input Fields based on Question Type
const renderInputField = (question) => {
    const value = answers[question._id] ?? (question.type === "accept" ? false : "");
    switch (question.type) {
        // 📂 Standard Input Types
        case "text":
        case "email":
        case "number":
        case "phone":
            return (
                <input
                    type={question.type === "phone" ? "tel" : question.type}
                    value={value}
                    onChange={(e) =>
                        handleAnswerChange(question._id, e.target.value)
                    }
                    placeholder={`Enter ${question.label}`}
                />
            );

        // 📝 Text Area
        case "textarea":
            return (
                <textarea
                    value={value}
                    onChange={(e) =>
                        handleAnswerChange(question._id, e.target.value)
                    }
                    placeholder={`Enter ${question.label}`}
                />
            );

        // 📋 Dropdown Select
        case "select":
            return (
                <select
                    value={value}
                    onChange={(e) =>
                        handleAnswerChange(question._id, e.target.value)
                    }
                >
                    <option>Select an option</option>
                    {(question.options ?? []).map((opt, index) => (
                        <option key={index} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            );

        // 🔘 Radio Button Options
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
                                    handleAnswerChange(
                                        question._id,
                                        e.target.value
                                    )
                                }
                            />
                            {opt}
                        </label>
                    ))}
                </div>
            );

        // ☑️ Checkbox Options
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
                                        newValue.splice(
                                            newValue.indexOf(opt),
                                            1
                                        );
                                    }
                                    handleAnswerChange(question._id, newValue);
                                }}
                            />
                            {opt}
                        </label>
                    ))}
                </div>
            );

        // ✅ Multi-Select using Multiselect Component
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

        // 📅 Date Picker
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

        // 📁 File Upload
        case "file":
            return (
                <input
                    type="file"
                    onChange={(e) =>
                        handleAnswerChange(question._id, e.target.files[0])
                    }
                />
            );

        // 📄 Static Content Type
        case "content":
            return (
                <div
                    className="content-display"
                    dangerouslySetInnerHTML={{ __html: question.content }}
                ></div>
            );

        // ✅ 🆕 Accept Type with Checkbox
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

        // ❓ Unsupported Type Fallback
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
        
        {/* Only render the label for non-accept types */}
        {question.type !== "accept" && (
            <span
                dangerouslySetInnerHTML={{ __html: question.label }}
            ></span>
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
