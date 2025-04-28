import React from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import "./Navbar.css";

const Navbar = ({ isSidebarOpen, setIsSidebarOpen }) => {

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen); // Just toggle sidebar state
  };

  return (
    <nav className="navbar">
      {/* Menu Icon (Hamburger) */}
      <div className="menu-icon" onClick={toggleMenu}>
        {isSidebarOpen ? <FaTimes /> : <FaBars />}
      </div>

      {/* Logo */}
      <img 
        src="https://static.wixstatic.com/media/e6f22e_a90a0fab7b764c24805e7e43d165d416~mv2.png" 
        alt="EAFO Logo" 
        className="navbar-logo" 
      />
    </nav>
  );
};

export default Navbar;
