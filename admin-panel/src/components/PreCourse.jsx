import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./PreCourse.css";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function PreCourse() {
  const [courses, setCourses] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch all courses
        const courseRes = await axios.get(`${baseUrl}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(courseRes.data);

        // Fetch all precourse users
        const userRes = await axios.get(`${baseUrl}/api/precourse/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Count users per courseId
        const userList = userRes.data;
        const courseCounts = {};
        userList.forEach(user => {
          if (user.courseId) {
            courseCounts[user.courseId] = (courseCounts[user.courseId] || 0) + 1;
          }
        });

        setRegistrations(courseCounts);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pre-course-list-container">
      <div className="pre-course-list">
        {courses.map((course) => (
          <div
            key={course._id}
            className="pre-course-item"
            onClick={() => navigate(`/precourse/${course._id}`)}
          >
            <span>{course.name}</span>
            <span className="registered-count">
              {registrations[course._id] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
