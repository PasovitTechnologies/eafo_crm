import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import "./RegistrationFormsViewer.css";

const RegistrationFormsViewer = ({ email, onClose, fullName }) => {
  const { t } = useTranslation();
  const [formsData, setFormsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const fetchRegistrationForms = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await fetch(`${baseUrl}/api/user/registration-forms/${email}`);
        const result = await response.json();
        setFormsData(result.registrationForms || []);
      } catch (error) {
        console.error("Error fetching forms:", error);
      } finally {
        setLoading(false);
      }
    };

    if (email) fetchRegistrationForms();
  }, [email]);

  const formatAnswer = (answer) => {
    if (Array.isArray(answer)) {
      return (
        <ol className="rfv-answer__list">
          {answer.map((item, idx) => (
            <li key={idx} className="rfv-answer__list-item">{item}</li>
          ))}
        </ol>
      );
    }
    return answer || t('registrationForms.notProvided');
  };

  return (
      <div className="rfv-modal__container">
        <div className="rfv-modal__header">
          <h2 className="rfv-modal__title">{t('registrationForms.title')}</h2>
          <button className="rfv-modal__close-btn" onClick={onClose}>
            <svg className="rfv-modal__close-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="rfv-user__info">
          <svg className="rfv-user__icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="user-div">
          <span className="rfv-user__email">{fullName}</span>
          <span className="rfv-user__email">({email})</span>
        </div>
        </div>

        {loading ? (
          <div className="rfv-loading__state">
            <div className="rfv-loading__spinner">
              <div className="rfv-loading__spinner-circle"></div>
            </div>
            <p className="rfv-loading__text">{t('registrationForms.loading')}</p>
          </div>
        ) : formsData.length === 0 ? (
          <div className="rfv-empty__state">
            <svg className="rfv-empty__icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3 className="rfv-empty__title">{t('registrationForms.noForms')}</h3>
            <p className="rfv-empty__description">{t('registrationForms.noFormsDescription')}</p>
          </div>
        ) : (
          <div className="rfv-forms__grid">
            {formsData.map((form, index) => (
              <div key={index} className="rfv-form__card">
                <div className="rfv-form__header">
                  <h3 className="rfv-form__name">{form.formName}</h3>
                  <span className="rfv-form__date">
                    {t('registrationForms.submittedOn')} {new Date(form.submission.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="rfv-form__content">
                  {form.submission.responses.map((res, i) => {
                    const question = form.questions.find(q => q._id === res.questionId);
                    const label = question?.label || `${t('registrationForms.question')} ${i + 1}`;
                    const questionNumber = i + 1;

                    return (
                      <div key={i} className="rfv-form__field">
                        <label className="rfv-form__label">
                          <span className="rfv-question__number">{questionNumber}.</span>
                          <span 
                            className="rfv-question__text"
                            dangerouslySetInnerHTML={{ __html: label }}
                          />
                        </label>
                        <div className="rfv-form__answer">
                          {formatAnswer(res.answer)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                
              </div>
            ))}
          </div>
        )}
      </div>
  );
};

export default RegistrationFormsViewer;