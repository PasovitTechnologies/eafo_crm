import React, { useState, useEffect, useRef } from "react";
import "./InvoicePopup.css";
import { FaWhatsapp, FaEnvelope, FaTimes } from "react-icons/fa";

const InvoicePopup = ({ user, coursePrice, onClose }) => {
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [invoiceSent, setInvoiceSent] = useState(false); // State to track if the invoice is sent
  const sendOptionsRef = useRef(null);

  // Close send options when clicking outside the send-options div
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sendOptionsRef.current &&
        !sendOptionsRef.current.contains(event.target)
      ) {
        setShowSendOptions(false); // Hide the send-options
      }
    };

    if (showSendOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSendOptions]);

  const sendEmail = async () => {
    try {
      const response = await fetch("http://localhost:5000/send-email", {
        method: "POST",
        headers: {
          Authorization:`Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.fullName,
          course: user.courseSelection,
          price: coursePrice,
        }),
      });
      const data = await response.json();
      if (data.message) {
        setInvoiceSent(true); // Show success message
      }
    } catch (error) {
      alert("Failed to send email. Please try again.");
    }
  };

  const sendWhatsAppMessage = () => {
    const message = `Hello, ${user.fullName}%0A%0AHere is your invoice:%0ACourse: ${user.courseSelection}%0APrice: ${coursePrice}%0A%0AThank you!`;
    const phoneNumber = ""; // Add predefined phone number or leave blank for user to choose.
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, "_blank");

    setInvoiceSent(true); // Show success message after sending WhatsApp message
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-header">
          <h2>Invoice</h2>
          <FaTimes className="close-icon" onClick={onClose} />
        </div>

        <div className="popup-body">
          {/* Display success message when invoice is sent */}
          {invoiceSent && <p className="success-message">Invoice sent successfully!</p>}

          <p><strong>Name:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone Number:</strong> {user.phoneNumber}</p>
          <p><strong>Course:</strong> {user.courseSelection}</p>
          <p><strong>Price:</strong> {coursePrice}</p>
        </div>

        <div className="popup-footer">
          {!showSendOptions ? (
            <button
              className="send-invoice-btn"
              onClick={() => setShowSendOptions(true)}
            >
              Send Invoice
            </button>
          ) : (
            <div
              className="send-options"
              ref={sendOptionsRef} // Attach the ref to this div
            >
              <button className="send-option-btn email-btn" onClick={sendEmail}>
                <FaEnvelope /> {/* Email Icon */}
              </button>
              <button className="send-option-btn whatsapp-btn" onClick={sendWhatsAppMessage}>
                <FaWhatsapp /> {/* WhatsApp Icon */}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicePopup;
