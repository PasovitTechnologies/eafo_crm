import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ProfileItem from "./ProfileItem";
import "./Dashboard.css";
import CoursesItem from "./CoursesItem";
import WebinarsItem from "./WebinarsItem";
import PaymentsItem from "./PaymentsItem";
import AboutItem from "./AboutItem";
import ContactItem from "./ContactItem";
import DocumentItem from "./DocumentItem";
import Navbar from "./Navbar";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandingSection, setExpandingSection] = useState(null);

  const navigate = useNavigate();
  const userEmail = localStorage.getItem("email");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
  
    if (!token || !email) {
      localStorage.clear(); // Clear in case one is present and the other is not
      navigate("/");
    }
  }, [navigate]);
  

  useEffect(() => {
    if (!userEmail) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const fetchData = fetch(`${baseUrl}/api/user/${userEmail}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        const [res] = await Promise.all([fetchData, delay(1000)]);

        if (!res.ok) {
          if (res.status === 401) {
            setError("Session expired. Please log in again.");
            localStorage.clear();
            navigate("/");
            return;
          } else if (res.status === 403) {
            setError("Access denied. Please log in again.");
            localStorage.clear();
            navigate("/");
            return;
          } else if (res.status === 404) {
            setError("User not found. Please register or use a valid account.");
            localStorage.clear();
            navigate("/");
            return;
          } else {
            throw new Error(`Failed to fetch user data: ${res.statusText}`);
          }
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("🚨 Error fetching user data:", err);
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    return () => controller.abort();
  }, [userEmail, navigate]);

  const handleSectionClick = (section, route) => {
    setExpandingSection(section);
    setTimeout(() => {
      navigate(route);
    }, 700);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-grid">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="dashboard-item loading-card">
              <div className="skeleton-avatar" />
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-page">
        <motion.div className="dashboard-grid">
          <ProfileItem
            user={user}
            selectedFile={selectedFile}
            expandingSection={expandingSection}
            setExpandingSection={setExpandingSection}
          />
          <DocumentItem
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
    </div>
  );
};

export default Dashboard;
