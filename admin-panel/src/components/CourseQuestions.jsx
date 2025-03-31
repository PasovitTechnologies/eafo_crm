import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CourseQuestions.css";

const CourseQuestions = () => {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BASE_URL;


  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token"); // Retrieve token
  
        const response = await fetch(`${baseUrl}/api/courses`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`, // Include authorization header
            "Content-Type": "application/json",
          },
        });
  
        if (!response.ok) throw new Error("Failed to fetch courses.");
        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error("Error loading courses:", error);
      }
    };
  
    fetchCourses();
  }, []);
  

  return (
    <div className="course-questions-container">
      <h2>Manage Course Questions</h2>
      <div className="course-list">
        {courses.map((course) => (
          <div
            key={course._id}
            className="course-card"
            onClick={() => navigate(`/course-questions/${course._id}/forms`)}
          >
            <div
              className="course-banner"
              style={{ backgroundImage: `url(${course.bannerUrl})` }}
            ></div>
            <div className="course-info">
              <h3 className="course-name">{course.name}</h3>
              <p className="course-date">
                {new Date(course.date).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseQuestions;
