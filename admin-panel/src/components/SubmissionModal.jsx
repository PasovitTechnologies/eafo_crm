import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";  // 🌍 Import translation hook
import "./SubmissionModal.css";

const SubmissionModal = ({ submission, questions, onClose }) => {
    const { t } = useTranslation();  // 🌍 Initialize translation hook
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (submission) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [submission]);

    const handleClose = () => {
        setIsClosing(true); // Start slide-out animation
        setTimeout(() => {
            onClose(); // Close after animation completes
            setIsClosing(false);
        }, 400); // Match animation duration
    };

    if (!isVisible) return null; // Don't render if no submission is selected

    return (
        <div className={`submission-modal-overlay ${isClosing ? "hide" : "show"}`}>
            <div className="submission-modal-content">
                <button className="submission-modal-close" onClick={handleClose}>
                    ×
                </button>
                <h2>{t("submissionDetails.title")}</h2>

                <p><strong>{t("submissionDetails.id")}:</strong> {submission._id}</p>
                <p><strong>{t("submissionDetails.submittedAt")}:</strong> {new Date(submission.submittedAt).toLocaleString()}</p>

                <div className="submission-modal-table-container">
                    <table className="submission-modal-table">
                        <thead>
                            <tr>
                                <th>{t("submissionDetails.question")}</th>
                                <th>{t("submissionDetails.answer")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map(({ _id, label }) => {
                                const response = submission.responses.find((r) => r.questionId === _id);
                                
                                // ✅ Safely access the answer with nullish coalescing and fallback
                                const answer = response?.answer ?? t("submissionDetails.noResponse");

                                return (
                                    <tr key={_id}>
                                        <td dangerouslySetInnerHTML={{ __html: label }} />
                                        <td>{typeof answer === "boolean" ? answer.toString() : answer}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SubmissionModal;
