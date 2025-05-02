import React from "react";
import "./Loading.css"; // ✅ Import CSS

const Loading = () => {
  return (
    
      <div className="courses-list">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-course-card">
            {/* Left image area */}
            <div className="skeleton-course-image shimmer"></div>
    
            {/* Center text area */}
            <div className="skeleton-course-content">
              <div className="skeleton-line long shimmer"></div>
              <div className="skeleton-line medium shimmer"></div>
              <div className="skeleton-line short shimmer"></div>
            </div>
    
            {/* Right buttons */}
            <div className="skeleton-course-actions">
              <div className="skeleton-button shimmer"></div>
              <div className="skeleton-button shimmer"></div>
            </div>
          </div>
        ))}
      </div>
   
  );
};

export default Loading;
