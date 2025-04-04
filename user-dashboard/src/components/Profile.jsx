import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import { FaPen, FaRegSave } from "react-icons/fa"; // Edit & Save Icons
import i18nCountries from "i18n-iso-countries";
import enCountry from "i18n-iso-countries/langs/en.json";
import ruCountry from "i18n-iso-countries/langs/ru.json";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import "./Profile.css";
import { useTranslation } from "react-i18next";

// Register country languages
i18nCountries.registerLocale(enCountry);
i18nCountries.registerLocale(ruCountry);

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [image, setImage] = useState(null);
  const [hover, setHover] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en"); // Default English
  const userEmail = localStorage.getItem("email");
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    // Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/"); // Redirect to / if token is missing
    }
  }, [navigate]);

  useEffect(() => {
    if (location.state?.isEditMode) {
      setIsEditMode(true);
      // Reset state to avoid persistent edits if user navigates manually
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${baseUrl}/api/user/${userEmail}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch user data");

        const data = await response.json();

        // Set both `user` and `userDetails`
        setUser(data);
        setUserDetails(data);

        // Load profile image
        const imageResponse = await fetch(
          `${baseUrl}/api/user/image/${userEmail}`
        );
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const imageUrl = URL.createObjectURL(imageBlob);
          setImage(imageUrl);
        }
      } catch (err) {
        console.error("Error fetching user:", err.message);
      }
    };

    fetchUser();
  }, [userEmail]);

  const handleSaveChanges = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    if (!user || !userDetails) {
      console.error("User data is missing or not loaded.");
      return;
    }
  
    let updatedFields = {};
  
    // Compare function remains the same
    const compareFields = (original = {}, edited = {}, path = "") => {
      Object.keys(edited).forEach((key) => {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof edited[key] === "object" && edited[key] !== null) {
          compareFields(original[key] || {}, edited[key], fullPath);
        } else if (edited[key] !== original[key]) {
          updatedFields[fullPath] = edited[key];
        }
      });
    };
  
    compareFields(user.personalDetails || {}, userDetails.personalDetails || {}, "personalDetails");
    compareFields(user.professionalDetails || {}, userDetails.professionalDetails || {}, "professionalDetails");
  
    if (userDetails.email !== user.email) {
      delete updatedFields["email"];
    }
  
    if (Object.keys(updatedFields).length === 0) {
      setIsEditMode(false);
      return;
    }
  
    try {
      const response = await fetch(`${baseUrl}/api/user/update/${userEmail}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });
  
      if (!response.ok) throw new Error("Failed to update user data");
  
      const updatedData = await response.json();
  
      // Critical Fix: Update BOTH states with the complete updated data
      setUser(prev => ({
        ...prev,
        ...updatedData, // This ensures all fields are updated
        personalDetails: {
          ...prev.personalDetails,
          ...updatedData.personalDetails
        },
        professionalDetails: {
          ...prev.professionalDetails,
          ...updatedData.professionalDetails
        }
      }));
  
      setUserDetails(prev => ({
        ...prev,
        ...updatedData, // This ensures all fields are updated
        personalDetails: {
          ...prev.personalDetails,
          ...updatedData.personalDetails
        },
        professionalDetails: {
          ...prev.professionalDetails,
          ...updatedData.professionalDetails
        }
      }));
  
      setIsEditMode(false);
      toast.success(t("profile.updateSuccess"));
    } catch (err) {
      console.error("Error updating user:", err.message);
      toast.error(t("profile.updateError"));
    }
  };

  // Get country list based on selected language
  const getCountryOptions = () => {
    const countryNames = i18nCountries.getNames(selectedLanguage, {
      select: "official",
    });
    return Object.entries(countryNames).map(([code, name]) => ({
      value: code,
      label: name,
    }));
  };

  const genderOptions = {
    en: [
      { value: "Male", label: "Male" },
      { value: "Female", label: "Female" },
      { value: "Other", label: "Other" },
    ],
    ru: [
      { value: "Мужчина", label: "Мужчина" }, // Male in Russian
      { value: "Женщина", label: "Женщина" }, // Female in Russian
      { value: "Другое", label: "Другое" }, // Other in Russian
    ],
  };

  // Get title options based on user's dashboard language
  const titleOptions =
    userDetails?.dashboardLang === "ru"
      ? [
          { value: "Уважаемый", label: "Уважаемый" },
          { value: "Уважаемая", label: "Уважаемая" },
          { value: "Доктор.", label: "Доктор" },
          { value: "Профессор.", label: "Профессор" },
          { value: "Академик", label: "Академик" },
        ]
      : [
          { value: "Mr.", label: "Mr." },
          { value: "Ms.", label: "Ms." },
          { value: "Mrs.", label: "Mrs." },
          { value: "Dr.", label: "Dr." },
          { value: "Prof.", label: "Prof." },
        ];

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/api/user/upload/${userEmail}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");

      // Display the new image instantly
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
    } catch (err) {
      console.error("Error uploading image:", err.message);
    }
  };

  return (
    <div className="profile-page">
      <ToastContainer />
      <div className="profile-container">
        <div className="profile-grid">
          {/* Profile Header with Edit Button */}
          <div className="profile-header-div">
            {/* Profile Image */}
            <motion.div
              className="profile-image-wrapper"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onClick={() => fileInputRef.current.click()}
            >
              <img
                src={
                  image ||
                  "https://static.wixstatic.com/media/df6cc5_dc3fb9dd45a9412fb831f0b222387da1~mv2.jpg"
                }
                alt="Profile"
                className="profile-image"
                onError={(e) => {
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src =
                    "https://static.wixstatic.com/media/df6cc5_dc3fb9dd45a9412fb831f0b222387da1~mv2.jpg"; // Default image
                }}
              />

              {hover && (
                <div className="upload-overlay">{t("profile.uploadImage")}</div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImageUpload}
                accept="image/*"
              />
            </motion.div>

            {/* Name & Profession */}
            <div className="profile-name-profession">
              <h1 className="profile-name">
                {userDetails?.personalDetails &&
                  (userDetails.dashboardLang === "ru"
                    ? `${userDetails.personalDetails.title || ""} ${
                        userDetails.personalDetails.lastName || ""
                      } 
         ${userDetails.personalDetails.firstName || ""} 
         ${userDetails.personalDetails.middleName || ""}`
                    : `${userDetails.personalDetails.title || ""} 
         ${userDetails.personalDetails.firstName || ""} 
         ${userDetails.personalDetails.middleName || ""} 
         ${userDetails.personalDetails.lastName || ""}`
                  ).trim()}
              </h1>

              <h3 className="profile-profession">
                {userDetails?.professionalDetails?.university ||
                  "Not Available"}
              </h3>
            </div>

            {/* Edit & Save Button */}
            <div className="profile-edit-icon">
              {isEditMode ? (
                <button 
                className="save-button" 
                onClick={handleSaveChanges}
                disabled={isLoading}
              >
                {isLoading ? t("profile.saving") : t("profile.update")} <FaRegSave />
              </button>
              ) : (
                <button
                  className="edit-button"
                  onClick={() => setIsEditMode(true)}
                >
                  {t("profile.edit")} <FaPen />
                </button>
              )}
            </div>
          </div>

          {/* Name Edit Section - Only visible in edit mode */}
          {isEditMode && (
            <motion.div
              className="name-edit-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="section-subheading">{t("profile.editName")}</h3>
              <div className="name-edit-grid">
                <div className="profile-field">
                  <label>{t("profile.title")}</label>
                  {isEditMode ? (
                    <Select
                      options={titleOptions}
                      value={titleOptions.find(
                        (option) =>
                          option.value === userDetails?.personalDetails?.title
                      )}
                      onChange={(selectedOption) =>
                        setUserDetails({
                          ...userDetails,
                          personalDetails: {
                            ...userDetails.personalDetails,
                            title: selectedOption.value,
                          },
                        })
                      }
                      className="title-select"
                      classNamePrefix="react-select"
                      placeholder={t("profile.selectTitle")}
                      styles={{
                        menu: (provided) => ({
                          ...provided,
                          zIndex: 9999, // Very high z-index to ensure it appears above other elements
                        }),
                        control: (provided) => ({
                          ...provided,
                          zIndex: 999, // High z-index for the control itself
                        }),
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={userDetails?.personalDetails?.title || ""}
                      disabled
                      className="non-editable-input"
                    />
                  )}
                </div>
                <div className="profile-field">
                  <label>{t("profile.firstName")}</label>
                  <input
                    type="text"
                    value={userDetails?.personalDetails?.firstName || ""}
                    onChange={(e) =>
                      setUserDetails({
                        ...userDetails,
                        personalDetails: {
                          ...userDetails.personalDetails,
                          firstName: e.target.value,
                        },
                      })
                    }
                    className="editable-input"
                    placeholder={t("profile.firstNamePlaceholder")}
                  />
                </div>
                <div className="profile-field">
                  <label>{t("profile.middleName")}</label>
                  <input
                    type="text"
                    value={userDetails?.personalDetails?.middleName || ""}
                    onChange={(e) =>
                      setUserDetails({
                        ...userDetails,
                        personalDetails: {
                          ...userDetails.personalDetails,
                          middleName: e.target.value,
                        },
                      })
                    }
                    className="editable-input"
                    placeholder={t("profile.middleNamePlaceholder")}
                  />
                </div>
                <div className="profile-field">
                  <label>{t("profile.lastName")}</label>
                  <input
                    type="text"
                    value={userDetails?.personalDetails?.lastName || ""}
                    onChange={(e) =>
                      setUserDetails({
                        ...userDetails,
                        personalDetails: {
                          ...userDetails.personalDetails,
                          lastName: e.target.value,
                        },
                      })
                    }
                    className="editable-input"
                    placeholder={t("profile.lastNamePlaceholder")}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div className="details-div">
            <motion.div
              className="profile-section"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              <h2 className="section-heading">
                {t("profile.personalDetails")}
              </h2>
              <div className="profile-info-grid">
                {["email", "phone", "dob", "gender", "country"].map((field) => (
                  <div key={field} className="profile-field">
                    <label>{t(`profile.${field}`)}</label>

                    {/* Country Dropdown in Edit Mode */}
                    {field === "country" && isEditMode ? (
                      <Select
                        options={getCountryOptions()}
                        value={getCountryOptions().find(
                          (option) =>
                            option.label ===
                            userDetails?.personalDetails?.country
                        )}
                        onChange={(selectedOption) =>
                          setUserDetails({
                            ...userDetails,
                            personalDetails: {
                              ...userDetails.personalDetails,
                              country: selectedOption.label,
                            },
                          })
                        }
                      />
                    ) : field === "dob" ? (
                      isEditMode ? (
                        /* Date input when editing */
                        <input
                          type="date"
                          value={
                            userDetails?.personalDetails?.dob
                              ? new Date(userDetails.personalDetails.dob)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setUserDetails({
                              ...userDetails,
                              personalDetails: {
                                ...userDetails.personalDetails,
                                dob: e.target.value,
                              },
                            })
                          }
                          className="editable-input"
                        />
                      ) : (
                        /* Read-only Input for Non-Edit Mode */
                        <input
                          type="text"
                          value={
                            userDetails?.personalDetails?.dob
                              ? new Date(
                                  userDetails.personalDetails.dob
                                ).toLocaleDateString("en-GB") // Convert to dd-mm-yyyy
                              : "Not Available"
                          }
                          disabled
                          className="non-editable-input"
                        />
                      )
                    ) : field === "gender" && isEditMode ? (
                      /* Gender Dropdown in Edit Mode */
                      <select
                        value={userDetails?.personalDetails?.gender || ""}
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            personalDetails: {
                              ...userDetails.personalDetails,
                              gender: e.target.value,
                            },
                          })
                        }
                        className="editable-input"
                      >
                        {genderOptions[selectedLanguage].map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      /* Default Input for Other Fields */
                      <input
                        type="text"
                        value={
                          field === "email"
                            ? userDetails?.email || ""
                            : userDetails?.personalDetails?.[field] || ""
                        }
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            personalDetails: {
                              ...userDetails.personalDetails,
                              [field]: e.target.value,
                            },
                          })
                        }
                        disabled={field === "email" || !isEditMode} // Keep email readonly
                        className={
                          isEditMode ? "editable-input" : "non-editable-input"
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
            {/* Professional Details */}
            <motion.div
              className="profile-section"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              <h2 className="section-heading">
                {t("profile.professionalDetails")}
              </h2>
              <div className="profile-info-grid">
                {["university", "department", "profession", "position"].map(
                  (field) => (
                    <div key={field} className="profile-field">
                      <label>{t(`profile.${field}`)}</label>

                      <input
                        type="text"
                        value={userDetails?.professionalDetails?.[field] || ""}
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            professionalDetails: {
                              ...userDetails.professionalDetails,
                              [field]: e.target.value,
                            },
                          })
                        }
                        disabled={!isEditMode}
                        className={isEditMode ? "editable-input" : ""}
                      />
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
