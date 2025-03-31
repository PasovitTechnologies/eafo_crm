import React from "react";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        <div className="dashboard-item profile">Profile</div>
        <div className="dashboard-item courses">Courses</div>
        <div className="dashboard-item webinars">Webinars</div>
        <div className="dashboard-item payments">Payments</div>
        <div className="dashboard-item about">About Us</div>
        <div className="dashboard-item contact">Contact Us</div>
      </div>
    </div>
  );
};

export default Dashboard;
