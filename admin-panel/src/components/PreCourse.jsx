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
    const fetchUsers = async () => {
      try {
        // 1. Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication token not found');
        }
    
        // 2. Make request with authorization header
        const response = await axios.get(`${baseUrl}/api/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
    
        // 3. Handle successful response
        setUsers(response.data);
    
      } catch (error) {
        // 4. Handle errors
        console.error("Error fetching users:", error);
        
        // Show error notification
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: error.response?.data?.message || 'Failed to fetch users',
          type: 'error'
        }]);
    
        // If unauthorized (401), clear token and redirect
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          // Redirect to login or handle as needed
        }
      }
    };
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
