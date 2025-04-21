import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  MdSpaceDashboard,
  MdLogout,
  MdDescription,
  MdLibraryBooks,
  MdReceipt,
  MdSchool,
  MdWhatsapp,
  MdHelpOutline,
  MdPeople,
  MdSend
} from "react-icons/md";
import { useTranslation } from "react-i18next";
import "./Sidebar.css";

const Sidebar = ({ selectedOS, isSidebarOpen, setIsSidebarOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    const webinarNav = [
      {
        to: "/webinar-dashboard",
        icon: <MdSpaceDashboard className="sidebar-icon" />,
        label: t("sidebar.webinarDashboard"),
      },
      {
        to: "/webinar-management",
        icon: <MdDescription className="sidebar-icon" />,
        label: t("sidebar.webinarManagement"),
      },
    ];

    const crmNav = [
      {
        to: "/admin-dashboard",
        icon: <MdSpaceDashboard className="sidebar-icon" />,
        label: t("sidebar.dashboard"),
      },
      {
        to: "/course-entries",
        icon: <MdLibraryBooks className="sidebar-icon" />,
        label: t("sidebar.courseEntries"),
      },
      {
        to: "/invoice",
        icon: <MdReceipt className="sidebar-icon" />,
        label: t("sidebar.invoiceEntries"),
      },
      {
        to: "/course-manager",
        icon: <MdSchool className="sidebar-icon" />,
        label: t("sidebar.courseManager"),
      },
      {
        to: "/forms",
        icon: <MdDescription className="sidebar-icon" />,
        label: t("sidebar.forms"),
      },
      {
        to: "/whatsapp",
        icon: <MdWhatsapp className="sidebar-icon" />,
        label: t("sidebar.whatsapp"),
      },
      {
        to: "/telegram",
        icon: <MdSend className="sidebar-icon" />,
        label: t("sidebar.telegram"),
      },
      {
        to: "/enquiry",
        icon: <MdHelpOutline className="sidebar-icon" />,
        label: t("sidebar.enquiry"),
      },
      {
        to: "/userbase",
        icon: <MdPeople className="sidebar-icon" />,
        label: t("sidebar.userbase"),
      },
    ];

    setNavItems(selectedOS === "Webinar" ? webinarNav : crmNav);
  }, [selectedOS, t]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("lastVisitedPage");
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <aside
      className={`sidebar ${isSidebarOpen ? "open" : "hidden"}`}
    >
      <nav className="sidebar-menu">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={`sidebar-item ${location.pathname === to ? "active" : ""}`}
            aria-label={label}
            onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
          >
            {icon}
            <span className="sidebar-text">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-logout">
        <button
          className="sidebar-logout-btn"
          onClick={() => {
            handleLogout();
            setIsSidebarOpen(false);
          }}
          aria-label={t("sidebar.logout")}
        >
          <MdLogout className="sidebar-icon logout-icon" />
          <span className="sidebar-text">{t("sidebar.logout")}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
