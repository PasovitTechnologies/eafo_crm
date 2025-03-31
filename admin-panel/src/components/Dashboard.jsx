import React, { useState } from "react";
import "./Dashboard.css";
import { FaUser, FaBook, FaVideo, FaMoneyBillWave } from "react-icons/fa"; 
import { motion } from "framer-motion";   
import Users from "./DashboardGrids/Users";
import Courses from "./DashboardGrids/Courses";
import Webinars from "./DashboardGrids/Webinars";
import Payments from "./DashboardGrids/Payments";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("Users");
  const { t } = useTranslation();   // ✅ Translation hook

  const renderContent = () => {
    switch (activeTab) {
      case "Users":
        return <Users />;
      case "Courses":
        return <Courses />;
      case "Webinars":
        return <Webinars />;
      case "Payments":
        return <Payments />;
      default:
        return <Users />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* 🌟 Header and Navigation with Background Image */}
      <div className="header-nav-wrapper">
        <div className="top-nav-section">
          <div className="top-section">
            <img
              src="https://static.wixstatic.com/media/df6cc5_ad522873efd64c178950009bbbcf16a8~mv2.png"
              alt="Logo"
              className="logo bordered-logo"
            />

            {/* ✅ Animated Welcome Text */}
            <motion.h2
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="welcome-text"
            >
              {t('Dashboard.welcome')}
            </motion.h2>
          </div>

          {/* 🌟 Navigation */}
          <div className="nav-section">
            {[
              { name: "Users", icon: <FaUser /> },
              { name: "Courses", icon: <FaBook /> },
              { name: "Webinars", icon: <FaVideo /> },
              { name: "Payments", icon: <FaMoneyBillWave /> }
            ].map((tab) => (
              <button
                key={tab.name}
                className={`nav-button ${activeTab === tab.name ? "active" : ""}`}
                onClick={() => setActiveTab(tab.name)}
              >
                {tab.icon}                                       
                <span className="nav-label">{t(`Dashboard.${tab.name}`)}</span>   
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🌟 Content Section */}
      <div className="content-section">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
