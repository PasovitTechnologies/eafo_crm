import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './HelpPopup.css';

const HelpPopup = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('text');
  const { t } = useTranslation();

  return (
    <div className="help-popup">
      <div className="popup-container">
        <div className="popup-header">
          <h2>{t('auth.helpCenter')}</h2>
          <button className="help-close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="tab-container">
          <div className="tab-header">
            <div className="tab-buttons">
              <button 
                className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                {t('auth.guideText')}
              </button>
              <button 
                className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                {t('auth.guideVideo')}
              </button>
              <div className={`tab-slider ${activeTab === 'text' ? 'left' : 'right'}`} />
            </div>
          </div>

          <div className="tab-content">
            {activeTab === 'text' ? (
              <div className="text-guide">
                <h3>{t('auth.registrationGuide')}</h3>
                <ol>
                  <li>{t('auth.step1')}</li>
                  <li>{t('auth.step2')}</li>
                  <li>{t('auth.step3')}</li>
                  <li>{t('auth.step4')}</li>
                  <li>{t('auth.step5')}</li>
                </ol>
                <div className="support-info">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 16V12" stroke="#033672" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 8H12.01" stroke="#033672" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p>{t('auth.contactSupport')}</p>
                </div>
              </div>
            ) : (
              <div className="video-guide">
                <div className="video-container">
                  <iframe 
                    src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
                    title={t('auth.registrationVideo')}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="video-description">
                  <p>{t('auth.videoDescription')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPopup;