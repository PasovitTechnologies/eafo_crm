// QuestionList.js
import React from "react";
import { FaEye, FaPlus, FaArrowUp, FaArrowDown } from "react-icons/fa";
import RenderInputField from "./RenderInputField";
import QuestionsPreviewModal from "./QuestionsPreviewModal";
import "./QuestionList.css";
import { useTranslation } from "react-i18next";



const QuestionList = ({
  activeTab = "questions",
  questions = [],
  setQuestions = () => {},
  openPreview = () => {},
  isPreviewOpen = false,
  closePreview = () => {},
  editQuestion = () => {},
  deleteQuestion = () => {},
  addQuestion = () => {},
  handleMultiSelectChange = () => {},
  saveQuestionOrder = () => {},
  formId
}) => {
  if (activeTab !== "questions") return null;


const { t , i18n} = useTranslation();
const currentLanguage=i18n.language;
console.log(currentLanguage)


// Utility function to handle safe swapping of array elements
const swapArrayElements = (array, index1, index2) => {
    const newArray = [...array];
    [newArray[index1], newArray[index2]] = [newArray[index2], newArray[index1]];
    return newArray;
};

const moveQuestionUp = (index) => {
    if (index === 0) return; // Prevent moving the first item up

    console.log("⬆️ Before Move Up:", questions.map((q) => ({ id: q._id, label: q.label })));

    // Create a new array with the updated order using the utility function
    const newQuestions = swapArrayElements(questions, index, index - 1);

    console.log("⬆️ After Move Up:", newQuestions.map((q) => ({ id: q._id, label: q.label })));

    // Update the state and save the new order
    setQuestions(newQuestions);
    saveQuestionOrder(newQuestions,formId);
};

// ⬇️ **Move Question Down**
const moveQuestionDown = (index) => {
    if (index === questions.length - 1) return; // Prevent moving the last item down

    console.log("⬇️ Before Move Down:", questions.map((q) => ({ id: q._id, label: q.label })));

    // Create a new array with the updated order using the utility function
    const newQuestions = swapArrayElements(questions, index, index + 1);

    console.log("⬇️ After Move Down:", newQuestions.map((q) => ({ id: q._id, label: q.label })));

    // Update the state and save the new order
    setQuestions(newQuestions);
    saveQuestionOrder(newQuestions,formId);
};



  return (
    <div className="question-list">
      {/* 👁️ Preview Button */}
      <div className="preview-button-container">
        <button className="preview-button" onClick={openPreview}>
          <FaEye style={{  fontSize: "18px" }} />
          {t('QuestionList.preview')}
        </button>
      </div>

      {/* 📝 Questions List */}
      <div className="questions-container">
        {questions.length > 0 ? (
          questions.map((q, index) => (
            <div key={q._id} className="question-item">

        <div>
            {/* 📋 Question Label and Type */}
            <span
              className="question-label"
              dangerouslySetInnerHTML={{
                __html: `${q.label} (${q.type})`,
              }}
            ></span>
      
            {/* 📝 Render Input Field */}
            <div className="question-input-wrapper">
              <RenderInputField
                question={q}
                handleMultiSelectChange={handleMultiSelectChange}
              />
            </div>
      
            {/* 🛠️ Action Buttons */}
            <div className="question-item-buttons">
              <button onClick={() => editQuestion(q)} className="edit-btn">
              {t('QuestionList.edit')}
              </button>
              <button
                onClick={() => deleteQuestion(q._id)}
                className="delete-btn"
              >
                {t('QuestionList.delete')}
              </button>
            </div>
            </div>
      
            {/* ⬆️⬇️ Move Up/Down Buttons in Top Right Corner */}
            <div className="move-buttons">
              <button
                className="move-btn move-up"
                onClick={() => moveQuestionUp(index)}
                disabled={index === 0}
                title={t('QuestionList.moveUp')}
              >
                <FaArrowUp />
              </button>
              <button
                className="move-btn move-down"
                onClick={() => moveQuestionDown(index)}
                disabled={index === questions.length - 1}
                title={t('QuestionList.moveDown')}
              >
                <FaArrowDown />
              </button>
            </div>
          </div>
          ))
        ) : (
          <p className="empty-message">
            {t('QuestionList.noQuestions')}
          </p>
        )}
      </div>

      {/* ➕ Add Question Button */}
      <button className="add-question-btn" onClick={addQuestion}>
        <FaPlus /> {t('QuestionList.addQuestion')}
      </button>

      {/* 🪟 Preview Modal */}
      {isPreviewOpen && (
        <QuestionsPreviewModal
          isOpen={isPreviewOpen}
          questions={questions}
          onClose={closePreview}
        />
      )}
    </div>
  );
};

export default QuestionList;
