import React, { useState} from "react";
import "./Navbar.css"; // Import CSS file

const Navbar = () => {

  return (
    <nav className="navbar">
      <img 
        src="https://static.wixstatic.com/media/e6f22e_a90a0fab7b764c24805e7e43d165d416~mv2.png" 
        alt="EAFO Logo" 
        className="navbar-logo" 
      />
   
    </nav>
  );
};

export default Navbar;
