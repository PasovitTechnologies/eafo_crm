import React, { useState, useEffect , useRef } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import { FaPen, FaRegSave } from "react-icons/fa"; // Edit & Save Icons
import i18nCountries from "i18n-iso-countries";
import enCountry from "i18n-iso-countries/langs/en.json";
import ruCountry from "i18n-iso-countries/langs/ru.json";
import "./Profile.css";
import { useTranslation } from "react-i18next";

// Register country languages
i18nCountries.registerLocale(enCountry);
i18nCountries.registerLocale(ruCountry);

const Profile = () => {
  const [user, setUser] = useState(null);
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
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);

  useEffect(() => {
    if (location.state?.isEditMode) {
      setIsEditMode(true);
      // ✅ Reset state to avoid persistent edits if user navigates manually
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
        
        // ✅ Set both `user` and `userDetails`
        setUser(data);
        setUserDetails(data);
    
        // Load profile image
        const imageResponse = await fetch(`${baseUrl}/api/user/image/${userEmail}`);
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
  
    // ✅ Null safety check
    if (!user || !userDetails) {
      console.error("User data is missing or not loaded.");
      return;
    }
  
    let updatedFields = {};
  
    // ✅ Helper function to deeply compare fields with null checks
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
  
    // ✅ Compare fields with null checks
    compareFields(user.personalDetails || {}, userDetails.personalDetails || {}, "personalDetails");
    compareFields(user.professionalDetails || {}, userDetails.professionalDetails || {}, "professionalDetails");
  
    // ✅ Prevent updating immutable email field
    if (userDetails.email !== user.email) {
      console.log("Skipping immutable email field.");
      delete updatedFields["email"];
    }
  
    // ✅ Stop if no changes detected
    if (Object.keys(updatedFields).length === 0) {
      console.log("No changes detected.");
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
  
      // ✅ Proper merging to avoid null references
      setUser((prevUser) => ({
        ...prevUser,
        personalDetails: {
          ...prevUser.personalDetails,
          ...updatedFields.personalDetails,
        },
        professionalDetails: {
          ...prevUser.professionalDetails,
          ...updatedFields.professionalDetails,
        },
      }));
  
      setUserDetails((prevDetails) => ({
        ...prevDetails,
        personalDetails: {
          ...prevDetails.personalDetails,
          ...updatedFields.personalDetails,
        },
        professionalDetails: {
          ...prevDetails.professionalDetails,
          ...updatedFields.professionalDetails,
        },
      }));
  
      setIsEditMode(false);
      console.log("User details updated successfully.");
    } catch (err) {
      console.error("Error updating user:", err.message);
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
      <div className="profile-container">
        <div className="profile-grid">
          {/* 🌟 Profile Header with Edit Button */}

          
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
                src={image || "https://via.placeholder.com/150"}
                alt="Profile"
                className="profile-image"
              />
              {hover && <div className="upload-overlay">{t("profile.uploadImage")}</div>}
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
                {userDetails?.personalDetails?.title}{" "}
                {userDetails?.personalDetails?.firstName}{" "}
                {userDetails?.personalDetails?.middleName}{" "}
                {userDetails?.personalDetails?.lastName}
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
                  onClick={handleSaveChanges} // ✅ Save button now works properly
                >
                  {t("profile.update")} <FaRegSave />
                </button>
              ) : (
                <button
                  className="edit-button"
                  onClick={() => setIsEditMode(true)} // ✅ Clicking Edit enables edit mode
                >
                  {t("profile.edit")} <FaPen />
                </button>
              )}
            </div>
          </div>

          <div className="details-div">
            <motion.div
              className="profile-section"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              <h2 className="section-heading">{t("profile.personalDetails")}</h2>
              <div className="profile-info-grid">
                {["email", "phone", "dob", "gender", "country"].map((field) => (
                  <div key={field} className="profile-field">
                    <label>{t(`profile.${field}`)}</label>

                    {/* ✅ Country Dropdown in Edit Mode */}
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
                        /* ✅ Date input when editing */
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
                        /* ✅ Read-only Input for Non-Edit Mode */
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
                      /* ✅ Gender Dropdown in Edit Mode */
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
                      /* ✅ Default Input for Other Fields */
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
            {/* 🌟 Personal Details */}
            {/* 🌟 Professional Details */}
            <motion.div
              className="profile-section"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              <h2 className="section-heading">{t('profile.professionalDetails')}</h2>
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
          {/* 🌟 Professional Details */}
        </div>
      </div>
    </div>
  );
};

export default Profile;
