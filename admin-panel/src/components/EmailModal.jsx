import React, { useState } from "react";
import { FiX, FiSend, FiPaperclip } from "react-icons/fi";
import "./EmailModal.css";
import { useTranslation } from "react-i18next";

const EmailModal = ({ emailDetails, onClose }) => {
  const [formData, setFormData] = useState(emailDetails);
  const [isSending, setIsSending] = useState(false);
  const { t } = useTranslation();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSend = async () => {
    setIsSending(true);

    const formDataToSend = new FormData();
    formDataToSend.append(
      "recipients",
      JSON.stringify([{ email: formData.to }])
    );
    formDataToSend.append(
      "mail",
      JSON.stringify({
        subject: formData.subject,
        html: formData.body,
      })
    );

    if (formData.attachment) {
      formDataToSend.append("attachment", formData.attachment);
    }

    try {
      const response = await fetch(
        "http://localhost:4000/api/email/email-send",
        {
          method: "POST",
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Server Error: ${errorText}`);
        alert(`Failed to send email: ${errorText}`);
        return;
      }

      const result = await response.json();
      console.log("✅ Email sent successfully:", result);
      alert("Email sent successfully!");
      onClose();
    } catch (error) {
      console.error("❌ Error sending email:", error);
      alert("An error occurred while sending the email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="email-overlay" onClick={onClose}></div>

      <div className="email-popup">
        <div className="email-popup-header">
          <h3>{t("emailModal.sendEmail")}</h3>
          <FiX className="close-icon" onClick={onClose} />
        </div>

        <div className="email-form">
          <input
            type="email"
            name="to"
            value={formData.to}
            onChange={handleChange}
            placeholder={t("emailModal.to")}
            disabled
          />
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder={t("emailModal.subject")}
          />
          <textarea
            name="body"
            value={formData.body}
            onChange={handleChange}
            placeholder={t("emailModal.message")}
          />

          <div className="email-footer">
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

            <button
              onClick={handleSend}
              className={`send-btn ${isSending ? "loading" : ""}`}
              disabled={isSending}
            >
              {isSending ? t("emailModal.sending")  : <><FiSend /> {t("emailModal.send")}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailModal;
