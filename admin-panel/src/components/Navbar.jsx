import React, { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa"; // Importing icons for the menu
import "./Navbar.css"; // Import CSS file

const Navbar = ({ setIsSidebarOpen }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // To handle the menu open/close state

  // Toggle menu visibility
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsSidebarOpen(!isMenuOpen); // Toggle sidebar visibility
  };

  return (
    <nav className="navbar">
      {/* Menu Icon (Hamburger) */}
      <div className="menu-icon" onClick={toggleMenu}>
        {isMenuOpen ? <FaTimes /> : <FaBars />} {/* Show 'X' icon if menu is open, otherwise show bars */}
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
