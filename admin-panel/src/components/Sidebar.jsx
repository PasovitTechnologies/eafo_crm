import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  MdSpaceDashboard,
  MdSettings,
  MdLogout,
  MdDescription,
  MdLibraryBooks,
  MdReceipt,
  MdSchool,
  MdWhatsapp,
  MdHelpOutline,
  MdPeople
} from "react-icons/md";
import { useTranslation } from "react-i18next";  // 🌍 Import translation hook
import "./Sidebar.css";

const Sidebar = ({ selectedOS }) => {
  const { t } = useTranslation();  // 🌍 Initialize translation
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState([]);  // Store navigation items

  // Save last visited page
  useEffect(() => {
    localStorage.setItem("lastVisitedPage", location.pathname);
  }, [location.pathname]);

  // Navigate to last visited page
  useEffect(() => {
    const lastPage = localStorage.getItem("lastVisitedPage");
    if (lastPage) {
      navigate(lastPage);
    }
  }, [navigate]);

  // Update navigation items based on OS
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
      {
        to: "/webinar-settings",
        icon: <MdSettings className="sidebar-icon" />,
        label: t("sidebar.settings"),
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
        to: "/enquiry",
        icon: <MdHelpOutline className="sidebar-icon" />,
        label: t("sidebar.enquiry"),
      },
      {
        to: "/userbase",
        icon: <MdPeople className="sidebar-icon" />,
        label: t("sidebar.userbase"),
      }
    ];

    setNavItems(selectedOS === "Webinar" ? webinarNav : crmNav);
  }, [selectedOS, t]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("lastVisitedPage");
    
    // ✅ Navigate with "replace" to avoid going back to the protected page
    navigate("/", { replace: true });
    window.location.reload();
  };
  

  return (
    <aside
      className={`sidebar ${isSidebarOpen ? "expanded" : "collapsed"}`}
      onMouseEnter={() => setIsSidebarOpen(true)}
      onMouseLeave={() => setIsSidebarOpen(false)}
    >
      {/* Navigation Items */}
      <nav className="sidebar-menu">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={`sidebar-item ${
              location.pathname === to ? "active" : ""
            }`}
            aria-label={label}
            onClick={() => setIsSidebarOpen(false)}
          >
            {icon}
            <span className="sidebar-text">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="sidebar-logout">
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
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
