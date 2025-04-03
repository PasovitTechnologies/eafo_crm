import React, { useState } from "react";
import { FiX, FiSend, FiPaperclip } from "react-icons/fi";
import "./EmailModal.css";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const EmailModal = ({ emailDetails, onClose }) => {
  const [formData, setFormData] = useState(emailDetails);
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState(null);
  const { t } = useTranslation();


   const notify = {
      success: (message) => toast.success(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: 'toast-notification',
        style: { color: '#ffffff' }
      }),
      error: (message) => toast.error(message, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: 'toast-notification',
        style: { color: '#ffffff' }
      }),
      info: (message) => toast.info(message, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: 'toast-notification',
        style: { color: '#ffffff' }
      })
    };

  // Handle input field changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Auto-hide after 3 sec
  };

  // Handle sending email
  const handleSend = async () => {
    setIsSending(true);

    const formDataToSend = new FormData();
    formDataToSend.append("recipients", JSON.stringify([{ email: formData.to }]));
    formDataToSend.append("mail", JSON.stringify({ subject: formData.subject, html: formData.body }));

    if (formData.attachment) {
      formDataToSend.append("attachment", formData.attachment);
    }

    try {
      const response = await fetch("http://localhost:4000/api/email/email-send", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        notify.error("Error");
        console.error(`❌ Server Error: ${errorText}`);
        showNotification(`❌ ${t("emailModal.sendError")}: ${errorText}`, "error");
      } else {
        const result = await response.json();
        console.log("✅ Email sent successfully:", result);
        notify.error("✅ Email sent successfully");
        onClose();
      }
    } catch (error) {
      console.error("❌ Error sending email:", error);
      showNotification("❌ " + t("emailModal.sendError"), "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <ToastContainer 
        style={{ color: '#ffffff' }}
        toastStyle={{ color: '#ffffff' }}
      />

      {/* Modal Background Overlay */}
      <div className="email-overlay" onClick={onClose}></div>

      {/* Email Modal */}
      <div className="email-popup">
        <div className="email-popup-header">
          <h3>{t("emailModal.sendEmail")}</h3>
          <FiX className="close-icon" onClick={onClose} />
        </div>

        <div className="email-form">
          {/* Recipient Input */}
          <input
            type="email"
            name="to"
            value={formData.to}
            onChange={handleChange}
            placeholder={t("emailModal.to")}
            disabled
          />

          {/* Subject Input */}
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder={t("emailModal.subject")}
          />

          {/* Email Body */}
          <textarea
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder={t("emailModal.message")}
          />

          {/* Footer Actions */}
          <div className="email-footer">
            {/* Attachment Upload */}
            <label className="attachment-label">
              <FiPaperclip />
              <input
                type="file"
                name="attachment"
                onChange={handleChange}
                style={{ display: "none" }}
              />
              {formData.attachment ? formData.attachment.name : t("emailModal.addAttachment")}
            </label>

            {/* Send Button */}
            <button
              onClick={handleSend}
              className={`send-btn ${isSending ? "loading" : ""}`}
              disabled={isSending}
            >
              {isSending ? t("emailModal.sending") : <><FiSend /> {t("emailModal.send")}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailModal;
