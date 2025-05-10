import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { 
  FiUser, FiBook, FiDollarSign, 
  FiCheckCircle, FiXCircle, FiClock,
  FiCalendar, FiCreditCard, FiPackage
} from "react-icons/fi";
import "./QRView.css";

const QRView = () => {
  const { userId, courseId, formId } = useParams();
  const [qrDetails, setQrDetails] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [fullName, setFullName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [image, setImage] = useState();
  const [activeTab, setActiveTab] = useState("overview");
  const token = localStorage.getItem("token");
  const baseUrl = import.meta.env.VITE_BASE_URL;

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (userId && courseId) {
          // Fetch user data
          const userResponse = await axios.get(`${baseUrl}/api/user/getqrDetails/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
  
          const user = userResponse.data;
          const course = user?.courses?.find((c) => c.courseId === courseId);
  
          if (course?.payments?.length > 0) {
            setPaymentInfo(course.payments[0]);
          }
  
          // Fetch only course title
          const lang = localStorage.getItem("dashboardLang") || "en";
          try {
            const courseResponse = await axios.get(`${baseUrl}/api/courses/${courseId}/getName`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
  
            const courseTitle = lang === "ru"
              ? courseResponse.data.nameRussian
              : courseResponse.data.name;
  
            setCourseName(courseTitle || "");
          } catch (courseError) {
            console.error("Error fetching course name:", courseError);
            setCourseName("");
          }
  
          const pd = user?.personalDetails;
          const name = pd
            ? `${pd.title || ""} ${pd.firstName || ""} ${pd.middleName || ""} ${pd.lastName || ""}`
                .replace(/\s+/g, " ")
                .trim()
            : user.name || "Unnamed User";
  
          setFullName(name);
          setQrDetails({ user, course });
  
          // Fetch user image if email exists
          if (user.email) {
            try {
              const imageResponse = await fetch(`${baseUrl}/api/user/image/${user.email}`);
              if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob();
                const imageUrl = URL.createObjectURL(imageBlob);
                setImage(imageUrl);
              }
            } catch (imageError) {
              console.error("Error fetching user image:", imageError);
              // You might want to set a default avatar image here
            }
          }
        }
      } catch (err) {
        console.error("Error fetching QR details:", err);
        setError("Failed to load user data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  
    // Cleanup function to revoke the object URL when component unmounts
    return () => {
      if (image) {
        URL.revokeObjectURL(image);
      }
    };
  }, [userId, courseId, baseUrl, token, image]); // Added image to dependencies
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-animation">
          <div className="loading-spinner"></div>
          <p>Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">
            <FiXCircle />
          </div>
          <h2>Verification Failed</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-btn"
          >
            Scan Again
          </button>
        </div>
      </div>
    );
  }

  const StatusPill = ({ status }) => {
    const statusMap = {
      paid: { color: "var(--success)", icon: <FiCheckCircle /> },
      pending: { color: "var(--warning)", icon: <FiClock /> },
      default: { color: "var(--error)", icon: <FiXCircle /> }
    };
    
    const currentStatus = statusMap[status?.toLowerCase()] || statusMap.default;
    
    return (
      <span 
        className="status-pill"
        style={{ backgroundColor: `${currentStatus.color}20`, color: currentStatus.color }}
      >
        {currentStatus.icon}
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div className="verification-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Member Verification</h1>
        </div>
      </header>

      {/* Profile Card */}
      <section className="profile-card">
  <div className="avatar">
    {image ? (
      <img 
        src={image} 
        alt={fullName} 
        className="avatar-image"
        onError={(e) => {
          // If image fails to load, show the icon instead
          e.currentTarget.style.display = 'none';
        }}
      />
    ) : (
      <FiUser className="avatar-icon" />
    )}
  </div>
  <div className="profile-info">
    <h2>{fullName}</h2>
    {qrDetails?.user?.email && (
      <p className="member-id">{qrDetails.user.email}</p>
    )}
  </div>
</section>

      {/* Navigation Tabs */}
      <nav className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === "course" ? "active" : ""}`}
          onClick={() => setActiveTab("course")}
        >
          Course
        </button>
        <button 
          className={`tab-btn ${activeTab === "payment" ? "active" : ""}`}
          onClick={() => setActiveTab("payment")}
        >
          Payment
        </button>
      </nav>

      {/* Tab Content */}
      <main className="dashboard-content">
        {activeTab === "overview" && (
          <div className="overview-grid">
            <div className="overview-card">
              <div className="card-header">
                <FiBook />
                <h3>Course Details</h3>
              </div>
              <div className="card-body">
                {courseName && (
                  <div className="info-row">
                    <span>Course Name:</span>
                    <span>{courseName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="overview-card">
              <div className="card-header">
                <FiDollarSign />
                <h3>Payment Status</h3>
              </div>
              <div className="card-body">
                {paymentInfo ? (
                  <>
                    <div className="info-row">
                      <span>Status:</span>
                      <StatusPill status={paymentInfo.status} />
                    </div>
                    <div className="info-row">
                      <span>Package:</span>
                      <span>{paymentInfo.package}</span>
                    </div>
                    <div className="info-row">
                      <span>Amount:</span>
                      <span>{paymentInfo.amount} {paymentInfo.currency}</span>
                    </div>
                  </>
                ) : (
                  <div className="no-data">No payment information available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "course" && (
          <div className="course-details">
            <h3>Course Information</h3>
            <div className="detail-card">
              <div className="detail-item">
                <span className="detail-label">Course ID</span>
                <span className="detail-value">{courseId || "N/A"}</span>
              </div>
              {courseName && (
                <div className="detail-item">
                  <span className="detail-label">Course Name</span>
                  <span className="detail-value">{courseName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "payment" && (
          <div className="payment-details">
            <h3>Payment Information</h3>
            {paymentInfo ? (
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <StatusPill status={paymentInfo.status} />
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Package</span>
                  <span className="detail-value">
                    <FiPackage /> {paymentInfo.package}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value">
                    <FiDollarSign /> {paymentInfo.amount} {paymentInfo.currency}
                  </span>
                </div>
                
              </div>
            ) : (
              <div className="no-data">
                No payment records found for this course
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default QRView;