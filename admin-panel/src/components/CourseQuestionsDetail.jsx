import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEdit, FaPlus, FaEye } from "react-icons/fa";
import "./CourseQuestionsDetail.css";
import { FiArrowLeft,   FiSearch, } from "react-icons/fi";
import RuleEditorModal from "./RuleEditorModal";
import QuestionModal from "./QuestionModal";
import QuestionList from "./QuestionList";
import { useTranslation } from "react-i18next";  


const CourseQuestionsDetail = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConditional, setIsConditional] = useState(false);
  const [activeTab, setActiveTab] = useState("questions"); // 🆕 State for tab management
  const [multiSelectValues, setMultiSelectValues] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;
 
  


  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    questions.forEach((q) => {});
  }, [questions]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("token"); // Retrieve token from localStorage
      const url = `${baseUrl}/api/form/${formId}/questions`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setQuestions(data);
      } else {
        console.error("Failed to fetch questions:", data.message);
      }
    } catch (error) {
      console.error("Error while fetching questions:", error);
    }
  };
  
  console.log(formId);
  
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token"); // Retrieve token
  
      // Fetch form details
      const formResponse = await fetch(`${baseUrl}/api/form/${formId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
  
      if (!formResponse.ok) throw new Error("Failed to fetch form data");
  
      const formData = await formResponse.json();
      setForm(formData); // Set the form data
  
      // Fetch questions inside this form
      setQuestions(formData.questions || []);
    } catch (error) {
      console.error("Error loading form data:", error);
      setErrorMessage(error.message);
    }
  };
  
  // ➕ Add Question
  const addQuestion = () => {
    setEditingQuestion({
      label: "",
      type: "text",
      isConditional: false,
      isRequired: false,
      isUsedForInvoice: false,
      options: [],
      rules: [],
    });
    setModalOpen(true);
    setIsOpen(true);
  };
  
  // ✏️ Edit Question
  const editQuestion = (question) => {
    setEditingQuestion({ ...question });
    setModalOpen(true);
    setIsOpen(true);
  };

  // 🚪 Close Modal
  const closeModal = () => {
    setModalOpen(false);
    setEditingQuestion(null);
    setIsOpen(true);
  };

  // ❌ Delete Question
  const deleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
  
    try {
      const token = localStorage.getItem("token"); // Retrieve token
  
      const response = await fetch(
        `${baseUrl}/api/form/${formId}/questions/${questionId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`, // Include authorization header
            "Content-Type": "application/json"
          }
        }
      );
  
      if (response.ok) {
        await fetchData();
        setErrorMessage(null);
      } else {
        console.error("Delete failed");
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      setErrorMessage(error.message);
    }
  };
  

  // ➕ Add Rule
  const addRule = () => {
    if (!selectedQuestionId) {
      alert("Please select a question to add rules.");
      return;
    }

    setEditingRule({
      action: "show", // Default action is "show"
      targetQuestionIds: [selectedQuestionId], // Initializes with the selected question as a target
      conditions: [
        {
          triggerQuestionId: "",
          condition: "",
          logic: "AND",
        },
      ],
    });

    setIsRuleModalOpen(true);
  };

  // 🆕 📝 Edit Rule
  const editRule = (rule, questionId) => {
    setSelectedQuestionId(questionId);
    setEditingRule({ ...rule });
    setIsRuleModalOpen(true);
  };

  const saveQuestion = async (question) => {
    try {
      const token = localStorage.getItem("token"); // Retrieve token
      const isUpdating = !!question._id;
      const method = isUpdating ? "PUT" : "POST";
      const url = isUpdating
        ? `${baseUrl}/api/form/${formId}/questions/${question._id}`
        : `${baseUrl}/api/form/${formId}/questions`;
  
      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`, // Include authorization header
          "Content-Type": "application/json"
        },
        body: JSON.stringify(question),
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        throw new Error(
          `Failed to ${isUpdating ? "update" : "save"} question: ${
            response.status
          } - ${responseData?.message || response.statusText}`
        );
      }
  
      console.log(
        `✅ Question ${isUpdating ? "updated" : "saved"} successfully:`,
        responseData
      );
  
      await fetchData(); // Refresh data
      closeModal();
      setErrorMessage(null);
  
      return responseData; // Return updated/saved question for potential state updates
    } catch (error) {
      console.error("🚨 Error saving/updating question:", error);
      setErrorMessage(error.message);
    }
  };
  

  // ✅ Define cancelEditRule properly
  const cancelEditRule = () => {
    setEditingRule(null); // Clears the editing state
    setIsRuleModalOpen(false); // Closes the modal if needed
  };

  const saveRule = async (rule) => {
    if (!selectedQuestionId) {
      alert("⚠️ Please select a question to save the rule.");
      return;
    }
  
    try {
      const token = localStorage.getItem("token"); // Retrieve token
      const baseUrl = `${baseUrl}/api/form/${formId}/questions/${selectedQuestionId}/rules`;
      const method = rule._id ? "PUT" : "POST";
      const endpoint = rule._id ? `${baseUrl}/${rule._id}` : baseUrl;
  
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`, // Include authorization header
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rule),
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        throw new Error(
          `Failed to ${rule._id ? "update" : "add"} rule: ${
            response.status
          } - ${responseData?.message || response.statusText}`
        );
      }
  
      console.log(
        `✅ Rule ${rule._id ? "updated" : "added"} successfully:`,
        responseData
      );
  
      // ✅ Only close the modal & reload questions after a successful request
      setIsRuleModalOpen(false);
      alert(`✅ Rule ${rule._id ? "updated" : "added"} successfully!`);
      await fetchQuestions(); // Reload fresh question data
      cancelEditRule(); // Close modal & reset rule state
  
      return responseData; // Return response in case you need it later
    } catch (error) {
      console.error("🚨 Error while saving rule:", error);
      alert(`❌ Error: ${error.message}`);
    }
  };
  
  // 🆕 ❌ Delete Rule
  const deleteRule = async (rule, questionId) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
  
    try {
      const token = localStorage.getItem("token"); // Retrieve token
      const response = await fetch(
        `${baseUrl}/api/form/${formId}/questions/${questionId}/rules/${rule._id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`, // Include authorization header
            "Content-Type": "application/json",
          },
        }
      );
  
      if (response.ok) {
        await fetchData();
      } else {
        console.error("Failed to delete rule.");
      }
    } catch (error) {
      console.error("Error while deleting rule:", error);
    }
  };
  

  const openPreview = () => setIsPreviewOpen(true);
  const closePreview = () => setIsPreviewOpen(false);

  const handleMultiSelectChange = useCallback((selectedList, questionId) => {
    setMultiSelectValues((prev) => ({
      ...prev,
      [questionId]: selectedList,
    }));
  }, []);

  const moveQuestion = useCallback((dragIndex, hoverIndex) => {
    setQuestions((prevQuestions) =>
      update(prevQuestions, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, prevQuestions[dragIndex]],
        ],
      })
    );
  }, []);

  // 📝 Inside saveQuestionOrder function
  const saveQuestionOrder = async (questions, courseId) => {
    if (!courseId) {
      console.error("🚨 courseId is undefined! Please provide a valid courseId.");
      return;
    }
  
    const url = `${baseUrl}/api/form/${formId}/questions`;
    const token = localStorage.getItem("token"); // Retrieve token
  
    console.log("🚀 API URL:", url);
    console.log("📤 Payload being sent:", questions);
  
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`, // Include authorization header
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions }), // Send entire questions array
      });
  
      if (!response.ok) {
        console.error(`🚨 Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error("🚨 Server Response:", errorText);
        throw new Error(`Failed to update questions: ${response.statusText}`);
      }
  
      const result = await response.json();
      console.log("✅ Backend response:", result);
    } catch (error) {
      console.error("🚨 Error saving question order:", error);
    }
  };
  

  const handleGoBack = () => {
    navigate("/forms", { replace: true });
  };

  const filteredQuestions = questions.filter((question) =>
    question.label?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  

  return (
    <div className="course-questions-manage-page">
      <div className="course-questions-manage-container">
        <div className="course-question-header">
          <div className="left-header">
          <div className="go-back">
            <FiArrowLeft className="go-back-icon" onClick={handleGoBack} />
          </div>
          <h2>{form?.formName} - {t('CourseQuestionsDetail.title')}</h2>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>
        <div className="right-header">
           <div className="question-search-container">
              {/* 🔍 Search Icon on Left */}
              <FiSearch className="form-search-icon" />
        
              {/* ✏️ Always Visible Search Input */}
              <input
                type="text"
                placeholder={t('CourseQuestionsDetail.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-search-input"
              />
            </div>
            </div>
        </div>

        

        <div className="course-question-manage-header">
          {/* 🆕 Tab Navigation */}
          <div className="tabs">
            <button
              className={activeTab === "questions" ? "active" : ""}
              onClick={() => setActiveTab("questions")}
            >
              {t('CourseQuestionsDetail.manageQuestions')}
            </button>
            <button
              className={activeTab === "rules" ? "active" : ""}
              onClick={() => setActiveTab("rules")}
            >
              {t('CourseQuestionsDetail.manageRules')}
            </button>
          </div>
        </div>
        <div className="course-question-manager-content">
          {/* QUESTIONS TAB */}
          {activeTab === "questions" && (
            <QuestionList
              activeTab={activeTab}
              questions={filteredQuestions}                setQuestions={setQuestions}
              openPreview={openPreview}
              isPreviewOpen={isPreviewOpen}
              closePreview={closePreview}
              editQuestion={editQuestion}
              deleteQuestion={deleteQuestion}
              addQuestion={addQuestion}
              saveQuestionOrder={saveQuestionOrder}
              handleMultiSelectChange={handleMultiSelectChange}
              formId={formId}
            />
          )}

          {/* RULES TAB */}
          {activeTab === "rules" && (
            <div className="rules-management-section">
              {/* Display All Existing Rules with Edit and Delete Options */}
              <div className="existing-rules-list" key={questions.length}>
                <h4>{t('CourseQuestionsDetail.existingRules')}</h4>
                {(questions ?? []).flatMap((question) =>
                  (question?.rules ?? []).map((rule) => (
                    <div key={rule._id} className="rule-item">
                      <p>
                        <strong>{t('CourseQuestionsDetail.rule')}:</strong> {t('CourseQuestionsDetail.when')}{" "}
                        {(rule.conditions ?? []).map((cond, index) => {
                          const triggerQuestion = questions.find(
                            (q) => q._id === cond.triggerQuestionId
                          );
                          return (
                            <span key={index}>
                              {index > 0 && ` ${cond.logic} `}
                              <strong>
                                {triggerQuestion ? (
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: triggerQuestion.label,
                                    }}
                                  ></span>
                                ) : (
                                  t('CourseQuestionsDetail.triggerNotSet')
                                )}
                              </strong>
                              {" is "}
                              <strong>
                                {cond.condition || t('CourseQuestionsDetail.noCondition')}
                              </strong>
                            </span>
                          );
                        })}
                        , <strong>{t('CourseQuestionsDetail.action')}:</strong> {rule.action ?? "No Action"}
                        <strong> {t('CourseQuestionsDetail.target')}:</strong>{" "}
                        {rule.targetQuestionIds?.length > 0
                          ? rule.targetQuestionIds.map((targetId, index) => {
                              const targetQuestion = questions.find(
                                (q) => q._id === targetId
                              );
                              return (
                                <span key={index}>
                                  {targetQuestion ? (
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: targetQuestion.label,
                                      }}
                                    ></span>
                                  ) : (
                                    t('CourseQuestionsDetail.noTargetSet')
                                  )}
                                  {index < rule.targetQuestionIds.length - 1 &&
                                    ", "}
                                </span>
                              );
                            })
                          : t('CourseQuestionsDetail.noTargetSet')}
                      </p>

                      <div className="rules-btn-container">
                        <button
                          className="edit-rule-btn"
                          onClick={() => editRule(rule, question._id)}
                        >
                          {t('CourseQuestionsDetail.edit')}
                        </button>
                        <button
                          className="remove-rule-btn"
                          onClick={() => deleteRule(rule, question._id)}
                        >
                          {t('CourseQuestionsDetail.delete')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Select the Question to Add/Edit Rules */}
              <select className="select-qns"
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
              >
                <option value="">{t('CourseQuestionsDetail.selectQuestion')}</option>
                {(questions ?? []).map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.label.replace(/<[^>]+>/g, "")} ({q.type})
                  </option>
                ))}
              </select>

              <button className="add-rule-btn" onClick={addRule}>
                <FaPlus /> {t('CourseQuestionsDetail.addRule')}
              </button>
            </div>
          )}

          {/* Modals */}
          {modalOpen && (
            <QuestionModal
              isOpen={isOpen}
              initialQuestion={editingQuestion}
              onSave={saveQuestion}
              onCancel={closeModal}
            />
          )}

          {isRuleModalOpen && (
            <RuleEditorModal
              questions={questions}
              initialRule={editingRule}
              onSave={saveRule}
              onCancel={() => setIsRuleModalOpen(false)}
              isOpen={isRuleModalOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseQuestionsDetail;
