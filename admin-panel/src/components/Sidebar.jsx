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
  MdSend,
  MdNotificationsActive
} from "react-icons/md";
import { BiSolidOffer } from "react-icons/bi";
import { IoBookSharp } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import "./Sidebar.css";

const Sidebar = ({ selectedOS, isSidebarOpen, setIsSidebarOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [navItems, setNavItems] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isHovered, setIsHovered] = useState(false);

  // Track screen resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("lastVisitedPage", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const lastPage = localStorage.getItem("lastVisitedPage");
    if (lastPage) navigate(lastPage);
  }, [navigate]);

  useEffect(() => {
    const webinarNav = [
      { to: "/webinar-dashboard", icon: <MdSpaceDashboard />, label: t("sidebar.webinarDashboard") },
      { to: "/webinar-management", icon: <MdDescription />, label: t("sidebar.webinarManagement") },
    ];

    const crmNav = [
      { to: "/admin-dashboard", icon: <MdSpaceDashboard />, label: t("sidebar.dashboard") },
      { to: "/course-entries", icon: <MdLibraryBooks />, label: t("sidebar.courseEntries") },
      { to: "/invoice", icon: <MdReceipt />, label: t("sidebar.invoiceEntries") },
      { to: "/course-manager", icon: <MdSchool />, label: t("sidebar.courseManager") },
      { to: "/forms", icon: <MdDescription />, label: t("sidebar.forms") },
      { to: "/whatsapp", icon: <MdWhatsapp />, label: t("sidebar.whatsapp") },
      { to: "/telegram", icon: <MdSend />, label: t("sidebar.telegram") },
      { to: "/enquiry", icon: <MdHelpOutline />, label: t("sidebar.enquiry") },
      { to: "/userbase", icon: <MdPeople />, label: t("sidebar.userbase") },
      { to: "/preregister", icon: <MdPeople />, label: t("sidebar.preCourse") },
      { to: "/notifications", icon: <MdNotificationsActive />, label: t("sidebar.notifications") },
      { to: "/coupon", icon: <BiSolidOffer />, label: t("sidebar.coupon") },
      { to: "/exams", icon: <IoBookSharp /> , label: t("sidebar.exam") },



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

  const isExpanded = isMobile ? isSidebarOpen : isHovered;

  return (
    <aside
      className={`sidebar ${isMobile
        ? isSidebarOpen ? "open" : "hidden"
        : isExpanded ? "expanded" : "collapsed"
      }`}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <nav className="sidebar-menu">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={`sidebar-item ${location.pathname === to ? "active" : ""}`}
            aria-label={label}
            onClick={() => isMobile && setIsSidebarOpen(false)}
          >
            <span className="sidebar-icon">{icon}</span>
            {isExpanded && <span className="sidebar-text">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-logout">
        <button
          className="sidebar-logout-btn"
          onClick={() => {
            handleLogout();
            if (isMobile) setIsSidebarOpen(false);
          }}
          aria-label={t("sidebar.logout")}
        >
          <MdLogout className="sidebar-icon logout-icon" />
          {isExpanded && <span className="sidebar-text">{t("sidebar.logout")}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
