import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import { FaPen, FaRegSave } from "react-icons/fa";
import { FiSearch, FiArrowLeft } from "react-icons/fi";
import i18nCountries from "i18n-iso-countries";
import enCountry from "i18n-iso-countries/langs/en.json";
import ruCountry from "i18n-iso-countries/langs/ru.json";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import enGB from "date-fns/locale/en-GB";
import ru from "date-fns/locale/ru";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import "./Profile.css";
import { useTranslation } from "react-i18next";
import HelpPopup from "./HelpPopup";
import ProfileHelp from "./HelpComponents/ProfileHelp";

// Register country languages and date locales
i18nCountries.registerLocale(enCountry);
i18nCountries.registerLocale(ruCountry);
registerLocale("en", enGB);
registerLocale("ru", ru);

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [image, setImage] = useState(null);
  const [hover, setHover] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const userEmail = localStorage.getItem("email");
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const currentLanguage = i18n.language;

  // Helper function to format phone numbers

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    if (phone.startsWith("+")) return phone;
    if (phone.startsWith("9")) return `+7${phone}`;
    return `+${phone}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (userDetails?.dashboardLang) {
      setSelectedLanguage(userDetails.dashboardLang);
    }
  }, [userDetails?.dashboardLang]);

  useEffect(() => {
    if (location.state?.isEditMode) {
      setIsEditMode(true);
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

        // Format phone number before setting state
        if (data?.personalDetails?.phone) {
          data.personalDetails.phone = formatPhoneNumber(
            data.personalDetails.phone
          );
        }

        setUser(data);
        setUserDetails(data);

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

    // Validate phone number format before saving
    if (
      userDetails?.personalDetails?.phone &&
      !userDetails.personalDetails.phone.startsWith("+")
    ) {
      toast.error(t("profile.invalidPhoneFormat"));
      return;
    }

    // Normalize DOB to ISO string before comparing
    let normalizedUserDetails = JSON.parse(JSON.stringify(userDetails)); // Deep clone
    if (
      normalizedUserDetails?.personalDetails?.dob &&
      normalizedUserDetails.personalDetails.dob instanceof Date
    ) {
      normalizedUserDetails.personalDetails.dob =
        normalizedUserDetails.personalDetails.dob.toISOString();
    }

    let updatedFields = {};

    const compareFields = (original = {}, edited = {}, path = "") => {
      Object.keys(edited).forEach((key) => {
        const fullPath = path ? `${path}.${key}` : key;
        if (
          typeof edited[key] === "object" &&
          edited[key] !== null &&
          !(edited[key] instanceof Date)
        ) {
          compareFields(original[key] || {}, edited[key], fullPath);
        } else if (edited[key] !== original?.[key]) {
          updatedFields[fullPath] = edited[key];
        }
      });
    };

    compareFields(
      user.personalDetails || {},
      normalizedUserDetails.personalDetails || {},
      "personalDetails"
    );
    compareFields(
      user.professionalDetails || {},
      normalizedUserDetails.professionalDetails || {},
      "professionalDetails"
    );

    if (normalizedUserDetails.email !== user.email) {
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

      setUser((prev) => ({
        ...prev,
        ...updatedData,
        personalDetails: {
          ...prev.personalDetails,
          ...updatedData.personalDetails,
        },
        professionalDetails: {
          ...prev.professionalDetails,
          ...updatedData.professionalDetails,
        },
      }));

      setUserDetails((prev) => ({
        ...prev,
        ...updatedData,
        personalDetails: {
          ...prev.personalDetails,
          ...updatedData.personalDetails,
        },
        professionalDetails: {
          ...prev.professionalDetails,
          ...updatedData.professionalDetails,
        },
      }));

      setIsEditMode(false);
      toast.success(t("profile.updateSuccess"));
    } catch (err) {
      console.error("Error updating user:", err.message);
      toast.error(t("profile.updateError"));
    }
  };

  const getCountryOptions = () => {
    const countryNames = i18nCountries.getNames(selectedLanguage, {
      select: "official",
    });
    return Object.entries(countryNames).map(([code, name]) => ({
      value: code,
      label: name,
    }));
  };

  const getGenderOptions = () => {
    return currentLanguage === "ru"
      ? [
          { value: "Мужчина", label: "Мужчина" },
          { value: "Женщина", label: "Женщина" },
          { value: "Другое", label: "Другое" },
        ]
      : [
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
          { value: "Other", label: "Other" },
        ];
  };

  const titleOptions =
    currentLanguage === "ru"
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

      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
    } catch (err) {
      console.error("Error uploading image:", err.message);
    }
  };

  const handleGoBack = () => {
    navigate("/dashboard", { replace: true });
  };

  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup);
  };

  return (
    <div className="profile-page">
      {showHelpPopup && <ProfileHelp onClose={toggleHelpPopup} />}

      <ToastContainer />
      <div className="go-back-div">
        <div className="go-back">
          <FiArrowLeft className="go-back-icon" onClick={handleGoBack} />
        </div>

        <button className="profile-help-button" onClick={toggleHelpPopup}>
          {t("profile.help")}
        </button>

        <div></div>
      </div>

      <div className="profile-container">
        <div className="profile-grid">
          {/* Profile Header with Edit Button */}
          <div className="profile-header-div">
            <div className="profile-edit-icon">
              {isEditMode ? (
                <button
                  className="save-button"
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                >
                  {isLoading ? t("profile.saving") : t("profile.update")}{" "}
                  <FaRegSave />
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
                  e.target.onerror = null;
                  e.target.src =
                    "https://static.wixstatic.com/media/df6cc5_dc3fb9dd45a9412fb831f0b222387da1~mv2.jpg";
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
                    ? `${userDetails.personalDetails.lastName || ""} 
         ${userDetails.personalDetails.firstName || ""} 
         ${userDetails.personalDetails.middleName || ""}`
                    : `${userDetails.personalDetails.firstName || ""} 
         ${userDetails.personalDetails.middleName || ""} 
         ${userDetails.personalDetails.lastName || ""}`
                  ).trim()}
              </h1>

              <h3 className="profile-profession">
                {userDetails?.professionalDetails?.university ||
                  t("profile.notAvailable")}
              </h3>
            </div>

            {/* Edit & Save Button */}
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
                        zIndex: 9999,
                      }),
                      control: (provided) => ({
                        ...provided,
                        zIndex: 999,
                      }),
                    }}
                  />
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

                    {field === "phone" && isEditMode ? (
                      <div className="input-box">
                        <PhoneInput
                          international
                          defaultCountry="RU"
                          value={userDetails?.personalDetails?.phone || ""}
                          onChange={(phone) =>
                            setUserDetails({
                              ...userDetails,
                              personalDetails: {
                                ...userDetails.personalDetails,
                                phone: phone,
                              },
                            })
                          }
                          className="phone-input"
                          placeholder={t("profile.phonePlaceholder")}
                        />
                      </div>
                    ) : field === "phone" ? (
                      <input
                        type="text"
                        value={
                          userDetails?.personalDetails?.phone
                            ? formatPhoneNumber(
                                userDetails.personalDetails.phone
                              )
                            : t("profile.notAvailable")
                        }
                        disabled
                        className="non-editable-input"
                      />
                    ) : field === "country" && isEditMode ? (
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
                        <DatePicker
                          selected={
                            userDetails?.personalDetails?.dob
                              ? new Date(userDetails.personalDetails.dob)
                              : null
                          }
                          onChange={(date) =>
                            setUserDetails({
                              ...userDetails,
                              personalDetails: {
                                ...userDetails.personalDetails,
                                dob: date,
                              },
                            })
                          }
                          dateFormat="dd/MM/yyyy"
                          locale={currentLanguage === "ru" ? ru : enGB}
                          className="editable-input"
                          placeholderText={t("profile.selectDate")}
                          showYearDropdown
                          dropdownMode="select"
                        />
                      ) : (
                        <input
                          type="text"
                          value={
                            userDetails?.personalDetails?.dob
                              ? new Date(
                                  userDetails.personalDetails.dob
                                ).toLocaleDateString(
                                  currentLanguage === "ru" ? "ru-RU" : "en-GB"
                                )
                              : t("profile.notAvailable")
                          }
                          disabled
                          className="non-editable-input"
                        />
                      )
                    ) : field === "gender" && isEditMode ? (
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
                        {getGenderOptions().map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
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
                        disabled={field === "email" || !isEditMode}
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
                        className={
                          isEditMode ? "editable-input" : "non-editable-input"
                        }
                        placeholder={t(`profile.${field}Placeholder`)}
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
