import React, { useState, useEffect } from "react";
import axios from "axios";
import "./InvoiceModal.css";
import {
  FaEnvelope,
  FaWhatsapp,
  FaTrashAlt,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa"; // Import icons
import AktDocument from "./AktDocument";
import { useTranslation } from "react-i18next";
import ContractDocument from "./ContractDocument";
import { useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const InvoiceModal = ({ submission, isOpen, onClose, formId, courseId }) => {
  const [items, setItems] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isAktOpen, setIsAktOpen] = useState(false);
  const [aktData, setAktData] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const { t } = useTranslation(); // Translation hook
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const paymentMethods = [
    {
      id: "stripe",
      name: "Stripe",
      currencies: ["USD", "EUR", "INR"],
      defaultCurrency: "USD",
    },
    {
      id: "alfabank",
      name: "Alfa Bank",
      currencies: ["RUB"],
      defaultCurrency: "RUB",
    },
  ];

  useEffect(() => {
    if (isOpen && submission) {
      const currency = submission.currency || "USD";

      setItems(
        submission.package && submission.amount
          ? [
              {
                name: submission.package,
                amount: parseFloat(submission.amount) || 0,
                currency,
              },
            ]
          : [{ name: "", amount: 0, currency }]
      );

      // Set initial payment method based on currency
      if (currency === "RUP") {
        setSelectedMethod("alfabank");
      } else if (currency === "INR") {
        setSelectedMethod("stripe");
      } else {
        const defaultMethod =
          paymentMethods.find((method) => method.currencies.includes(currency))
            ?.id || "stripe";
        setSelectedMethod(defaultMethod);
      }

      setPaymentUrl("");
      setOrderId("");
      setError(null);

      if (submission.email && courseId) {
        fetchPaymentHistory();
      }
    }
  }, [isOpen, submission, courseId]);

  const fetchPaymentHistory = async () => {
    try {
      // Validate required data
      if (!submission?.email || !courseId) {
        setError("Missing required data (email or course ID)");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await axios.get(
        `${baseUrl}/api/user/${submission.email}`, // Note: Added /api/
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data?.courses) {
        setPaymentHistory([]);
        setError("No course data found for this user");
        return;
      }

      const course = response.data.courses.find((c) => c.courseId === courseId);
      if (!course?.payments) {
        setPaymentHistory([]);
        setError("No payment history for this course");
        return;
      }

      const formattedPayments = course.payments.map((payment) => ({
        invoiceNumber: payment.invoiceNumber || `INV-${Date.now()}`,
        paymentId: payment.paymentId || "N/A",
        paymentLink: payment.paymentLink || "#",
        package: payment.package || submission.package || "Unknown",
        amount: payment.amount || submission.amount || 0,
        currency: payment.currency || submission.currency || "USD",
        status: payment.status || "Unknown",
        time: payment.time ? new Date(payment.time).toLocaleString() : "N/A",
      }));

      setPaymentHistory(formattedPayments);
      setUserData(response.data);
      setError(null);
    } catch (error) {
      console.error("Payment history error:", error);
      setError(
        error.response?.data?.message || "Failed to fetch payment history"
      );
    }
  };

  const addNewItem = () => {
    setItems([
      ...items,
      { name: "", amount: 0, currency: items[0]?.currency || "USD" },
    ]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const currency = items[0]?.currency || "USD";

  const handlePayment = async () => {
    if (!submission.email || items.length === 0 || totalAmount <= 0) {
      setError(
        "Please ensure email is available and items have valid amounts."
      );
      return;
    }

    setLoading(true);
    setError(null);

    const orderDetails = {
      orderNumber: `order-${Date.now()}`,
      amount: totalAmount,
      currency: selectedMethod === "stripe" ? "INR" : "RUP",
      email: submission.email,
      course: items.map((item) => item.name).join(", "),
      returnUrl: "http://localhost:3000/payment-success",
      failUrl: "http://localhost:3000/payment-failed",
    };

    try {
      const endpoint =
        selectedMethod === "stripe"
          ? `${baseUrl}/api/stripe/create-payment-link`
          : `${baseUrl}/api/payment/alfabank/pay`;

      const response = await axios.post(endpoint, orderDetails, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        toast.success("Payment link generated")
        setPaymentUrl(response.data.paymentUrl);
        setOrderId(response.data.orderId);
      } else {
        setError(response.data.message || "Payment failed.");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Payment request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    console.log("📤 Email send process started...");
  
    if (!submission?.email) {
      console.error("❌ Missing recipient email.");
      return;
    }
  
    if (!paymentUrl) {
      alert("❌ No payment URL generated. Please generate a payment link first.");
      return;
    }
  
    // 🔥 Pass the full submission object instead of extracting fields
    const emailData = {
      courseId,
      orderId,
      paymentUrl,
      submission,
      currency // ✅ Send the entire submission object
    };
  
    console.log("📥 Sending email request:", JSON.stringify(emailData, null, 2));
  
    try {
      const response = await axios.post(`${baseUrl}/api/email/send`, emailData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
  
      if (response.data.success) {
        console.log("✅ Invoice email sent successfully:", response.data);
        setShowPopup(true);
        fetchPaymentHistory();
        setPaymentUrl(""); // Clear payment URL after sending
      } else {
        console.error("❌ Failed to send invoice email:", response.data.message);
      }
    } catch (error) {
      console.error("❌ Error sending email request:", error.response?.data || error.message);
      alert(`❌ Error: ${error.response?.data?.message || "Failed to send invoice"}`);
    }
  };
  
  
  
  
  

  const handleSendWhatsApp = useCallback(async () => {
    console.log("🚀 WhatsApp button clicked");

    if (whatsappLoading) {
      console.log("⚠️ WhatsApp is already sending, please wait.");
      return;
    }

    if (!paymentUrl) {
      console.log("❌ No payment URL generated.");
      alert("❌ No payment URL. Generate it first!");
      return;
    }

    if (!userData?.personalDetails?.phone) {
      console.log("❌ No phone number found in user data.");
      alert("❌ Missing phone number.");
      return;
    }

    const phoneNumber = userData.personalDetails.phone.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(phoneNumber)) {
      console.log("❌ Invalid phone number format.");
      alert("❌ Invalid phone number.");
      return;
    }

    if (!courseId || !orderId || !submission.currency) {
      console.log(
        "❌ Missing required payment details (courseId, orderId, currency)."
      );
      alert("❌ Payment details missing. Please try again.");
      return;
    }

    setWhatsappLoading(true);
    setWhatsappStatus(null);

    try {
      console.log("📨 Sending WhatsApp message to:", phoneNumber);

      const response = await axios.post(
        `${baseUrl}/api/whatsapp/send-wp`,
        {
          to: phoneNumber,
          email: userData.personalDetails.email, // ✅ Send email separately
          message:
            `*Payment Invoice*\n\n` +
            `Package: ${submission.package}\n` +
            `Amount: ${submission.amount} ${submission.currency}\n\n` +
            `Pay here: ${paymentUrl}`,
          package: submission.package,
          amount: submission.amount,
          currency: submission.currency, // ✅ Added currency
          formId,
          courseId,
          orderId,
          paymentUrl: paymentUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log("✅ WhatsApp API Response:", response.data);

      if (response.data.success) {
        setWhatsappStatus({
          type: "success",
          message: `WhatsApp message delivered successfully! Invoice Number: ${response.data.invoiceNumber}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        fetchPaymentHistory();
      } else {
        throw new Error(response.data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("❌ Error Sending WhatsApp Message:", error);

      setWhatsappStatus({
        type: "error",
        message: error.response?.data?.error || error.message,
      });
    } finally {
      setWhatsappLoading(false);
    }
  }, [paymentUrl, whatsappLoading, userData, submission]);

  const handleViewAkt = (payment) => {
    if (payment.status === "Paid" && userData) {
      const aktDetails = {
        full_name: `${userData.personalDetails.title} ${userData.personalDetails.firstName} ${userData.personalDetails.lastName}`,
        date_of_birth: new Date(
          userData.personalDetails.dob
        ).toLocaleDateString(),
        email: userData.email,
        phone_no: userData.personalDetails.phone || "N/A",
        agreement_number: `${payment.invoiceNumber}`,
        agreement_date: new Date().toLocaleDateString(),
        service_name: payment.package,
        total_amount: `${payment.amount} ${payment.currency}`,
        userData,
      };

      setAktData(aktDetails);
      setIsAktOpen(true);
    }
  };

  const handleCloseAkt = () => {
    setIsAktOpen(false);
  };

  const handleViewContract = (payment) => {
    if (userData) {
      // Removed the check for payment status
      const aktDetails = {
        full_name: `${userData.personalDetails.title} ${userData.personalDetails.firstName} ${userData.personalDetails.lastName}`,
        date_of_birth: new Date(
          userData.personalDetails.dob
        ).toLocaleDateString(),
        email: userData.email,
        phone_no: userData.personalDetails.phone || "N/A",
        agreement_number: `${payment.invoiceNumber}`,
        agreement_date: new Date().toLocaleDateString(),
        service_name: payment.package,
        total_amount: `${payment.amount} ${payment.currency}`,
        userData,
      };

      setContractData(aktDetails);
      setIsContractOpen(true);
    }
  };

  const handleCloseContract = () => {
    setIsContractOpen(false);
  };

  const handleMethodChange = (method) => {
    setSelectedMethod(method);

    setItems(
      items.map((item) => ({
        ...item,
        currency: method === "stripe" ? "INR" : "RUP",
      }))
    );
  };

  // Update the handleItemChange function for currency changes
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "amount" ? parseFloat(value) || 0 : value,
    };
    setItems(updatedItems);

    // When currency changes, update payment method if needed
    if (field === "currency") {
      const compatibleMethod = paymentMethods.find((method) =>
        method.currencies.includes(value)
      );
      if (compatibleMethod && compatibleMethod.id !== selectedMethod) {
        setSelectedMethod(compatibleMethod.id);
      }
    }
  };

  // Add this function to your component
  const isCurrentMethodValid = () => {
    const method = paymentMethods.find((m) => m.id === selectedMethod);
    return method?.currencies.includes(items[0]?.currency);
  };

  return (
    <>
    <ToastContainer     className="custom-toast-container"/>
      <div
        className={`invoice-modal-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      ></div>
      <div className={`invoice-modal ${isOpen ? "open" : ""}`}>
        <button className="close-modal-btn" onClick={onClose}>
          &times;
        </button>

        <div className="payment-method-selector">
          <h4>{t("InvoiceModal.paymentMethod")}</h4>
          <select
            value={selectedMethod}
            onChange={(e) => handleMethodChange(e.target.value)}
            className="payment-method-dropdown"
          >
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>

        <div className="items-container">
          <h4>{t("InvoiceModal.item")}</h4>
          {items.map((item, index) => (
            <div key={index} className="item-row">
              <input
                type="text"
                value={item.name}
                onChange={(e) =>
                  handleItemChange(index, "name", e.target.value)
                }
                placeholder="Item Name"
              />
              <input
                type="number"
                min="0"
                value={item.amount}
                onChange={(e) =>
                  handleItemChange(index, "amount", e.target.value)
                }
                placeholder="Amount"
              />
              <span className="currency-type">{currency}</span>
              <button className="invoice-delete-btn" onClick={() => removeItem(index)}>
                <FaTrashAlt />
              </button>
            </div>
          ))}
          <button className="add-items-btn" onClick={addNewItem}>
            + {t("InvoiceModal.addItem")}
          </button>
        </div>

        <h3 className="invoice-total-amt">
          {t("InvoiceModal.addItem")}: {totalAmount.toFixed(2)} {currency}
        </h3>

        <button onClick={handlePayment} disabled={loading || totalAmount <= 0}>
          {loading
            ? t("InvoiceModal.generateLink")
            : t("InvoiceModal.generateLink")}
        </button>

        {paymentUrl && (
          <div className="payment-details">
            <div className="payment-info">
              <p>
                {t("InvoiceModal.paymentLink")}:{" "}
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                  View Link
                </a>
              </p>
            </div>

            <div className="invoice-send-actions">
              <button onClick={handleSendEmail} disabled={emailSending}>
                <FaEnvelope /> {emailSending ? "Sending..." : "Send via Email"}
              </button>

              <button
                className="send-invoice-btn whatsapp-btn"
                onClick={handleSendWhatsApp}
                disabled={whatsappLoading}
              >
                <FaWhatsapp className="whatsapp-icon" />
                {whatsappLoading ? "Sending..." : "Send via WhatsApp"}
              </button>

              {whatsappStatus && (
                <div className={`whatsapp-status ${whatsappStatus.type}`}>
                  <div className="status-header">
                    {whatsappStatus.type === "success" ? (
                      <FaCheckCircle twoToneColor="#52c41a" />
                    ) : (
                      <FaTimesCircle twoToneColor="#ff4d4f" />
                    )}
                    <span>{whatsappStatus.message}</span>
                  </div>
                  {whatsappStatus.timestamp && (
                    <div className="status-timestamp">
                      <small>Sent at: {whatsappStatus.timestamp}</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="payment-history">
          <h3>{t("InvoiceModal.paymentHistory")}</h3>
          {error ? (
            <p className="error-message">{error}</p>
          ) : paymentHistory.length > 0 ? (
            <ul className="payment-info-list">
              {paymentHistory.map((payment, index) => (
                <li key={index} className="payment-info-item">
                  <div>
                    <p>
                      <strong>{t("InvoiceModal.invoiceNumber")}:</strong>{" "}
                      {payment.invoiceNumber}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.package")}:</strong>{" "}
                      {payment.package}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.amount")}:</strong>{" "}
                      {payment.amount} {payment.currency}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.status")}:</strong>{" "}
                      {payment.status}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.date")}:</strong> {payment.time}
                    </p>
                    <a
                      href={payment.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("InvoiceModal.paymentLink")}
                    </a>
                  </div>

                  <div className="payment-actions">
                    {/* AKT Button - Only Available for Paid Invoices */}
                    <button
                      onClick={() => handleViewAkt(payment)}
                      disabled={payment.status !== "Paid"}
                      className={
                        payment.status === "Paid" ? "btn-paid" : "btn-disabled"
                      }
                      title={
                        payment.status !== "Paid"
                          ? "AKT only available for paid invoices"
                          : ""
                      }
                    >
                      {t("InvoiceModal.akt")}
                    </button>

                    {/* Contract Button - Always Enabled */}
                    <button
                      onClick={() => handleViewContract(payment)}
                      className="btn-paid" // Always show as enabled
                    >
                      {t("InvoiceModal.contract")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("InvoiceModal.noSubmissions")}</p>
          )}
        </div>

        {showPopup && (
          <div className="popup">✅ {t("InvoiceModal.successPopup")}</div>
        )}
      </div>
      {isAktOpen && aktData && (
        <div className="akt-fullscreen-overlay">
          <AktDocument data={aktData} onClose={handleCloseAkt} />
        </div>
      )}

      {isContractOpen && contractData && (
        <div className="akt-fullscreen-overlay">
          <ContractDocument data={contractData} onClose={handleCloseContract} />
        </div>
      )}
      
    </>
  );
};

export default InvoiceModal;
