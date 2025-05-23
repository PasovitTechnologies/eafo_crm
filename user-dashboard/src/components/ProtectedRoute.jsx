import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import EAFOWaterLoader from "./EAFOWaterLoader";

const baseUrl = import.meta.env.VITE_BASE_URL;

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  useEffect(() => {
    const verifyUser = async () => {
      if (!token || !email) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }

      try {
        const res = await fetch(`${baseUrl}/api/user/${email}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.clear();
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.clear();
        setIsAuthenticated(false);
      }
    };

    verifyUser();
  }, [token, email]);

  if (isAuthenticated === null) {
    return <div><EAFOWaterLoader/></div>; // You can customize with a spinner
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
