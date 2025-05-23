import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Document.css";

const Document = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    passport: null,
    motivation: null,
    resume: null,
    academicCertificates: null,
    certificatePdf: null,
    certificateLink: "",
    referral: "",
    institutionDocument: null,
  });

  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [filePreviews, setFilePreviews] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [languageCertOption, setLanguageCertOption] = useState("upload");
  const [loadingExistingFiles, setLoadingExistingFiles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileErrors, setFileErrors] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fileConfig = {
    passport: {
      accept: ".pdf,.jpg,.jpeg,.png",
      maxSize: 5 * 1024 * 1024,
      errorMessage: t("documentUpload.errors.fileType", {
        formats: ".pdf, .jpg, .jpeg, .png",
      }),
    },
    motivation: {
      accept: ".pdf,.doc,.docx",
      maxSize: 10 * 1024 * 1024,
      errorMessage: t("documentUpload.errors.fileType", {
        formats: ".pdf, .doc, .docx",
      }),
    },
    resume: {
      accept: ".pdf,.doc,.docx",
      maxSize: 10 * 1024 * 1024,
      errorMessage: t("documentUpload.errors.fileType", {
        formats: ".pdf, .doc, .docx",
      }),
    },
    academicCertificates: {
      accept: ".pdf,.jpg,.jpeg,.png",
      maxSize: 15 * 1024 * 1024,
      errorMessage: t("documentUpload.errors.fileType", {
        formats: ".pdf, .jpg, .jpeg, .png",
      }),
    },
    certificatePdf: {
      accept: ".pdf",
      maxSize: 5 * 1024 * 1024,
      errorMessage: t("documentUpload.errors.fileType", { formats: ".pdf" }),
    },
    institutionDocument: {
      accept: ".pdf,.jpg,.jpeg,.png",
      maxSize: 5 * 1024 * 1024,
      errorMessage: t("documentUpload.errors.fileType", {
        formats: ".pdf, .jpg, .jpeg, .png",
      }),
    },
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      const email = localStorage.getItem("email");
      const token = localStorage.getItem("token");
      if (!email || !token) return;

      try {
        const res = await fetch(`${baseUrl}/api/user/${email}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.documents) {
          setUploadedFiles(data.documents);
          if (data.referral) {
            setFormData((prev) => ({ ...prev, referral: data.referral }));
          }
        } else {
          console.error("Failed to fetch documents:", data.message);
        }
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoadingExistingFiles(false);
      }
    };

    const timer = setTimeout(() => {
      fetchDocuments();
    }, 1000);

    return () => clearTimeout(timer); // Cleanup on unmount
  }, [refreshTrigger]);

  const validateFile = (file, field) => {
    const config = fileConfig[field];
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const acceptedExtensions = config.accept.replace(/\./g, "").split(",");

    if (!acceptedExtensions.includes(fileExtension)) {
      setFileErrors((prev) => ({
        ...prev,
        [field]: t("documentUpload.errors.fileType", {
          formats: config.accept,
        }),
      }));
      return false;
    }

    if (file.size > config.maxSize) {
      const maxSizeMB = config.maxSize / (1024 * 1024);
      setFileErrors((prev) => ({
        ...prev,
        [field]: t("documentUpload.errors.fileSize", { size: maxSizeMB }),
      }));
      return false;
    }

    setFileErrors((prev) => ({ ...prev, [field]: null }));
    return true;
  };

  const handleFileChange = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!validateFile(file, field)) return;

    setFormData((prev) => ({ ...prev, [field]: file }));

    const previewURL = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : file.name;

    setFilePreviews((prev) => ({ ...prev, [field]: previewURL }));
    setUploadedFiles((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });

    // Auto-upload the file
    await uploadSingleFile(field, file);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const uploadSingleFile = async (field, file) => {
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    if (!email || !token) {
      toast.error("You must be logged in.");
      return;
    }

    const singleFormData = new FormData();
    singleFormData.append(field, file);

    try {
      const response = await fetch(`${baseUrl}/api/user/${email}/documents`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: singleFormData,
      });

      const result = await response.json();

      if (response.ok) {
        setRefreshTrigger((prev) => prev + 1);
        toast.success(t("documentUpload.actions.submit") + " успешно!");
      } else {
        toast.error(`${t("documentUpload.actions.submit")}: ${result.message}`);
      }
    } catch (error) {
      toast.error("Ошибка при загрузке файла.");
    }
  };

  const handleRemoveFile = (field) => {
    setFormData((prev) => ({ ...prev, [field]: null }));
    setFilePreviews((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
    setUploadedFiles((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
    setFileErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.passport && !uploadedFiles.passport) {
      setFileErrors((prev) => ({
        ...prev,
        passport: t("documentUpload.errors.required", {
          field: t("documentUpload.passport.label"),
        }),
      }));
      return;
    }

    setIsSubmitting(true);
    const email = localStorage.getItem("email");
    const token = localStorage.getItem("token");
    if (!email || !token) {
      toast.error("You must be logged in.");
      setIsSubmitting(false);
      return;
    }

    const formDataToSend = new FormData();
    const fileFields = [
      "passport",
      "motivation",
      "resume",
      "academicCertificates",
      "certificatePdf",
      "institutionDocument",
    ];
    fileFields.forEach((field) => {
      if (formData[field]) {
        formDataToSend.append(field, formData[field]);
      }
    });

    formDataToSend.append("certificateLink", formData.certificateLink);
    formDataToSend.append("referral", formData.referral);

    try {
      const response = await fetch(`${baseUrl}/api/user/${email}/documents`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        const res = await fetch(`${baseUrl}/api/user/${email}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.documents) {
          setUploadedFiles(data.documents);
          setFormData((prev) => ({
            ...prev,
            passport: null,
            motivation: null,
            resume: null,
            academicCertificates: null,
            certificatePdf: null,
            certificateLink: "",
            referral: data.referral || prev.referral,
          }));
          toast.success(t("documentUpload.actions.submit") + " успешно!");
        } else {
          toast.warning(
            t("documentUpload.actions.submit") +
              ", но не удалось обновить список."
          );
        }

        setFilePreviews({});
        setFileErrors({});
      } else {
        toast.error(t("documentUpload.actions.submit") + ": " + result.message);
      }
    } catch (err) {
      toast.error("Произошла ошибка при отправке формы.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFileSection = (
    field,
    labelKey,
    descriptionKey,
    required = false
  ) => {
    const config = fileConfig[field];
    return (
      <div className="file-upload-card">
        <div className="file-upload-header">
          <h3>
            {t(`documentUpload.${labelKey}`)}{" "}
            {required && <span className="required-asterisk">*</span>}
          </h3>
          {descriptionKey && (
            <p className="file-description">
              {t(`documentUpload.${descriptionKey}`)}
            </p>
          )}
        </div>

        <div className="file-upload-content">
          {fileErrors[field] && (
            <div className="file-error-message">
              <span>{fileErrors[field]}</span>
            </div>
          )}

          {uploadedFiles[field] ? (
            <div className="file-preview">
              <div className="file-info">
                <span className="file-name">
                  {uploadedFiles[field].fileName}
                </span>
                <div className="file-actions">
                  <a
                    href={`${baseUrl}/api/user/file/${uploadedFiles[field].fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-action-btn document-view-btn"
                  >
                    {t("documentUpload.actions.view")}
                  </a>
                  <a
                    href={`baseUrl}/api/user/file/${uploadedFiles[field].fileId}`}
                    download={uploadedFiles[field].fileName}
                    className="document-action-btn document-download-btn"
                  >
                    {t("documentUpload.actions.download")}
                  </a>
                  <button
                    type="button"
                    className="document-action-btn document-replace-btn"
                    onClick={() =>
                      document.getElementById(`${field}-input`).click()
                    }
                  >
                    {t("documentUpload.actions.replace")}
                  </button>
                </div>
              </div>
            </div>
          ) : filePreviews[field] ? (
            <div className="file-preview">
              <div className="file-info">
                <span className="file-name">{filePreviews[field]}</span>
                <div className="file-actions">
                  <button
                    type="button"
                    className="document-action-btn document-replace-btn"
                    onClick={() =>
                      document.getElementById(`${field}-input`).click()
                    }
                  >
                    {t("documentUpload.actions.replace")}
                  </button>
                  <button
                    type="button"
                    className="document-action-btn document-remove-btn"
                    onClick={() => handleRemoveFile(field)}
                  >
                    {t("documentUpload.actions.remove")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="file-upload-empty">
              <label htmlFor={`${field}-input`} className="upload-label">
                <span>{t("documentUpload.upload.prompt")}</span>
                <p className="file-requirements">
                  {t("documentUpload.upload.requirements", {
                    formats: config.accept
                      .replace(/\./g, "")
                      .replace(/,/g, ", "),
                  })}
                </p>
                <p className="file-requirements">
                  {t("documentUpload.upload.maxSize", {
                    size: config.maxSize / (1024 * 1024),
                  })}
                </p>
              </label>
            </div>
          )}
          <input
            id={`${field}-input`}
            type="file"
            accept={config.accept}
            onChange={(e) => handleFileChange(e, field)}
            style={{ display: "none" }}
            required={required && !uploadedFiles[field]}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="document-upload-container">
      <ToastContainer position="top-right" autoClose={4000} />
      <div className="document-upload-header">
        <h1>{t("documentUpload.title")}</h1>
        <p className="subtitle">{t("documentUpload.subtitle")}</p>
      </div>

      {loadingExistingFiles ? (
        <div className="document-details-skeleton">
          {/* Page Title */}
          <div className="skeleton-title shimmer" />
          <div className="skeleton-subtitle shimmer" />

          {/* Each document section skeleton */}
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-upload-card">
              <div className="skeleton-section-title shimmer" />
              <div className="skeleton-section-desc shimmer" />
              <div className="skeleton-file-box shimmer" />
            </div>
          ))}

          {/* Language certificate toggle */}
          <div className="skeleton-cert-toggle shimmer" />
          <div className="skeleton-file-box shimmer" />

          {/* Certificate Link input (if selected) */}
          <div className="skeleton-url-input shimmer" />

          {/* Referral input */}
          <div className="skeleton-referral-input shimmer" />

          {/* Submit Button */}
          <div className="skeleton-submit-button shimmer" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="document-upload-form">
          {renderFileSection(
            "passport",
            "passport.label",
            "passport.description",
            true
          )}
          {renderFileSection(
            "motivation",
            "motivation.label",
            "motivation.description"
          )}
          {renderFileSection("resume", "resume.label", "resume.description")}
          {renderFileSection(
            "academicCertificates",
            "academicCertificates.label",
            "academicCertificates.description"
          )}

          <div className="file-upload-card">
            <div className="file-upload-header">
              <h3>{t("documentUpload.languageProficiency.label")}</h3>
              <p className="file-description">
                {t("documentUpload.languageProficiency.description")}
              </p>
            </div>

            <div className="language-cert-options">
              <div
                className={`language-cert-option ${
                  languageCertOption === "upload" ? "active" : ""
                }`}
                onClick={() => setLanguageCertOption("upload")}
              >
                <label>
                  <input
                    type="radio"
                    name="languageCertOption"
                    value="upload"
                    checked={languageCertOption === "upload"}
                    onChange={() => {}}
                  />
                  {t("documentUpload.languageProficiency.uploadOption")}
                </label>
                <p className="option-description">
                  {t("documentUpload.languageProficiency.uploadDescription")}
                </p>
              </div>

              <div
                className={`language-cert-option ${
                  languageCertOption === "link" ? "active" : ""
                }`}
                onClick={() => setLanguageCertOption("link")}
              >
                <label>
                  <input
                    type="radio"
                    name="languageCertOption"
                    value="link"
                    checked={languageCertOption === "link"}
                    onChange={() => {}}
                  />
                  {t("documentUpload.languageProficiency.linkOption")}
                </label>
                <p className="option-description">
                  {t("documentUpload.languageProficiency.linkDescription")}
                </p>
              </div>
            </div>

            {languageCertOption === "upload" ? (
              renderFileSection("certificatePdf", "certificatePdf.label", null)
            ) : (
              <div className="url-input-container">
                <label htmlFor="certificateLink" className="url-input-label">
                  {t("documentUpload.languageProficiency.linkOption")}
                </label>
                <input
                  type="url"
                  id="certificateLink"
                  name="certificateLink"
                  placeholder="https://example.com/results"
                  value={formData.certificateLink}
                  onChange={handleInputChange}
                  className="url-input-field"
                  required={languageCertOption === "link"}
                />
              </div>
            )}
          </div>

          <div className="referral-section">
            <label htmlFor="referral" className="referral-label">
              {t("documentUpload.referral.label")}
            </label>
            <input
              type="text"
              id="referral"
              name="referral"
              value={formData.referral}
              onChange={handleInputChange}
              placeholder={t("documentUpload.referral.placeholder")}
              className="referral-input"
            />
            {uploadedFiles.referral && (
              <p className="saved-referral-note">
                {t("documentUpload.referral.savedNote", {
                  referral: uploadedFiles.referral,
                })}
              </p>
            )}
          </div>

          {renderFileSection(
            "institutionDocument",
            "institutionDocument.label",
            "institutionDocument.description"
          )}
        </form>
      )}
    </div>
  );
};

export default Document;
