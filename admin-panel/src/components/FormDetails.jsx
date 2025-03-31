import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./FormDetails.css";

const FormDetails = () => {
  const { email } = useParams();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [intervalId, setIntervalId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("stripe");
  const baseUrl = import.meta.env.VITE_BASE_URL;

  
  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/forms/${email}`);
        if (!response.ok) throw new Error("User not found");

        const data = await response.json();
        setEntry(data);
      } catch (error) {
        console.error("Error fetching user details:", error);
        setError("User not found.");
        setEntry(null);
      } finally {
        setLoading(false);
      }
    };

    if (email) fetchUserDetails();
  }, [email]);

  // Polling for payment status updates
  useEffect(() => {
    if (entry?.payments?.length > 0) {
      // Clear existing interval before starting a new one
      if (intervalId) {
        clearInterval(intervalId);
      }

      const id = setInterval(async () => {
        try {
          const updatedPayments = await Promise.all(
            entry.payments.map(async (payment) => {
              if (!payment.orderId) return payment; // Skip if no orderId

              try {
                // Check the payment status for Alfabank payments
                if (payment.method === "alfabank") {
                  const response = await axios.post(
                    `${baseUrl}/api/payment/alfabank/status`,
                    { orderId: payment.orderId }
                  );

                  if (response.data.success && response.data.paymentStatus) {
                    return {
                      ...payment,
                      paymentStatus:
                        response.data.paymentStatus === "Payment successful" ? "Paid" : response.data.paymentStatus,
                    };
                  }
                }

                // Check the payment status for Stripe payments
                if (payment.method === "stripe") {
                  const response = await axios.post(
                    `${baseUrl}/api/payment/stripe/status`,  // Assuming you have a backend endpoint for Stripe status
                    { orderId: payment.orderId }
                  );

                  if (response.data.success && response.data.paymentStatus) {
                    return {
                      ...payment,
                      paymentStatus:
                        response.data.paymentStatus === "Payment successful" ? "Paid" : response.data.paymentStatus,
                    };
                  }
                }
              } catch (error) {
                console.error("Error fetching payment status:", error);
              }

              return payment; // Return old data if API call fails
            })
          );

          // Update entry with new payment statuses
          setEntry((prevEntry) => {
            if (!prevEntry) return null;
            return {
              ...prevEntry,
              payments: updatedPayments,
            };
          });

          // If payment is successful, stop polling
          if (updatedPayments.every(payment => payment.paymentStatus === "Paid")) {
            clearInterval(id);
          }
        } catch (err) {
          console.error("Error in polling payments:", err);
        }
      }, 10000); // Poll every 10 seconds

      setIntervalId(id);

      // Cleanup on component unmount
      return () => clearInterval(id);
    }
  }, [entry]);

  // Handle Stripe Payment
  const handleStripePayment = async () => {
    if (!entry) return;

    const coursePrices = {
      course1: 1,
      course2: 2,
    };

    const orderDetails = {
      orderNumber: `order-${Date.now()}`,
      amount: coursePrices[entry.course] || 10,
      returnUrl: "http://localhost:3000/payment/success",
      failUrl: "http://localhost:3000/payment/fail",
      email: entry.email,
      course: entry.course,
    };

    try {
      const response = await axios.post(`${baseUrl}/api/stripe/create-payment-link`, orderDetails);
      if (response.data.success) {
        setPaymentUrl(response.data.paymentUrl);
        setOrderId(response.data.orderId);

        const updatedEntry = {
          ...entry,
          payments: [
            ...(entry.payments || []),
            {
              course: entry.course,
              amount: orderDetails.amount,
              paymentUrl: response.data.paymentUrl,
              orderId: response.data.orderId,
              paymentStatus: "pending",
              method: "stripe", // Store selected method
            },
          ],
        };

        await fetch(`${baseUrl}/api/forms/${email}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEntry),
        });

        setEntry(updatedEntry);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError("Payment request failed.");
      console.error("Payment error:", error);
    }
  };

  // Handle Alfabank Payment
  const handleAlfabankPayment = async () => {
    if (!entry) return;

    const coursePrices = {
      course1: 1.5,
      course2: 2,
    };

    const orderDetails = {
      orderNumber: `order-${Date.now()}`,
      amount: coursePrices[entry.course] || 10,
      returnUrl: "http://localhost:3000/payment/success",
      failUrl: "http://localhost:3000/payment/fail",
      email: entry.email,
    };

    try {
      const response = await axios.post(`${baseUrl}/api/payment/alfabank/pay`, orderDetails);
      if (response.data.success) {
        setPaymentUrl(response.data.paymentUrl);
        setOrderId(response.data.orderId);

        const updatedEntry = {
          ...entry,
          payments: [
            ...(entry.payments || []),
            {
              course: entry.course,
              amount: orderDetails.amount,
              paymentUrl: response.data.paymentUrl,
              orderId: response.data.orderId,
              paymentStatus: "pending",
              method: "alfabank", // Store selected method
            },
          ],
        };

        await fetch(`${baseUrl}/api/forms/${email}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEntry),
        });

        setEntry(updatedEntry);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError("Payment request failed.");
      console.error("Payment error:", error);
    }
  };

  if (loading) return <p>Loading user details...</p>;
  if (!entry) return <p>No details found for this user.</p>;

  return (
    <div className="details-container">
      <h2>User Details</h2>
      <p><strong>Name:</strong> {entry.name}</p>
      <p><strong>Email:</strong> {entry.email}</p>
      <p><strong>Phone:</strong> {entry.phone}</p>
      <p><strong>Course:</strong> {entry.course}</p>

      <button className="invoice-btn" onClick={() => setShowPopup(true)}>
        Generate Invoice
      </button>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Invoice Details</h3>
            <p><strong>Name:</strong> {entry.name}</p>
            <p><strong>Email:</strong> {entry.email}</p>
            <p><strong>Course:</strong> {entry.course}</p>
            <p><strong>Amount:</strong> {entry.course === "course1" ? 1 : 2}</p>

            <label htmlFor="paymentMethod"><strong>Select Payment Method:</strong></label>
            <select id="paymentMethod" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
              <option value="stripe">Stripe</option>
              <option value="alfabank">Alfabank</option>
            </select>

            <button className="generate-btn" onClick={selectedMethod === "stripe" ? handleStripePayment : handleAlfabankPayment}>
              Generate Payment Link
            </button>

            {paymentUrl && (
              <p className="payment-link">
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                  Click here to pay
                </a>
              </p>
            )}

            {orderId && <p><strong>Order ID:</strong> {orderId}</p>}
            {error && <p className="error-message">{error}</p>}

            <button className="close-btn" onClick={() => setShowPopup(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <h3>Payment History</h3>
      {entry.payments && entry.payments.length > 0 ? (
        <table className="payment-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Amount</th>
              <th>Payment URL</th>
              <th>Order ID</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entry.payments.map((payment, index) => (
              <tr key={index}>
                <td>{payment.course}</td>
                <td>{payment.amount}</td>
                <td><a href={payment.paymentUrl} target="_blank" rel="noopener noreferrer">Pay Now</a></td>
                <td>{payment.orderId}</td>
                <td>{payment.method}</td>
                <td>{payment.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No payment history available.</p>
      )}
    </div>
  );
};

export default FormDetails;
