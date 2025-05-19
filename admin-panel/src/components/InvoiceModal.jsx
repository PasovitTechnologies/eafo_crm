import React, { useState, useEffect } from "react";
import axios from "axios";
import "./InvoiceModal.css";
import {
  FaEnvelope,
  FaWhatsapp,
  FaTrashAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaRegCopy,
} from "react-icons/fa"; // Import icons

import AktDocument from "./AktDocument";
import { useTranslation } from "react-i18next";
import ContractDocument from "./ContractDocument";
import { useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const InvoiceModal = ({ submission, isOpen, onClose, formId, courseId, discountCode, discountPercentage}) => {
  const [items, setItems] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [coursePayments, setCoursePayments] = useState([]);
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
  const percentage = discountPercentage

  console.log(percentage)

  const paymentMethods = [
    {
      id: "stripe",
      name: "Stripe",
      currencies: ["INR"],
      defaultCurrency: "INR",
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
      const currency = submission.currency || "INR";

      setItems(
        submission.package && submission.amount
          ? [
              {
                name: submission.package,
                amount: parseFloat(submission.amount) || 0,
                currency,
                percentage: submission.discountPercentage
              },
            ]
          : [{ name: "", amount: 0, currency }]
      );

      // Set initial payment method based on currency
      if (currency === "RUB") {
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
        fetchCoursePayments();
      }
    }
  }, [isOpen, submission, courseId]);

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${baseUrl}/api/user/${submission.email}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const course = response.data.courses.find((c) => c.courseId === courseId);
      if (!course?.payments) {
        setPaymentHistory([]);
        return;
      }
      setPaymentHistory(
        course.payments.map((payment) => ({
          ...payment,
          time: payment.time ? new Date(payment.time).toLocaleString() : "N/A",
        }))
      );
      setUserData(response.data);
    } catch (error) {
      console.error("Payment history error:", error);
      setError(
        error.response?.data?.message || "Failed to fetch payment history"
      );
    }
  };

  const fetchCoursePayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${baseUrl}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoursePayments(response.data.payments || []);
    } catch (error) {
      console.error("Course payments error:", error);
      setCoursePayments([]);
    }
  };

  const getRealPaymentStatus = (payment) => {
    if (!payment || !payment.invoiceNumber) {
      console.log("⚠️ Missing payment or invoice number");
      return "unknown";
    }
  
    const coursePayment = coursePayments.find(
      (cp) => cp.invoiceNumber === payment.invoiceNumber
    );
  
    const status = coursePayment?.status || payment.status || "unknown";
    const normalizedStatus = status.toLowerCase();
  
    console.log(
      `🧾 Checking status for invoice ${payment.invoiceNumber}:`,
      status,
      "→ normalized:",
      normalizedStatus
    );
  
    return normalizedStatus;
  };
  

  const addNewItem = () => {
    setItems([
      ...items,
      { name: "", amount: 0, currency: items[0]?.currency || "INR" },
    ]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const currency = items[0]?.currency || "INR";

  const rawTotal = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  
  const totalAmount = discountPercentage
    ? rawTotal - (rawTotal * discountPercentage) / 100
    : rawTotal;

  
  


  const handlePayment = async () => {
    if (!submission.email || items.length === 0 || totalAmount <= 0) {
      setError(
        "Please ensure email is available and items have valid amounts."
      );
      console.error("Validation failed:", {
        email: submission.email,
        items,
        totalAmount,
      });
      return;
    }

    setLoading(true);
    setError(null);

    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit

    const orderDetails = {

      amount: totalAmount,
      currency: selectedMethod === "stripe" ? "INR" : "RUB",
      email: submission.email,
      course: items.map((item) => item.name).join(", "),
      returnUrl: "http://localhost:3000/payment-success",
      failUrl: "http://localhost:3000/payment-failed",
      orderNumber, // <-- ADD THIS
    };

    console.log("Initiating payment with details:", orderDetails);

    try {
      const endpoint =
        selectedMethod === "stripe"
          ? `${baseUrl}/api/stripe/create-payment-link`
          : `${baseUrl}/api/payment/alfabank/pay`;

      console.log("Selected payment endpoint:", endpoint);

      const response = await axios.post(endpoint, orderDetails, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Payment response received:", response.data);

      if (response.data.success) {
        toast.success("Payment link generated");
        setPaymentUrl(response.data.paymentUrl);
        setOrderId(response.data.orderId);
      } else {
        console.error("Payment failed with message:", response.data.message);
        setError(response.data.message || "Payment failed.");
      }
    } catch (error) {
      console.error(
        "Payment request error:",
        error.response?.data || error.message
      );
      setError(error.response?.data?.message || "Payment request failed.");
    } finally {
      setLoading(false);
      console.log("Payment process completed");
    }
  };

  const handleSendEmail = async () => {
    if (!submission?.email) {
      console.error("❌ Missing recipient email.");
      return;
    }

    if (!paymentUrl) {
      alert(
        "❌ No payment URL generated. Please generate a payment link first."
      );
      return;
    }

    // Extract package, amount, currency
    const packageName = items.map((item) => item.name).join(", ");
    const amount = totalAmount.toFixed(2);
    const currency = items[0]?.currency || "INR";

    const emailData = {
      courseId,
      formId,
      orderId,
      paymentUrl,
      transactionId: submission.transactionId,
      email: submission.email,
      package: packageName,
      amount:rawTotal.toFixed(2),
      currency,
      payableAmount: amount,
      discountPercentage: discountPercentage || 0,
      code:discountCode
    };

    try {
      setEmailSending(true);

      const response = await axios.post(
        `${baseUrl}/api/email/send`,
        emailData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        console.log("✅ Invoice email sent successfully:", response.data);
        setShowPopup(true);
        fetchPaymentHistory();
        setPaymentUrl("");
      } else {
        console.error(
          "❌ Failed to send invoice email:",
          response.data.message
        );
      }
    } catch (error) {
      console.error(
        "❌ Error sending email request:",
        error.response?.data || error.message
      );
      alert(
        `❌ Error: ${error.response?.data?.message || "Failed to send invoice"}`
      );
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendWhatsApp = useCallback(async () => {
    if (whatsappLoading) return;

    if (!paymentUrl) {
      alert("❌ No payment URL generated. Please generate it first!");
      return;
    }

    if (!userData?.personalDetails?.phone) {
      alert("❌ No phone number available.");
      return;
    }

    const phoneNumber = userData.personalDetails.phone.replace(/\D/g, "");

    if (!/^\d{10,15}$/.test(phoneNumber)) {
      alert("❌ Invalid phone number format.");
      return;
    }

    if (!courseId || !orderId) {
      alert("❌ Missing required details.");
      return;
    }

    // Extract package details
    const packageName = items.map((item) => item.name).join(", ");
    const amount = totalAmount.toFixed(2);
    const currency = items[0]?.currency || "INR";

    const message = `*Payment Invoice* 📩
    
  💼 *Package:* ${packageName}
  💰 *Amount:* ${amount} ${currency}
  🔗 *Payment Link:* ${paymentUrl}`;

    setWhatsappLoading(true);
    setWhatsappStatus(null);

    try {
      const response = await axios.post(
        `${baseUrl}/api/whatsapp/send-wp`,
        {
          to: phoneNumber,
          email: submission.email,
          message,
          formId,
          courseId,
          orderId,
          paymentUrl,
          transactionId: submission.transactionId,
          package: packageName,
          amount:rawTotal.toFixed(2),
          currency,
          payableAmount:amount,
          discountPercentage: discountPercentage || 0,
          code:discountCode

        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        setWhatsappStatus({
          type: "success",
          message: `WhatsApp message delivered! Invoice: ${response.data.invoiceNumber}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        fetchPaymentHistory();
        setTimeout(() => {
          setPaymentUrl("");
        }, 1000);
      } else {
        throw new Error(
          response.data.error || "Failed to send WhatsApp message"
        );
      }
    } catch (error) {
      setWhatsappStatus({
        type: "error",
        message: error.response?.data?.error || error.message,
      });
    } finally {
      setWhatsappLoading(false);
    }
  }, [paymentUrl, whatsappLoading, userData, submission, items, totalAmount]);

  const handleViewAkt = (payment) => {
    console.log("🧾 handleViewAkt clicked", payment); // ✅ Debug log
  
    if (getRealPaymentStatus(payment) === "paid" && userData) {
      console.log("✅ Valid paid payment, opening AKT modal");
  
      const aktDetails = {
        full_name: `${userData.personalDetails.title} ${userData.personalDetails.firstName} ${userData.personalDetails.lastName}`,
        date_of_birth: new Date(userData.personalDetails.dob).toLocaleDateString(),
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
    } else {
      console.warn("❌ Not a paid payment or userData missing", {
        status: getRealPaymentStatus(payment),
        userData,
      });
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
        currency: method === "stripe" ? "INR" : "RUB",
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

  const handleResendEmail = async (payment) => {
    const recipientEmail = payment?.email || submission?.email;
    if (!recipientEmail) {
      toast.error("Recipient email missing");
      return;
    }
  
    try {
      setEmailSending(true);
      const response = await axios.post(
        `${baseUrl}/api/email/resend`,
        {
          invoiceNumber: payment.invoiceNumber,
          email: recipientEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
  
      if (response.data.success) {
        toast.success("Email resent successfully");
        fetchPaymentHistory(); // refresh list
      } else {
        toast.error(response.data.message || "Failed to resend email");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error resending email");
    } finally {
      setEmailSending(false);
    }
  };

  requestAnimationFrame(() => {
    const modal = document.querySelector('.invoice-modal');
    modal?.scrollTo(0, modal.scrollHeight);
  });
  
  

  const handleResendWhatsApp = async (payment) => {
    const phone = userData?.personalDetails?.phone;
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
  
    if (!payment?.invoiceNumber) {
      toast.error("Invoice number missing");
      return;
    }
  
    try {
      setWhatsappLoading(true);
      const response = await axios.post(
        `${baseUrl}/api/whatsapp/resend-whatsapp`,
        {
          phone,
          invoiceNumber: payment.invoiceNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
  
      if (response.data.success) {
        toast.success("WhatsApp message resent");
        fetchPaymentHistory();
      } else {
        toast.error(response.data.message || "Failed to resend WhatsApp");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error resending WhatsApp");
    } finally {
      setWhatsappLoading(false);
    }
  };
  

  return (
    <>
      <ToastContainer className="custom-toast-container" />
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
              <button
                className="invoice-dlt-btn"
                onClick={() => removeItem(index)}
              >
                <FaTrashAlt />
              </button>
            </div>
          ))}
          <button className="add-items-btn" onClick={addNewItem}>
            + {t("InvoiceModal.addItem")}
          </button>
        </div>

        <div className="invoice-total-amt">
  {discountPercentage ? (
    <>
      <p>
        <strong>Original Total:</strong>{" "}
        <span style={{ textDecoration: "line-through", color: "gray" }}>
          {rawTotal.toFixed(2)} {currency}
        </span>
      </p>
      <p>
        <strong>Discount ({discountPercentage}%):</strong>{" "}
        {(rawTotal - totalAmount).toFixed(2)} {currency}
      </p>
      <p>
        <strong>Total after Discount:</strong> {totalAmount.toFixed(2)} {currency}
      </p>
    </>
  ) : (
    <p>
      <strong>Total:</strong> {totalAmount.toFixed(2)} {currency}
    </p>
  )}
</div>



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
                      {payment.payableAmount} {payment.currency}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.status")}:</strong>{" "}
                      {getRealPaymentStatus(payment)}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.date")}:</strong> {payment.time}
                    </p>

                    <div className="payment-link-container">
                      <a
                        href={payment.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("InvoiceModal.paymentLink")}
                      </a>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(payment.paymentLink);
                          toast.success("Link copied!");
                        }}
                        className="copy-button"
                        title={t("InvoiceModal.copyLink")}
                      >
                        <FaRegCopy size={18} />
                      </button>
                    </div>
                    <div className="buttons-container">

                    <div className="payment-actions">
                    {/* AKT Button - Only if paid */}
                    <button
  onClick={() => handleViewAkt(payment)}
  disabled={getRealPaymentStatus(payment) !== "paid"}
  className={
    getRealPaymentStatus(payment) === "paid"
      ? "btn-paid"
      : "btn-disabled"
  }
>
  {t("InvoiceModal.akt")}
</button>


                    {/* Contract Button - Always enabled */}
                    <button
                      onClick={() => handleViewContract(payment)}
                      className="btn-paid"
                    >
                      {t("InvoiceModal.contract")}
                    </button>
                  </div>


                    {payment.paymentLink && (
  <div className="resend-actions">
    <button
      onClick={() => handleResendEmail(payment)}
      className="email-resend-btn resend-btn"
      title="Resend via Email"
      disabled={emailSending}
    >
      <FaEnvelope size={18} />
      {emailSending && (
        <span className="resend-loading">Sending...</span>
      )}
    </button>

    <button
      onClick={() => handleResendWhatsApp(payment)}
      className="whatsapp-resend-btn resend-btn"
      title="Resend via WhatsApp"
      disabled={whatsappLoading}
    >
      <FaWhatsapp size={18} />
      {whatsappLoading && (
        <span className="resend-loading">Sending...</span>
      )}
    </button>
  </div>
)}

                  </div>

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
