import React from "react";
import { FaTools } from "react-icons/fa";
import "./Payments.css";

const Payments = () => {
  return (
    <div className="payments-container">
      <div className="under-development">
        <FaTools className="dev-icon" />
        <h2>Payments Section</h2>
        <p>🚧 This section is currently under development. 🚧</p>
        <p>Stay tuned for updates!</p>
      </div>
    </div>
  );
};

export default Payments;
