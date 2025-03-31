import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./UserDetails.css";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";

// Translation file
const translations = {
  English: {
    personalDetails: "Personal Details",
    professionalDetails: "Professional Details",
    webinars: "Webinars",
    courses: "Courses",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    title: "Title",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    dob: "Date of Birth",
    country: "Country",
    gender: "Gender",
    university: "University",
    department: "Department",
    profession: "Profession",
    position: "Position",
    registeredAt: "Registered At",
    course: "Course",
    loading: "Loading...",
    noWebinars: "No webinars registered.",
    noCourses: "No courses available.",
    errorFetchingDetails: "Error fetching user details. Please try again.",
    noPermission: "You do not have permission to view or edit this page.",
  },
  Russian: {
    personalDetails: "Личные данные",
    professionalDetails: "Профессиональные данные",
    webinars: "Вебинары",
    courses: "Курсы",
    save: "Сохранить",
    cancel: "Отмена",
    edit: "Редактировать",
    title: "Заголовок",
    firstName: "Имя",
    middleName: "Отчество",
    lastName: "Фамилия",
    email: "Электронная почта",
    phone: "Телефон",
    dob: "Дата рождения",
    country: "Страна",
    gender: "Пол",
    university: "Университет",
    department: "Факультет",
    profession: "Профессия",
    position: "Должность",
    registeredAt: "Зарегистрировано в",
    course: "Курс",
    loading: "Загрузка...",
    noWebinars: "Нет зарегистрированных вебинаров.",
    noCourses: "Нет доступных курсов.",
    errorFetchingDetails:
      "Ошибка загрузки данных пользователя. Повторите попытку.",
    noPermission:
      "У вас нет прав на просмотр или редактирование этой страницы.",
  },
};

const UserDetails = ({ selectedLanguage = "English" }) => {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const { email } = useParams();
  const [userDetails, setUserDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUserDetails, setEditedUserDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webinarRegistrationTime, setWebinarRegistrationTime] = useState(null);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (role !== "admin") {
    return <div>{translations[selectedLanguage].noPermission}</div>;
  }

  // Fetch user details
  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/user/${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setUserDetails(data);
        setEditedUserDetails(data);
        setLoading(false);
        fetchWebinarDetails(data.webinar);
      } else {
        toast.error(translations[selectedLanguage].errorFetchingDetails);
        throw new Error(data.message || "Failed to fetch user details");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error(translations[selectedLanguage].errorFetchingDetails);
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchWebinarDetails = async (webinars) => {
    // Retrieve the token from localStorage
    const token = localStorage.getItem("token");

    // If no token is found, handle the error
    if (!token) {
      setError("Token not found. Please log in.");
      return;
    }

    for (const webinar of webinars) {
      try {
        const response = await fetch(`${baseUrl}/api/webinars/${webinar.id}`, {
          method: "GET", // HTTP method (default is GET)
          headers: {
            Authorization: `Bearer ${token}`, // Include token in the Authorization header
            "Content-Type": "application/json", // Ensure JSON response handling
          },
        });

        const data = await response.json(); // Parse the JSON response

        if (response.ok) {
          // Find participant by email and get the registration time
          const participant = data.participants.find(
            (participant) => participant.email === email
          );
          if (participant) {
            setWebinarRegistrationTime(participant["registered at"]);
          }
        } else {
          // Handle error if response is not ok
          throw new Error(data.message || "Failed to fetch webinar details");
        }
      } catch (error) {
        // Catch any errors that occur during the fetch operation
        console.error("Error fetching webinar details:", error);
        setError(error.message); // Update error state if any
      }
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [email]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    const changedData = {};
    Object.keys(editedUserDetails).forEach((key) => {
      if (editedUserDetails[key] !== userDetails[key]) {
        changedData[key] = editedUserDetails[key];
      }
    });

    if (Object.keys(changedData).length > 0) {
      try {
        const response = await fetch(`${baseUrl}/api/user/${email}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(changedData),
        });
        const data = await response.json();
        if (response.ok) {
          setIsEditing(false);
          fetchUserDetails();
          toast.success(translations[selectedLanguage].save);
        } else {
          throw new Error(data.message || "Failed to update user details");
        }
      } catch (error) {
        console.error("Error saving user details:", error);
        toast.error(translations[selectedLanguage].errorFetchingDetails);
        setError(error.message);
      }
    } else {
      setIsEditing(false);
      toast.info("No changes detected.");
    }
  };

  const handleCancel = () => {
    setEditedUserDetails(userDetails);
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    setEditedUserDetails({
      ...editedUserDetails,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="loading-text">
        {translations[selectedLanguage].loading}
      </div>
    );
  }

  if (error) {
    return <div className="error-text">{error}</div>;
  }

  return (
    <div user-details-container-page>
    <div className="user-details-container">
      <div className="user-details-navbar">
        <h1 className="user-details-title">
          {translations[selectedLanguage].personalDetails}
        </h1>
        {isEditing ? (
          <div className="user-details-buttons">
            <button className="save-changes-btn" onClick={handleSave}>
              {translations[selectedLanguage].save}
            </button>
            <button className="cancel-btn" onClick={handleCancel}>
              {translations[selectedLanguage].cancel}
            </button>
          </div>
        ) : (
          <button className="edit-btn" onClick={handleEdit}>
            {translations[selectedLanguage].edit}
          </button>
        )}
      </div>

      <div className="user-details-card">
        <div className="user-details-row">
          <div className="user-details-section">
            <h3>{translations[selectedLanguage].personalDetails}</h3>
            {[
              "title",
              "firstName",
              "middleName",
              "lastName",
              "email",
              "phone",
              "dob",
              "country",
              "gender",
            ].map((field) => (
              <div className="user-details-field" key={field}>
                <label>
                  {translations[selectedLanguage][field] ||
                    field.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  type={field === "dob" ? "date" : "text"}
                  name={field}
                  value={
                    isEditing ? editedUserDetails[field] : userDetails[field]
                  }
                  onChange={handleInputChange}
                  disabled={!isEditing || field === "email"}
                />
              </div>
            ))}
          </div>

          <div className="user-details-section">
            <h3>{translations[selectedLanguage].professionalDetails}</h3>
            {["university", "department", "profession", "position"].map(
              (field) => (
                <div className="user-details-field" key={field}>
                  <label>{translations[selectedLanguage][field]}</label>
                  <input
                    type="text"
                    name={field}
                    value={
                      isEditing ? editedUserDetails[field] : userDetails[field]
                    }
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              )
            )}
          </div>
        </div>

        <div className="user-details-row">
          <div className="user-details-section">
            <h3>{translations[selectedLanguage].webinars}</h3>
            {userDetails.webinar && userDetails.webinar.length > 0 ? (
              userDetails.webinar.map((webinar, index) => (
                <div key={index} className="webinar-card">
                  <p>
                    <strong>{translations[selectedLanguage].title}:</strong>{" "}
                    {webinar.title}
                  </p>
                  <p>
                    <strong>
                      {translations[selectedLanguage].registeredAt}:
                    </strong>{" "}
                    {webinarRegistrationTime
                      ? new Date(webinarRegistrationTime).toLocaleString()
                      : "Not Registered"}
                  </p>
                </div>
              ))
            ) : (
              <p>{translations[selectedLanguage].noWebinars}</p>
            )}
          </div>
        </div>
      </div>

      <ToastContainer />
      <div className="user-details-card user-delete-button">
        <button
          className="delete-user-btn"
          onClick={() => deleteUser(email)}
          disabled
        >
          Delete User
        </button>
      </div>
    </div>
    </div>
  );
};

export default UserDetails;

