import React, { useState, useEffect } from "react";
import { FaCloudUploadAlt, FaEdit } from "react-icons/fa"; // Import icons
import "./FormInfoModal.css";
import { useTranslation } from "react-i18next";  

const FormInfoModal = ({ form, onClose, onUpdate }) => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const [formName, setFormName] = useState(form.formName);
  const [title, setTitle] = useState(form.title || "");
  const [description, setDescription] = useState(form.description || "");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(form.courseId || ""); // Ensure `_id` is stored
  const { t } = useTranslation(); 
  
  // New Checkboxes State
  const [isUsedForRussian, setIsUsedForRussian] = useState(form.isUsedForRussian || false);
  const [isUsedForRegistration, setIsUsedForRegistration] = useState(form.isUsedForRegistration || false);
  const [image, setImage] = useState(form.formLogo ? `${baseUrl}/api/form/${form._id}/image` : null);

  useEffect(() => {
    setImage(form.formLogo ? `${baseUrl}/api/form/${form._id}/image` : null);
  }, [form.formLogo]);

  useEffect(() => {
    // Fetch courses from API
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token"); // Assuming the token is stored in localStorage
        const response = await fetch(`${baseUrl}/api/courses`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
  
        if (!response.ok) throw new Error("Failed to fetch courses");
  
        const data = await response.json();
        setCourses(data); // Assuming data is an array of courses with `_id` and `name`
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
  
    fetchCourses();
  }, []);
  

  // Handle image selection
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle Save (Update Form)
  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let formLogo = form.image ? { // Maintain existing structure if no new image
        data: form.image.data,
        contentType: form.image.contentType
      } : null;
  
      // 🖼️ Upload Image (if changed)
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
  
        const response = await fetch(`${baseUrl}/api/form/${form._id}/upload`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData,
        });
  
        if (!response.ok) throw new Error("Failed to upload image");
        const data = await response.json();
        
        // Format the image data as formLogo object
        formLogo = {
          data: data.imageData, // Assuming backend returns base64 encoded data
          contentType: data.contentType // e.g., "image/png"
        };
      } else if (!image) {
        formLogo = null; // Clear image if removed
      }
  
      // 📝 Prepare updated form data
      const updatedForm = {
        formName,
        title,
        description,
        formLogo, // Use the formatted formLogo object
        courseId: selectedCourse || "",
        isUsedForRussian,
        isUsedForRegistration,
      };
  
      console.log("Sending Data:", updatedForm);
  
      // 🔄 Send Update Request
      const updateResponse = await fetch(`${baseUrl}/api/form/${form._id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedForm),
      });
  
      if (!updateResponse.ok) throw new Error("Failed to update form");
  
      const updatedData = await updateResponse.json();
      onUpdate(updatedData.form);
      onClose();
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Failed to update form. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="form-info-sidebar-overlay" onClick={onClose}>
      <div className="form-info-sidebar" onClick={(e) => e.stopPropagation()}>
        <span className="form-info-close-btn" onClick={onClose}>✖</span>
        <h2>{t("formInfoModel.formDetails")}</h2>
        <div className="form-info-content">

        {/* Image Upload */}
        <div 
          className="image-upload" 
          onMouseEnter={() => setHovered(true)} 
          onMouseLeave={() => setHovered(false)}
        >
          {image ? (
            <div className="image-preview">
              <img src={image} alt="Form" className="uploaded-image" />
              {hovered && (
                <div className="image-hover-overlay">
                  <label className="update-image-text">
                    <FaEdit className="update-icon" /> {t("formInfoModel.updateImage")}
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              )}
            </div>
          ) : (
            <label className="upload-placeholder">
              <FaCloudUploadAlt className="upload-icon" />
              <p>{t("formInfoModel.uploadImage")}</p>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        {/* Form Name Field */}
        <label className="input-label">{t("formInfoModel.formName")}</label>
        <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="form-input" />

        {/* Title Field */}
        <label className="input-label">{t("formInfoModel.title")}</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" />

        {/* Description Field */}
        <label className="input-label">{t("formInfoModel.description")}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="form-textarea" />

        {/* Course Selection Field */}
        <label className="input-label">{t("formInfoModel.assignTo")}</label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)} // Store `_id`
          className="form-select"
        >
          {selectedCourse ? (
            <>
              <option value={selectedCourse} disabled>
                {courses.find(course => course._id === selectedCourse)?.name || "Assigned Course"}
              </option>
              <option value="">{t("formInfoModel.removeCourse")}</option>
            </>
          ) : (
            <option value="">{t("formInfoModel.selectCourse")}</option>
          )}
          {courses
            .filter(course => course._id !== selectedCourse)
            .map(course => (
              <option key={course._id} value={course._id}>
                {course.name}
              </option>
            ))}
        </select>

        {/* New Checkboxes */}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isUsedForRussian}
            onChange={() => setIsUsedForRussian(!isUsedForRussian)}
          />
          {t("formInfoModel.isUsedForRussian")}
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isUsedForRegistration}
            onChange={() => setIsUsedForRegistration(!isUsedForRegistration)}
          />
          {t("formInfoModel.isUsedForRegistration")}
        </label>

        {/* Save Button */}
        <button className="save-btn" onClick={handleSave} disabled={loading}>
          {loading ? t("formInfoModel.saving") : t("formInfoModel.save")}
        </button>
        </div>
      </div>
    </div>
  );
};

export default FormInfoModal;
