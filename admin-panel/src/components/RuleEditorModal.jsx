import React, { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import "./RuleEditorModal.css";
import { useTranslation } from "react-i18next";


const RuleEditorModal = ({ questions, initialRule, onSave, onCancel, isOpen }) => {
  const [editingRule, setEditingRule] = useState({
    action: "show",
    targetQuestionIds: [],
    conditions: [],
    ...(initialRule || {}),
  });

  const { t } = useTranslation();

  useEffect(() => {
    setEditingRule({
      action: "show",
      targetQuestionIds: [],
      conditions: [],
      ...(initialRule || {}),
    });
  }, [initialRule]);

  const updateRule = (changes) => {
    setEditingRule((prev) => ({ ...prev, ...changes }));
  };

  const addCondition = () => {
    const newCondition = { triggerQuestionId: "", condition: "", logic: "AND" };
    updateRule({ conditions: [...(editingRule.conditions ?? []), newCondition] });
  };

  const removeCondition = (index) => {
    const updatedConditions = editingRule.conditions.filter((_, i) => i !== index);
    updateRule({ conditions: updatedConditions });
  };

  const updateCondition = (index, field, value) => {
    const updatedConditions = editingRule.conditions.map((cond, i) =>
      i === index ? { ...cond, [field]: value } : cond
    );
    updateRule({ conditions: updatedConditions });
  };

  const addTargetQuestion = () => {
    updateRule({ targetQuestionIds: [...(editingRule.targetQuestionIds || []), ""] });
  };

  const removeTargetQuestion = (index) => {
    const updatedTargets = (editingRule.targetQuestionIds || []).filter((_, i) => i !== index);
    updateRule({ targetQuestionIds: updatedTargets });
  };

  const updateTargetQuestion = (index, value) => {
    const updatedTargets = (editingRule.targetQuestionIds || []).map((t, i) =>
      i === index ? value : t
    );
    updateRule({ targetQuestionIds: updatedTargets });
  };

  const handleSave = () => {
    if (!editingRule.conditions.length) {
      toast.warning(t("RuleEditorModal.addCondition"));
      return;
    }
  
    const hasUnsetConditions = editingRule.conditions.some(
      (cond) => !cond.triggerQuestionId || !cond.condition
    );
  
    if (hasUnsetConditions) {
      toast.warning(t("RuleEditorModal.completeConditions"));
      return;
    }
  
    if (!editingRule.targetQuestionIds.length) {
      toast.warning(t("RuleEditorModal.addTargetQuestion"));
      return;
    }
  
    const hasUnsetTargets = editingRule.targetQuestionIds.some((target) => !target);
  
    if (hasUnsetTargets) {
      toast.warning(t("RuleEditorModal.selectAllTargets"));
      return;
    }
  
    onSave(editingRule);
  };
  

  return (
    <div className={`rule-modal-overlay ${isOpen ? "open" : ""}`} onClick={onCancel}>
      <div
        className={`rule-modal-container ${isOpen ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="rule-form-close-icon" onClick={onCancel} aria-label="Close modal">
          <FaTimes />
        </button>

        <h3>{editingRule._id ? t('RuleEditorModal.editRule') : t('RuleEditorModal.addRule')}</h3>

        <div className="rule-modal-inner-container">
          <div style={{ paddingRight: "20px" }}>
            <h4>{t('RuleEditorModal.conditions')}</h4>
            {(editingRule.conditions ?? []).map((cond, index) => (
              <div key={index} className="condition-group">
                <div className="condition-item">
                  <select
                    className="select"
                    value={cond.triggerQuestionId || ""}
                    onChange={(e) => updateCondition(index, "triggerQuestionId", e.target.value)}
                  >
                    <option value="" disabled>{t('RuleEditorModal.selectTrigger')}</option>
                    {questions.map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.label.replace(/<[^>]+>/g, "")} ({q.type})
                      </option>
                    ))}
                  </select>

                  <select
                    value={cond.condition || ""}
                    onChange={(e) => updateCondition(index, "condition", e.target.value)}
                    disabled={!cond.triggerQuestionId}
                  >
                    <option value="" disabled>{t('RuleEditorModal.selectCondition')}</option>
                    {questions
                      .find((q) => q._id === cond.triggerQuestionId)
                      ?.options?.map((opt, idx) => (
                        <option key={idx} value={opt}>
                          {opt}
                        </option>
                      ))}
                  </select>

                  <button className="remove-option-btn" onClick={() => removeCondition(index)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}

            <button className="add-option-btn" onClick={addCondition}>
              <FaPlus /> {t('RuleEditorModal.addCondition')}
            </button>

            <div className="action-selector">
              <label>{t('RuleEditorModal.action')}:</label>
              <select
                value={editingRule.action || "show"}
                onChange={(e) => updateRule({ action: e.target.value })}
              >
                <option value="show">{t('RuleEditorModal.show')}</option>
                <option value="hide">{t('RuleEditorModal.hide')}</option>
              </select>
            </div>

            <div className="target-question-selector">
              <label>{t('RuleEditorModal.targetQuestions')}:</label>
              {(editingRule.targetQuestionIds || []).map((target, index) => (
                <div key={index} className="target-question-item">
                  <select
                    value={target || ""}
                    onChange={(e) => updateTargetQuestion(index, e.target.value)}
                  >
                    <option value="" disabled>{t('RuleEditorModal.selectTarget')}</option>
                    {questions.map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.label.replace(/<[^>]+>/g, "")} ({q.type})
                      </option>
                    ))}
                  </select>
                  <button
                    className="remove-option-btn"
                    onClick={() => removeTargetQuestion(index)}
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              <button className="add-target-btn" onClick={addTargetQuestion}>
                <FaPlus /> {t('RuleEditorModal.addTargetQuestion')}
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={handleSave} className="save-btn">
              <FaSave /> {editingRule._id ? t('RuleEditorModal.update') : t('RuleEditorModal.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleEditorModal;
