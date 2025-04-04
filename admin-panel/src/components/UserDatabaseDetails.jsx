import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./UserDatabaseDetails.css";

const UserDatabaseDetails = () => {
  const { email } = useParams();
  const [userData, setUserData] = useState(null);
  const [webinarNames, setWebinarNames] = useState({});
  const [courseNames, setCourseNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = import.meta.env.VITE_BASE_URL;
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setError("Unauthorized: No token found. Please login.");
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/user/${email}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch user details.");

        const data = await response.json();
        setUserData(data);

        fetchWebinarNames(data.webinars);
        fetchCourseNames(data.courses);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchWebinarNames = async (webinars) => {
      if (!webinars?.length) return;

      const webinarPromises = webinars.map(async (webinar) => {
        const res = await fetch(`${baseUrl}/api/webinars/${webinar.webinarId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const webinarData = await res.json();
          return { [webinar.webinarId]: webinarData.title };
        }
      });

      const webinarResults = await Promise.all(webinarPromises);
      setWebinarNames(Object.assign({}, ...webinarResults));
    };

    const fetchCourseNames = async (courses) => {
      if (!courses?.length) return;

      const coursePromises = courses.map(async (course) => {
        const res = await fetch(`${baseUrl}/api/courses/${course.courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const courseData = await res.json();
          return { [course.courseId]: courseData.name };
        }
      });

      const courseResults = await Promise.all(coursePromises);
      setCourseNames(Object.assign({}, ...courseResults));
    };

    fetchUserData();
  }, [email, baseUrl, token]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!userData) return <div className="error">User data not available</div>;

  return (
    <div className="user-database-details-container">
      {/* User Details Section */}
      <div className="user-details-section">
        <h2 className="section-heading">User Details</h2>
        <div className="user-info-section">
          <h3 className="sub-heading">Personal Information</h3>
          <p>
  <strong>Name:</strong> 
  {userData.dashboardLang === "ru"
    ? `${userData.personalDetails?.title || ""} ${userData.personalDetails?.lastName || ""} ${userData.personalDetails?.firstName || ""} ${userData.personalDetails?.middleName || ""}`.trim()
    : `${userData.personalDetails?.title || ""} ${userData.personalDetails?.firstName || ""} ${userData.personalDetails?.middleName || ""} ${userData.personalDetails?.lastName || ""}`.trim()
  }
</p>

          <p><strong>Email:</strong> {userData.email}</p>
          <p><strong>Phone:</strong> {userData.personalDetails?.phone}</p>
          <p><strong>DOB:</strong> {new Date(userData.personalDetails?.dob).toLocaleDateString()}</p>
          <p><strong>Country:</strong> {userData.personalDetails?.country}</p>
          <p><strong>Gender:</strong> {userData.personalDetails?.gender}</p>
        </div>
        <div className="user-info-section">
          <h3 className="sub-heading">Professional Information</h3>
          <p className="user-info"><strong>University:</strong> {userData.professionalDetails?.university}</p>
          <p className="user-info"><strong>Department:</strong> {userData.professionalDetails?.department}</p>
          <p className="user-info"><strong>Profession:</strong> {userData.professionalDetails?.profession}</p>
          <p className="user-info"><strong>Position:</strong> {userData.professionalDetails?.position}</p>
        </div>
      </div>

      {/* Webinars Section */}
      <div className="webinars-section">
        <h2 className="section-heading">Webinars</h2>
        {userData.webinars?.length > 0 ? (
          userData.webinars.map((webinar, index) => (
            <div className="user-list-item" key={index}>
              <p><strong>Webinar:</strong> {webinarNames[webinar.webinarId] || "Loading..."}</p>
              <p><strong>Registered At:</strong> {new Date(webinar.registeredAt).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p>No webinars registered.</p>
        )}
      </div>

      {/* Courses Section */}
      <div className="courses-details-section">
  <h2 className="section-heading">Courses</h2>
  {userData.courses?.length > 0 ? (
    userData.courses.map((course, index) => (
      <div className="user-list-item" key={index}>
        <p><strong>Course:</strong> {courseNames[course.courseId] || "Loading..."}</p>
        <p><strong>Submitted At:</strong> {new Date(course.submittedAt).toLocaleString()}</p>

        {/* Payment Details */}
        {course.payments?.length > 0 && (
          <div className="payment-section">
            <h4 className="sub-heading">Payment Details</h4>
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {course.payments.map((payment, pIndex) => (
                  <tr key={pIndex}>
                    <td>{payment.invoiceNumber}</td>
                    <td>{payment.package}</td>
                    <td>{new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency,
                    }).format(payment.amount)}</td>
                    <td className={`status-${payment.status.toLowerCase()}`}>
                      {payment.status}
                    </td>
                    <td>{new Date(payment.time).toLocaleString()}</td>
                    <td>
                      {payment.status === "Pending" ? (
                        <a href={payment.paymentLink} target="_blank" rel="noopener noreferrer" className="pay-now-btn">
                          Pay Now
                        </a>
                      ) : (
                        <span className="paid-label">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ))
  ) : (
    <p>No courses registered.</p>
  )}
</div>

    </div>
  );
};

export default UserDatabaseDetails;
