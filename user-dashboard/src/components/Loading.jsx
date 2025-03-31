import React from "react";
import "./Loading.css"; // ✅ Import CSS

const Loading = () => {
  return (
    <div className="loading-container">
      <img
        src="https://static.wixstatic.com/media/e6f22e_e8a9b9cb73494c369ae1a026e7bf040e~mv2.png"
        alt="Loading"
        className="loading-logo"
      />
      <p className="loading-text">Loading...</p>
    </div>
  );
};

export default Loading;
