import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./PreCourse.css";

const baseUrl = "http://localhost:4000";

export default function PreCourse() {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${baseUrl}/api/courses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCourses(res.data);
      } catch (err) {
        console.error("Failed to fetch courses", err);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="course-list-container">
      <div className="course-list">
        {courses.map((course) => (
          <div
            key={course._id}
            className="course-item"
            onClick={() => navigate(`/precourse/${course._id}`)}
          >
            {course.name}
          </div>
        ))}
      </div>
    </div>
  );
}
