import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import FormEntries from "./components/FormEntries";
import Navbar from "./components/Navbar";
import AdminLogin from "./components/AdminLogin";
import SettingsButton from "./components/SettingsButton";
import WebinarManagement from "./webinarComponents/WebinarManagement";
import WebinarFormEntries from "./webinarComponents/WebinarFormEntries";
import WebinarDashboard from "./webinarComponents/webinarDashboard";
import WebinarParticipants from "./webinarComponents/WebinarParticipants";
import UserDetails from "./webinarComponents/UserDetails";
import FormDetails from "./components/FormDetails";
import CourseManager from "./components/CourseManager";
import CourseDetail from "./components/CourseDetail";
import CourseQuestions from "./components/CourseQuestions";
import CourseQuestionsDetail from "./components/CourseQuestionsDetail";
import CourseForms from "./components/CourseForms";
import InvoiceManager from "./components/InvoiceManager";
import InvoiceEntries from "./components/InvoiceEntries";
import CourseEntriesManager from "./components/CourseEntriesManager";
import CourseEntries from "./components/CourseEntries";
import WhatsApp from "./components/Whatsapp";
import Enquiry from "./components/Enquiry";
import './i18n'; // Import the i18n configuration
import UserDatabase from "./components/UserDatabase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UserDatabaseDetails from "./components/UserDatabaseDetails";
import Telegram from "./components/Telegram";



const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("ru");
  const [selectedOS, setSelectedOS] = useState("Webinar");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isTokenValid = () => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      return decoded.exp > Date.now() / 1000; // Check if token is still valid
    } catch {
      return false;
    }
  };

  // ✅ Authentication Verification
  const checkAuthentication = () => {
    const role = localStorage.getItem("role");
    if (isTokenValid() && role === "admin") {
      return true;
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      return false;
    }
  };

  // ✅ Handle Token Validation and Auto Logout
  useEffect(() => {
    setIsAuthenticated(checkAuthentication());

    const interval = setInterval(() => {
      if (!isTokenValid()) {
        setIsAuthenticated(false);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, []);




  // ✅ Sidebar Toggle
  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
      <div className="app-container">
        {isAuthenticated ? (
          <>
           <ToastContainer position="top-right" autoClose={3000} />
            {/* Navbar */}
            <Navbar
              handleSidebarToggle={handleSidebarToggle}
              isSidebarOpen={isSidebarOpen}
            />

            {/* Sidebar */}
            <Sidebar
              selectedLanguage={selectedLanguage}
              selectedOS={selectedOS}
              isSidebarOpen={isSidebarOpen}
              handleSidebarToggle={handleSidebarToggle}
            />

            <div className="main-section">
              <div className={`main-content ${isSidebarOpen ? "sidebar-open" : ""}`}>
                <Routes>
                  {/* Admin Routes */}
                  <Route
                    path="/admin-dashboard"
                    element={<Dashboard selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/course-entries"
                    element={<CourseEntriesManager selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/course-entries/:courseId"
                    element={<CourseEntries selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/forms/:formId/entries"
                    element={<FormEntries selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/details/:email"
                    element={<FormDetails selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/course-manager"
                    element={<CourseManager selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/course-manager/course/:courseId"
                    element={<CourseDetail selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/course-questions"
                    element={<CourseQuestions selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/forms/:formId/questions"
                    element={<CourseQuestionsDetail selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/webinar-forms"
                    element={<WebinarFormEntries selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/forms"
                    element={<CourseForms selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/invoice"
                    element={<InvoiceManager selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/whatsapp"
                    element={<WhatsApp selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/telegram"
                    element={<Telegram selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/invoice/invoice-manager/:courseId"
                    element={<InvoiceEntries selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/enquiry"
                    element={<Enquiry selectedLanguage={selectedLanguage} />}
                  />

                  <Route
                    path="/userbase"
                    element={<UserDatabase selectedLanguage={selectedLanguage} />}
                  />

<Route
                    path="/userbase/userbase-details/:email"
                    element={<UserDatabaseDetails selectedLanguage={selectedLanguage} />}
                  />

                  {/* Webinar Routes */}
                  <Route
                    path="/webinar-dashboard"
                    element={<WebinarDashboard selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/webinar-dashboard/:webinarId/webinar-participants"
                    element={<WebinarParticipants selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/webinar-management"
                    element={<WebinarManagement selectedLanguage={selectedLanguage} />}
                  />
                  <Route
                    path="/webinar-dashboard/:webinarId/webinar-participants/user-details/:email"
                    element={<UserDetails selectedLanguage={selectedLanguage} />}
                  />

                  

                  {/* Fallback Redirect */}
                  <Route path="*" element={<Navigate to="/admin-dashboard" />} />
                </Routes>
              </div>
            </div>

            <SettingsButton
            setSelectedLanguage={setSelectedLanguage}
            setSelectedOS={setSelectedOS}
          />
          </>
        ) : (
          <>
            {/* Unauthenticated Routes */}
            <Routes>
              <Route
                path="/"
                element={
                  <AdminLogin
                    setIsAuthenticated={setIsAuthenticated}
                    setSelectedLanguage={setSelectedLanguage}
                    selectedLanguage={selectedLanguage}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </>
        )}
      </div>
  );
};

export default App;
