import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ProfileItem from "./ProfileItem"; // Import the new component
import "./Dashboard.css";
import CoursesItem from "./CoursesItem";
import WebinarsItem from "./WebinarsItem";
import PaymentsItem from "./PaymentsItem";
import AboutItem from "./AboutItem";
import ContactItem from "./ContactItem";
import Loading from "./Loading";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const userEmail = localStorage.getItem("email");
  const [expandingSection, setExpandingSection] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);


  useEffect(() => {
    if (!userEmail) return; // ✅ Prevents unnecessary API calls
  
    const controller = new AbortController();
    const signal = controller.signal;
  
    const fetchUser = async () => {
      setLoading(true); // ✅ Ensure loading is set before fetching
  
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please log in.");
        setLoading(false);
        return;
      }
  
      try {
        const response = await fetch(`${baseUrl}/api/user/${userEmail}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal,
        });
  
        if (!response.ok) {
          if (response.status === 401) {
            setError("Session expired. Please log in again.");
            localStorage.removeItem("token"); // 🔐 Clear invalid token
          } else {
            throw new Error(`Failed to fetch user data: ${response.statusText}`);
          }
        } else {
          const data = await response.json();
          setUser(data);
        }
      } catch (err) {
        if (err.name === "AbortError") return; // ✅ Ignore request cancellation errors
        console.error("🚨 Error fetching user data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchUser();
  
    return () => controller.abort(); // Cleanup function to cancel the fetch on unmount
  }, [userEmail]);
  

  const handleSectionClick = (section, route) => {
    setExpandingSection(section);
    setTimeout(() => {
      navigate(route);
    }, 700);
  };

  if (loading) return <div className="loading"><Loading/></div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard-page">
      <motion.div className="dashboard-grid">
        {/* 🌟 Profile Section (Now a separate component) */}
        <ProfileItem
          user={user}
          selectedFile={selectedFile}
          expandingSection={expandingSection}
          setExpandingSection={setExpandingSection}
        />

        <CoursesItem
          expandingSection={expandingSection}
          setExpandingSection={setExpandingSection}
        />
        <WebinarsItem
          expandingSection={expandingSection}
          setExpandingSection={setExpandingSection}
        />
        <PaymentsItem
          expandingSection={expandingSection}
          setExpandingSection={setExpandingSection}
        />
        <AboutItem
          expandingSection={expandingSection}
          setExpandingSection={setExpandingSection}
        />
        <ContactItem
          expandingSection={expandingSection}
          setExpandingSection={setExpandingSection}
        />
      </motion.div>
    </div>
  );
};

export default Dashboard;
