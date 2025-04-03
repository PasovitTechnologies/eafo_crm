import React, { useState, useEffect } from "react";
import { FaCloudUploadAlt, FaEdit, FaTrash } from "react-icons/fa";
import "./FormInfoModal.css";
import { useTranslation } from "react-i18next";

const FormInfoModal = ({ form, onClose, onUpdate }) => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { t } = useTranslation();

  // Form state
  const [formName, setFormName] = useState(form.formName);
  const [title, setTitle] = useState(form.title || "");
  const [description, setDescription] = useState(form.description || "");
  const [selectedCourse, setSelectedCourse] = useState(form.courseId || "");
  const [isUsedForRussian, setIsUsedForRussian] = useState(form.isUsedForRussian || false);
  const [isUsedForRegistration, setIsUsedForRegistration] = useState(form.isUsedForRegistration || false);

  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [image, setImage] = useState(form.formLogo ? `${baseUrl}/api/form/${form._id}/image` : null);
  const [removeImage, setRemoveImage] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Data and loading state
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setImage(form.formLogo ? `${baseUrl}/api/form/${form._id}/image` : null);
  }, [form.formLogo, form._id]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl}/api/courses`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) throw new Error(t("errors.fetchCoursesFailed"));
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchCourses();
  }, [baseUrl, t]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate image
    if (!file.type.match('image.*')) {
      setError(t("errors.invalidImageType"));
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setError(t("errors.imageTooLarge"));
      return;
    }

    setError(null);
    setImageFile(file);
    setRemoveImage(false);
    
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(t("errors.unauthorized"));
  
      // Send DELETE request to remove image from backend
      const deleteResponse = await fetch(`${baseUrl}/api/form/${form._id}/image`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
  
      if (!deleteResponse.ok) throw new Error(t("errors.imageDeleteFailed"));
  
      // Update frontend state
      setImage(null);
      setImageFile(null);
      setRemoveImage(true);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(t("errors.unauthorized"));

      let formLogo = null;

      // Handle image operations
      if (!removeImage && imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        const uploadResponse = await fetch(`${baseUrl}/api/form/${form._id}/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        });

        if (!uploadResponse.ok) throw new Error(t("errors.imageUploadFailed"));
        const uploadData = await uploadResponse.json();
        formLogo = { data: uploadData.imageData, contentType: uploadData.contentType };
      } else if (!removeImage && form.formLogo) {
        // Keep existing image if not removed and no new image uploaded
        formLogo = form.formLogo;
      }

      const updatedForm = {
        formName,
        title,
        description,
        formLogo,
        courseId: selectedCourse,
        isUsedForRussian,
        isUsedForRegistration,
      };

      const updateResponse = await fetch(`${baseUrl}/api/form/${form._id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedForm),
      });

      if (!updateResponse.ok) throw new Error(t("errors.formUpdateFailed"));

      const updatedData = await updateResponse.json();
      onUpdate(updatedData.form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-info-sidebar-overlay" onClick={onClose}>
      <div className="form-info-sidebar" onClick={(e) => e.stopPropagation()}>
        <button className="form-info-close-btn" onClick={onClose} aria-label={t("common.close")}>
          ✖
        </button>
        
        <h2>{t("formInfoModel.formDetails")}</h2>
        
        {error && <div className="form-error-message">{error}</div>}

        <div className="form-info-content">
          {/* Image Upload Section */}
          <div 
            className="image-upload-container"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {image ? (
              <div className="image-preview-wrapper">
                <img 
                  src={image} 
                  alt={t("formInfoModel.formImageAlt")} 
                  className="uploaded-image" 
                />
                {hovered && (
                  <div className="image-actions-overlay">
                    <label className="image-action-button">
                      <FaEdit />
                      <span>{t("formInfoModel.updateImage")}</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="visually-hidden"
                      />
                    </label>
                    <button 
                      className="image-action-button delete-button"
                      onClick={handleRemoveImage}
                      aria-label={t("formInfoModel.removeImage")}
                    >
                      <FaTrash />
                      <span>{t("formInfoModel.removeImage")}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <label className="image-upload-prompt">
                <FaCloudUploadAlt className="upload-icon" />
                <span>{t("formInfoModel.uploadImage")}</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="visually-hidden"
                />
              </label>
            )}
          </div>

          {/* Form Fields */}
          <div className="form-field-group">
            <label htmlFor="form-name" className="form-field-label">
              {t("formInfoModel.formName")}
            </label>
            <input
              id="form-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="form-title" className="form-field-label">
              {t("formInfoModel.title")}
            </label>
            <input
              id="form-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="form-description" className="form-field-label">
              {t("formInfoModel.description")}
            </label>
            <textarea
              id="form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows="4"
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="form-course" className="form-field-label">
              {t("formInfoModel.assignTo")}
            </label>
            <select
              id="form-course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="form-select"
            >
              <option value="">{t("formInfoModel.selectCourse")}</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isUsedForRussian}
                onChange={() => setIsUsedForRussian(!isUsedForRussian)}
                className="checkbox-input"
              />
              <span>{t("formInfoModel.isUsedForRussian")}</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isUsedForRegistration}
                onChange={() => setIsUsedForRegistration(!isUsedForRegistration)}
                className="checkbox-input"
              />
              <span>{t("formInfoModel.isUsedForRegistration")}</span>
            </label>
          </div>

          <button 
            className="save-button" 
            onClick={handleSave} 
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? t("formInfoModel.saving") : t("formInfoModel.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormInfoModal;