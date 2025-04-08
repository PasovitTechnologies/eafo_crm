import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./CourseDetail.css";
import {
  FiArrowLeft,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Swal from "sweetalert2";

const CourseDetail = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const { t , i18n} = useTranslation();
  const currentLanguage = i18n.language;
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("items");
  const [forms, setForms] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [items, setItems] = useState([]);
  const [rules, setRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedForm, setSelectedForm] = useState("");
  const [conditions, setConditions] = useState([]);
  const [linkedItems, setLinkedItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    currency: "INR",
  });
  

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const token = localStorage.getItem("token"); // 🔒 Secure API request
  
      const response = await fetch(`${baseUrl}/api/courses/${courseId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch course details: ${errorText}`);
      }
  
      const data = await response.json();
  
      // ✅ Safely handle missing fields by providing default values
      setCourse(data || {});
      setForms(data.forms || []);    // Always fallback to an empty array
      setItems(data.items || []);    // Ensure items is an array
      setRules(data.rules || []);    // Ensure rules is an array
  
    } catch (error) {
      console.error("🚨 Error fetching course details:", error);
      setError(error.message);
      
      // ✅ Fallback to empty state in case of an error
      setCourse({});
      setForms([]);
      setItems([]);
      setRules([]);
    }
  };
  
  
  const fetchQuestions = async (formId) => {
    if (!formId) return;
  
    try {
      const token = localStorage.getItem("token"); // 🔒 Secure API request
  
      const response = await fetch(`${baseUrl}/api/form/${formId}/questions`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch questions: ${errorText}`);
      }
  
      const data = await response.json();
  
      // ✅ Prevent unnecessary state updates
      setQuestions((prev) => (JSON.stringify(prev) !== JSON.stringify(data) ? data : prev));
  
    } catch (error) {
      console.error("🚨 Error fetching questions:", error);
      setError(error.message);
    }
  };
  

  const addCondition = () => {
    setConditions([...conditions, { questionId: "", option: "", operator: "AND" }]);
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    setConditions(newConditions);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const saveRule = async () => {
  
    if (!selectedForm || !conditions.length) {
      toast.warn(t("courseDetail.selectFormAndCondition")); // Translation for warning
      return;
    }
  
    const method = editingRule ? "PUT" : "POST";
    const endpoint = editingRule
      ? `${baseUrl}/api/courses/${courseId}/rules/${editingRule._id}`
      : `${baseUrl}/api/courses/${courseId}/rules`;
  
    const ruleData = { formId: selectedForm, conditions, linkedItems };
  
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
  
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ruleData),
      });
  
      const responseData = await response.json().catch(() => null);
  
      if (!response.ok || !responseData) {
        throw new Error(
          responseData?.message || t(`courseDetail.${editingRule ? "updateError" : "addError"}`)
        );
      }
  
      toast.success(t(`courseDetail.${editingRule ? "updatedSuccess" : "addedSuccess"}`));
  
      resetRuleForm();
      setRules((prevRules = []) =>
        editingRule
          ? prevRules.map((rule) =>
              rule?._id === editingRule?._id ? responseData || {} : rule
            )
          : [...prevRules, responseData || {}]
      );
  
      fetchCourseDetails(); // Refresh course details
  
    } catch (error) {
      console.error("🚨 Error:", error);
      toast.error(error.message || t("courseDetail.errorOccurred"));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  

  const editRule = (rule) => {
    setEditingRule(rule);
    setSelectedForm(rule.formId);
    setConditions(rule.conditions);
    setLinkedItems(rule.linkedItems);
    fetchQuestions(rule.formId);
    setShowRuleForm(true);
  };

  const deleteRule = async (ruleId) => {
  
    const result = await Swal.fire({
      title: t("courseDetail.confirmTitle"),
      text: t("courseDetail.confirmText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("courseDetail.confirmButton"),
      cancelButtonText: t("courseDetail.cancelButton"),
    });
  
    if (!result.isConfirmed) return;
  
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
  
      const response = await fetch(
        `${baseUrl}/api/courses/${courseId}/rules/${ruleId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || t("courseDetail.errorText"));
      }
  
      Swal.fire(t("courseDetail.successTitle"), t("courseDetail.successText"), "success");
  
      setRules((prevRules) => prevRules.filter((rule) => rule._id !== ruleId));
    } catch (error) {
      console.error("🚨 Error deleting rule:", error);
      Swal.fire(t("courseDetail.errorTitle"), error.message || t("courseDetail.errorText"), "error");
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  

  const resetRuleForm = () => {
    setEditingRule(null);
    setSelectedForm("");
    setConditions([]);
    setLinkedItems([]);
    setShowRuleForm(false);
  };

  // Function to open the form for adding a new rule
  const openAddRuleForm = () => {
    resetRuleForm(); // Reset form before opening
    setShowRuleForm(true);
  };


  const handleSubmit = async () => {

    const isEditing = modalType === "editItem";
    const url = isEditing
      ? `/api/courses/${courseId}/items/${activeItem}`
      : `/api/courses/${courseId}/items`;
  
    try {
      setLoading(true);
  
      const response = await fetch(`${baseUrl}${url}`, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || t("courseDetail.requestError"));
      }
  
      const updatedItem = await response.json();
      fetchCourseDetails();
  
      // ✅ Update local state without full re-fetch
      setItems((prevItems) =>
        isEditing
          ? prevItems.map((item) => (item._id === activeItem ? updatedItem : item))
          : [...prevItems, updatedItem]
      );
  
      toast.success(t(`courseDetail.${isEditing ? "itemUpdated" : "itemAdded"}`));
      closeModal();
    } catch (error) {
      console.error("🚨 Error:", error);
      toast.error(error.message || t("courseDetail.requestFailed"));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  
  
 const handleDelete = async (itemId) => {

  const result = await Swal.fire({
    title: t("courseDetail.confirmTitle"),
    text: t("courseDetail.confirmDeleteItem"),
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: t("courseDetail.confirmYes"),
    cancelButtonText: t("courseDetail.confirmNo"),
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
  });

  if (!result.isConfirmed) return; // If user cancels, exit function

  try {
    setLoading(true);
    const response = await fetch(
      `${baseUrl}/api/courses/${courseId}/items/${itemId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || t("courseDetail.deleteFailed"));
    }

    // ✅ Remove item from state
    setItems((prevItems) => prevItems.filter((item) => item._id !== itemId));

    toast.success(t("courseDetail.itemDeleted"));
  } catch (error) {
    console.error("🚨 Error deleting item:", error);
    toast.error(error.message || t("courseDetail.deleteError"));
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
  


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };



  const openModal = (type, item = null) => {
    setModalType(type);
    setActiveItem(item?._id || null);
    setFormData({
      name: item ? item.name : "",
      amount: item ? item.amount : "",
      currency: item ? item.currency : "INR",
    });
  };

  const closeModal = () => {
    setModalType(null);
    setActiveItem(null);
    setFormData({ name: "", amount: "", currency: "INR" });
  };

  const handleGoBack = () => {
    navigate("/", { replace: true });
  };


  return (
    <div className="course-detail-page">
       <ToastContainer     className="custom-toast-container"/>
      <div className="course-details-header">
      <div className="go-back">
                  <FiArrowLeft
                    className="go-back-icon"
                    onClick={handleGoBack}
                  />
                </div>
      <h2 className="course-heading">{currentLanguage==="ru" ? course?.nameRussian:course?.name }</h2>
      </div>
      

      <div className="tab-menu">
        <button className={activeTab === "items" ? "active-tab" : ""} onClick={() => setActiveTab("items")}>
        {t("courseDetail.items")}
        </button>
        <button className={activeTab === "rules" ? "active-tab" : ""} onClick={() => setActiveTab("rules")}>
        {t("courseDetail.rules")}
        </button>
      </div>

      <div className="content-box">
  {/* Items Tab */}
  {activeTab === "items" ? (
    <div className="items-content">
      <h3>{t("courseDetail.items")}</h3>
      {course?.items?.length === 0 ? (
        <p>{t("courseDetail.noItems")}</p>
      ) : (
        course?.items?.map((item) => (
          <div key={item._id} className="item-card">
            <div className="item-card-content">
              <h4>{item.name}</h4>
              <p>{item.currency} {item.amount}</p>
            </div>
            <div className="item-card-actions">
              <button className="edit-btn" onClick={() => openModal("editItem", item)}>{t("courseDetail.edit")}</button>
              <button className="delete-btn" onClick={() => handleDelete(item._id)}>{t("courseDetail.delete")}</button>
            </div>
          </div>
        ))
      )}

      <button className="add-item-btn" onClick={() => openModal("addItem")}>
        + {t("courseDetail.addItem")}
      </button>
    </div>
  ) : null}

  {/* Rules Tab */}
  {activeTab === "rules" ? (
    <div className="rules-section">
      <h3>{t("courseDetail.rules")}</h3>
      {rules.length === 0 ? (
  <p>{t("courseDetail.noRules")}</p>
) : (
  rules.map((rule) => {
    const form = forms.find(f => f.formId === rule.formId);

    const ruleConditions = (rule?.conditions ?? [])
      .map((cond, index) => {
        const question = questions.find(q => q._id === cond?.questionId);
        return `${question ? question.label : t("courseDetail.unknownQuestion")} is "${cond?.option || ''}" (${cond?.operator || ''})`;
      })
      .join(" ");

    const linkedItemNames = (rule?.linkedItems ?? [])
      .map((itemId, index) => {
        const item = course?.items?.find(i => i._id === itemId);
        return item ? item.name : t("courseDetail.unknownItem");
      })
      .join(", ");

    return (
      <div key={rule._id || rule.formId || Math.random()} className="rule-box">  
        <div className="rule-box-content">
          <p><strong>{t("courseDetail.form")}:</strong> {form ? form.formName : t("courseDetail.unknownForm")}</p>
          <p><strong>{t("courseDetail.rule")}:</strong> {ruleConditions || t("courseDetail.noConditions")}</p>
          <p><strong>{t("courseDetail.items")}:</strong> {linkedItemNames || t("courseDetail.noLinkedItems")}</p>
        </div>
        <div className="rule-box-actions">
          <button className="edit-btn" onClick={() => editRule(rule)}>{t("courseDetail.edit")}</button>
          <button className="delete-btn" onClick={() => deleteRule(rule._id)}>{t("courseDetail.delete")}</button>
        </div>
      </div>
    );
  })
)}



      <button className="add-rule-button" onClick={openAddRuleForm}>+ {t("courseDetail.addRule")}</button>

      {/* Rule Form */}
      {showRuleForm && (
        <div className="rule-form-overlay" onClick={resetRuleForm}>
          <div className="rule-form" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={resetRuleForm}>✖</button>

            <h3>{editingRule ? t("courseDetail.editRule") : t("courseDetail.addNewRule")}</h3>

            {/* Form Selection */}
            <div className="item-model-form">
            <div className="custom-dropdown">
              <select
                value={selectedForm}
                onChange={(e) => {
                  setSelectedForm(e.target.value);
                  fetchQuestions(e.target.value);
                }}
              >
                <option value="">{t("courseDetail.selectForm")}</option>
                {forms.map((form) => (
                  <option key={form.formId} value={form.formId} title={form.formName}>
                    {form.formName}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditions */}
            {conditions.map((condition, index) => (
              <div key={index} className="condition-box">
                <div className="custom-dropdown">
                  <select
                    value={condition.questionId}
                    onChange={(e) => updateCondition(index, "questionId", e.target.value)}
                  >
                    <option value="">{t("courseDetail.selectQuestion")}</option>
                    {questions
                      .filter(q => q.isUsedForInvoice) // Only show questions where isUsedForInvoice is true
                      .map((q) => (
                        <option key={q._id} value={q._id} title={q.label}>
                          {q.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="custom-dropdown">
                  <select
                    value={condition.option}
                    onChange={(e) => updateCondition(index, "option", e.target.value)}
                  >
                    <option value="">{t("courseDetail.selectOption")}</option>
                    {(questions
                      .find(q => q._id === condition.questionId && q.isUsedForInvoice)?.options || []
                    ).map((opt, i) => (
                      <option key={i} value={opt} title={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="remove-btn" onClick={() => removeCondition(index)}>✖</button>
              </div>
            ))}

            <button className="add-condition-btn" onClick={addCondition}>+ {t("courseDetail.addCondition")}</button>

            {/* Select Items */}
            <h4 className="add-item-package">{t("courseDetail.selectItem")}:</h4>
            <div className="items-selection-box">
              {course?.items?.map((item) => (
                <label key={item._id}>
                  <input
                    className="select-package"
                    type="checkbox"
                    value={item._id}
                    checked={linkedItems.includes(item._id)}
                    onChange={(e) => {
                      setLinkedItems(prev =>
                        e.target.checked ? [...prev, item._id] : prev.filter(id => id !== item._id)
                      );
                    }}
                  />
                  {item.name}
                </label>
              ))}
            </div>

            <button className="submit-rule-btn" onClick={saveRule}>
              {editingRule ? t("courseDetail.updateRule") : t("courseDetail.saveRule")}
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null}

  {/* Modal for Adding/Editing Items */}
  {modalType && (
    <div className="modal-overlay">
      <div className="item-modal">
        <button className="item-modal-close" onClick={closeModal}>&times;</button>
        <h2 className="item-model-heading">{modalType === "editItem" ? t("courseDetail.modelEditItems") : t("courseDetail.modelAddItems")}</h2>
        <div className="item-form">
        <input 
          type="text" 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          placeholder={t("courseDetail.itemName")}
          required 
        />
        <input 
          type="number" 
          name="amount" 
          value={formData.amount} 
          onChange={handleChange} 
          placeholder={t("courseDetail.amount")}
          required 
        />
        <select name="currency" value={formData.currency} onChange={handleChange}>
          <option value="INR">INR</option>
          <option value="RUP">RUP</option>
        </select>
        </div>
        <button onClick={handleSubmit} className="item-form-save-btn">{t("courseDetail.save")}</button>
      </div>
    </div>
  )}
</div>


    </div>
  );
};

export default CourseDetail;
