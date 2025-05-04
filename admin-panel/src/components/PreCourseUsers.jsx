import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaEnvelope, FaWhatsapp, FaTelegramPlane } from "react-icons/fa"; // Import React Icons for action buttons
import "./PreCourse.css";
import EmailModal from "./EmailModal";
import WhatsAppChatBot from "./WhatsAppChatBot";
import TelegramChatBot from "./TelegramChatBot";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function PreCourseUsers() {
  const { courseId } = useParams();
  const [users, setUsers] = useState([]);
  const [preUsers, setPreUsers] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDetails, setEmailDetails] = useState({});
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState("");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramPhoneNumber, setTelegramPhoneNumber] = useState("");

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("No token found. Please log in.");
          return;
        }

        // Step 1: Get all users who registered
        const userRes = await axios.get(`${baseUrl}/api/precourse/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("User Data:", userRes.data);  // Debugging: Check the structure of the response
        setPreUsers(userRes.data); // ✅ Correct
        

        const allUsers = userRes.data.filter(user => user.courseId === courseId);

        // Step 2: Check UI and Course status for each email
        const enhancedUsers = await Promise.all(
          allUsers.map(async (user) => {
            let uiStatus = "red";
            let courseStatus = "red";

            try {
              const uiRes = await axios.get(`${baseUrl}/api/user/${user.email}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (uiRes.data?.email) uiStatus = "green";
            } catch (err) {
              console.warn(`UI check failed for ${user.email}`);
            }

            try {
              const courseRes = await axios.get(`${baseUrl}/api/courses/${courseId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              const payments = courseRes.data?.payments || [];
              const paymentEmails = payments.map(p => p.email);
              const exists = paymentEmails.includes(user.email);
              if (exists) courseStatus = "green";
            } catch (err) {
              console.warn(`Course check failed for ${user.email}`);
            }

            // Debugging: Check the user information
            console.log("User:", user);

            return {
              email: user.email,
              phone: user.phone, // Using phone from `precourses`
              firstName: user.firstName,
              middleName: user.middleName,
              lastName: user.lastName,
              uiStatus,
              courseStatus,
            };
          })
        );

        console.log("Enhanced Users:", enhancedUsers);  // Check enhanced data
        setUsers(enhancedUsers);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    fetchEmails();
  }, [courseId]);

  const handleEmailClick = (email) => {
    setEmailDetails({ to: email, subject: "", body: "", attachment: null });
    setShowEmailModal(true);
  };

  const handleWhatsAppClick = (phone) => {
    console.log(`Initiating WhatsApp chat with phone: +${phone}`);
    setWhatsappPhoneNumber(phone);
    setShowWhatsAppModal(true); // Show WhatsApp modal or start a chat
  };

  const handleTelegramClick = (phone) => {
    console.log(`Initiating Telegram chat with phone: +${phone}`);
    setTelegramPhoneNumber(phone);
    setShowTelegramModal(true); // Show Telegram modal or initiate chat
  };

  // Generate contact icons for email, whatsapp, telegram
  const generateContactIcons = (email, phone) => {
    return (
      <div className="user-contact-icons">
        <div className="user-icon-email" onClick={() => handleEmailClick(email)}>
          <FaEnvelope/>
        </div>
        <div className="user-icon-whatsapp" onClick={() => handleWhatsAppClick(phone)}>
          <FaWhatsapp/>
        </div>
        <div className="user-icon-telegram" onClick={() => handleTelegramClick(phone)}>
          <FaTelegramPlane/>
        </div>
      </div>
    );
  };

  return (
    <div className="pre-user-list">
      <h2>Registered Users for Course</h2>
      <table className="pre-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>UI Status</th>
            <th>Course Status</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="4">No users registered yet.</td>
            </tr>
          ) : (
            users.map((user, idx) => (
              <tr key={idx}>
               <td>{user.firstName || "-"} {user.middleName || ""} {user.lastName || "-"}</td>
               <td>{user.email}</td>
                <td>
                  <span className={user.uiStatus === "green" ? "status-green" : "status-red"}>
                    {user.uiStatus === "green" ? "Registered" : "Not Registered"}
                  </span>
                </td>
                <td>
                  <span className={user.courseStatus === "green" ? "status-green" : "status-red"}>
                    {user.courseStatus === "green" ? "Registered" : "Not Registered"}
                  </span>
                </td>
                <td>{generateContactIcons(user.email, user.phone)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showEmailModal && (
        <EmailModal emailDetails={emailDetails} onClose={() => setShowEmailModal(false)} />
      )}
      {showWhatsAppModal && (
        <WhatsAppChatBot
          isOpen={showWhatsAppModal}
          phoneNumber={whatsappPhoneNumber}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
      {showTelegramModal && (
        <TelegramChatBot
          isOpen={showTelegramModal}
          phoneNumber={telegramPhoneNumber}
          onClose={() => setShowTelegramModal(false)}
        />
      )}
    </div>
  );
}
