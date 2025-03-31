import React, { useState, useEffect } from "react";
import axios from "axios";
import "./InvoiceModal.css";
import { FaEnvelope, FaWhatsapp, FaTrashAlt } from "react-icons/fa"; // Import icons
import AktDocument from "./AktDocument";
import { useTranslation } from "react-i18next";
import ContractDocument from "./ContractDocument";

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
  const { t } = useTranslation();  // Translation hook
  const baseUrl = import.meta.env.VITE_BASE_URL;


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

      setSelectedMethod(currency === "RUP" ? "alfabank" : "stripe");
      setPaymentUrl("");
      setOrderId("");
      setError(null);

      if (submission.email && courseId) {
        fetchPaymentHistory();
      }
    }
  }, [isOpen, submission, courseId]);

  const fetchPaymentHistory = async () => {
    if (!submission?.email || !courseId || !formId) {
      setError("Invalid submission or missing course ID.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No token found. Please log in.");
        return;
      }

      const response = await axios.get(
        `${baseUrl}/user/${submission.email}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.courses) {
        setUserData(response.data);
        const courses = response.data.courses;
        const matchingCourse = courses.find(
          (course) => course.courseId === courseId
        );

        if (matchingCourse && matchingCourse.payments?.length > 0) {
          const payments = matchingCourse.payments.map((payment) => ({
            invoiceNumber: payment.invoiceNumber || "N/A",
            paymentId: payment.paymentId || "N/A",
            paymentLink: payment.paymentLink || "#",
            package: payment.package || "Unknown",
            amount: payment.amount || 0,
            currency: payment.currency || "USD",
            status: payment.status || "Unknown",
            time: new Date(payment.time).toLocaleString(),
          }));

          setPaymentHistory(payments);
          setError(null);
        } else {
          setPaymentHistory([]);
          setError("No payment history found for this course and form.");
        }
      } else {
        setError("Failed to fetch payment history.");
      }
    } catch (error) {
      setError("Failed to fetch payment history.");
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "amount" ? parseFloat(value) || 0 : value,
    };
    setItems(updatedItems);
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
      currency,
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
    console.log("📤 Email send is started...");
  
    if (!submission?.email) {
      alert("❌ No recipient email found.");
      console.error("❌ Missing recipient email.");
      return;
    }
  
    if (!paymentUrl) {
      alert("❌ No payment URL generated. Please generate a payment link first.");
      console.error("❌ Payment URL is missing.");
      return;
    }
  
    // Constructing email payload
    const emailData = {
      formId,
      courseId,
      orderId,
      package: submission.package,
      amount: submission.amount,
      currency: submission.currency,
      recipients: [
        {
          email: submission.email,
          name: submission.email.split("@")[0],
        },
      ],
      mail: {
        subject: "Your Payment Invoice from EAFO",
        previewTitle: "Payment Details",
        html: `
          <h2>Dear ${submission.email.split("@")[0]},</h2>
          <p>We have generated an invoice for your registration.</p>
          <p><strong>Package:</strong> ${submission.package}</p>
          <p><strong>Amount:</strong> ${submission.amount} ${submission.currency}</p>
          <p>Click the link below to complete your payment:</p>
          <a href="${paymentUrl}" style="font-size:16px; color:blue;">Complete Payment</a>
          <br><br>
          <p>Best regards,<br>EAFO Team</p>
        `,
      },
      paymentUrl,
    };
  
    console.log("📥 Sending Email Data:", JSON.stringify(emailData, null, 2));
  
    try {
      const response = await axios.post(
        `${baseUrl}/api/email/send`,
        emailData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`, // Added Authorization header
          },
        }
      );
  
      if (response.data.success) {
        console.log("✅ Email sent successfully:", response.data);
        setShowPopup(true);
        fetchPaymentHistory();
        setPaymentUrl("");
        alert("✅ Payment link sent successfully via Email!");
      } else {
        console.error("❌ Failed emails:", response.data.results.filter(r => r.status === "Failed"));
        alert("❌ Some emails failed to send. Check console for details.");
      }
    } catch (error) {
      console.error("❌ Email sending error:", error.response?.data || error.message);
  
      if (error.response) {
        alert(`❌ Error: ${error.response.data.message || "Failed to send email"}`);
      } else {
        alert("❌ An unexpected error occurred while sending email.");
      }
    }
  };
  


  const handleSendWhatsApp = async () => {
    if (!paymentUrl) {
      alert("❌ No payment URL generated. Please generate a payment link first.");
      return;
    }
  
    if (!userData?.personalDetails?.phone) {
      alert("❌ Recipient phone number not found.");
      return;
    }
  
    // Format phone number (remove all non-digit characters)
    const phoneNumber = userData.personalDetails.phone.replace(/\D/g, '');
  
    const message = `*Payment Invoice*\n\n` +
      `Package: ${submission.package}\n` +
      `Amount: ${submission.amount} ${submission.currency}\n\n` +
      `Pay here: ${paymentUrl}`;
  
    try {
      const response = await axios.post(
        `${baseUrl}/api/whatsapp/send`, // Relative path to your backend endpoint
        {
          to: phoneNumber,
          message: message
        }
        // No need for headers here - axios will automatically include the JWT 
        // if you've set it up with an interceptor or default headers
      );
  
      if (response.data.status === 'success') {
        alert("✅ WhatsApp message sent successfully!");
      } else {
        throw new Error(response.data.detail || 'Failed to send message');
      }
    } catch (error) {
      console.error("WhatsApp Error:", error.response?.data || error.message);
      alert(`❌ Failed to send WhatsApp: ${error.response?.data?.detail || error.message}`);
    }
  };
  

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

      setContractData(aktDetails);
      setIsContractOpen(true);
    }
  };

  const handleCloseContract = () => {
    setIsContractOpen(false);
  };

  return (
    <>
      <div
        className={`invoice-modal-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      ></div>
      <div className={`invoice-modal ${isOpen ? "open" : ""}`}>
        <button className="close-modal-btn" onClick={onClose}>
          &times;
        </button>

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
              <span>{currency}</span>
              <button className="delete-icon" onClick={() => removeItem(index)}>
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
          {loading ? t("InvoiceModal.generateLink") : t("InvoiceModal.generateLink")}
        </button>

        {paymentUrl && (
          <div className="payment-details">
            <div className="payment-info">
              <p>{t("InvoiceModal.orderId")}: {orderId}</p>
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

              <button className="send-invoice-btn">
                Send Via
                <FaWhatsapp
                  className="whatsapp-icon send-icon"
                  onClick={handleSendWhatsApp}
                  title="Send via WhatsApp"
                />
              </button>
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
                      <strong>{t("InvoiceModal.invoiceNumber")}:</strong> {payment.invoiceNumber}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.package")}:</strong> {payment.package}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.amount")}:</strong> {payment.amount}{" "}
                      {payment.currency}
                    </p>
                    <p>
                      <strong>{t("InvoiceModal.status")}:</strong> {payment.status}
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
                      {payment.status === "Paid" ? t("InvoiceModal.akt") : t("InvoiceModal.akt")}
                    </button>
                    
                    <button
                      onClick={() => handleViewContract(payment)}
                      disabled={payment.status !== "Paid"}
                      className={
                        payment.status === "Paid" ? "btn-paid" : "btn-disabled"
                      }
                      title={
                        payment.status !== "Paid"
                          ? "Contract only available for paid invoices"
                          : ""
                      }
                    >
                      {payment.status === "Paid" ? t("InvoiceModal.contract") : t("InvoiceModal.contract")}
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
