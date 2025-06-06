import React, { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import Select from "react-select";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./InvoiceCreator.css";
import { useTranslation } from "react-i18next";


const InvoiceCreator = ({ onClose, courseId }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([
    { name: "", quantity: 1, amount: 0, currency: "RUB" },
  ]);
  const [selectedMethod, setSelectedMethod] = useState("alfabank");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [orderId, setOrderId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const { t } = useTranslation();
  

  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const courseRes = await fetch(`${baseUrl}/api/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!courseRes.ok) throw new Error("Failed to fetch course");
        const courseData = await courseRes.json();
        const paymentEmails = courseData.payments
          ?.filter((p) => !!p.email)
          .map((p) => p.email);
        const uniqueEmails = Array.from(new Set(paymentEmails));
        const userOptions = uniqueEmails.map((email) => ({
          value: email,
          label: email,
        }));
        setUsers(userOptions);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (courseId) {
      fetchUsers();
    }
  }, [courseId]);

  const handleAddItem = () => {
    const currency = selectedMethod === "alfabank" ? "RUB" : "INR";
    setItems([...items, { name: "", quantity: 1, amount: 0, currency }]);
  };

  const handleRemoveItem = (indexToRemove) => {
    if (items.length > 1) {
      setItems(items.filter((_, index) => index !== indexToRemove));
    } else {
      toast.warning("You need at least one item in the invoice");
    }
  };

  const handlePayment = async () => {
    const email = selectedUser?.value;
    if (
      !email ||
      items.length === 0 ||
      items.some((i) => !i.name || !i.amount)
    ) {
      toast.error("Please fill all item fields and select a user");
      return;
    }

    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const currency = selectedMethod === "alfabank" ? "RUB" : "INR";
    const amount = items.reduce((acc, i) => acc + i.amount * i.quantity, 0);
    const method = selectedMethod;
    const packages = items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      amount: i.amount,
      currency,
    }));

    const orderDetails = {
      amount,
      currency,
      email,
      course: courseId,
      returnUrl: `${window.location.origin}/payment-success`,
      failUrl: `${window.location.origin}/payment-failed`,
      orderNumber: orderNumber,
    };

    setLoading(true);
    setError(null);

    try {
      const endpoint =
        method === "stripe"
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
        toast.success("✅ Payment link generated!");
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
    if (!selectedUser?.value || !paymentUrl || !orderId) {
      return toast.error("Missing required data for email");
    }

    const emailData = {
      email: selectedUser.value,
      courseId,
      orderId,
      paymentUrl,
      transactionId: Math.floor(100000 + Math.random() * 900000).toString(),
      packages: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        amount: i.amount,
        currency: selectedMethod === "alfabank" ? "RUB" : "INR",
      })),
      currency: selectedMethod === "alfabank" ? "RUB" : "INR",
      totalAmount: items.reduce((acc, i) => acc + i.amount * i.quantity, 0),
    };

    setEmailSending(true);

    try {
      const res = await axios.post(
        `${baseUrl}/api/email/send-email`,
        emailData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data.success) {
        toast.success("📧 Email sent successfully!");
      } else {
        toast.error(res.data.message || "Email sending failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedUser?.value || !paymentUrl || !orderId) {
      return toast.error("Missing required data for WhatsApp");
    }

    const wpData = {
      to: selectedUser.value,
      message: `Please complete your payment: ${paymentUrl}`,
      courseId,
      orderId,
      transactionId: Math.floor(100000 + Math.random() * 900000).toString(),
      paymentUrl,
      email: selectedUser.value,
      packages: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        amount: i.amount,
        currency: selectedMethod === "alfabank" ? "RUB" : "INR",
      })),
      currency: selectedMethod === "alfabank" ? "RUB" : "INR",
      payableAmount: items.reduce((acc, i) => acc + i.amount * i.quantity, 0),
    };

    try {
      const res = await axios.post(`${baseUrl}/api/whatsapp/send-wp`, wpData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (res.data.success) {
        toast.success("📲 WhatsApp message sent!");
      } else {
        toast.error(res.data.message || "Failed to send WhatsApp message.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "WhatsApp error.");
    }
  };

  return (
    <div className="invoice-creator-modal-overlay">
      <ToastContainer className="custom-toast-container" />
      <div className="invoice-creator-modal-container">
        <button className="invoice-close-btn" onClick={onClose}>
          <AiOutlineClose size={20} />
        </button>

        <h2 className="invoice-title">{t("invoiceCreator.title")}</h2>

        <div className="invoice-section">
          <label className="invoice-label">{t("invoiceCreator.selectUser")}</label>
          <Select
            options={users}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder={t("invoiceCreator.searchUser")}
            className="invoice-select"
            classNamePrefix="invoice-select"
          />
        </div>

        <div className="invoice-section">
          <label className="invoice-label">{t("invoiceCreator.paymentMethod")}</label>
          <div className="payment-method-buttons">
          <button
              type="button"
              className={`method-btn ${selectedMethod === "alfabank" ? "active" : ""}`}
              onClick={() => {
                setSelectedMethod("alfabank");
                setItems(items.map((i) => ({ ...i, currency: "RUB" })));
              }}
            >
              AlfaBank (RUB)
            </button>
            <button
              type="button"
              className={`method-btn ${selectedMethod === "stripe" ? "active" : ""}`}
              onClick={() => {
                setSelectedMethod("stripe");
                setItems(items.map((i) => ({ ...i, currency: "INR" })));
              }}
            >
              Stripe (INR)
            </button>
          </div>
        </div>

        <div className="invoice-section">
          <h3 className="invoice-section-title">
            <span className="section-title-bar"></span>
            {t("invoiceCreator.items")}
          </h3>
          <div className="items-header">
            <span>{t("invoiceCreator.description")}</span>
            <span>{t("invoiceCreator.quantity")}</span>
            <span>{t("invoiceCreator.amount")}</span>
            <span>{t("invoiceCreator.currency")}</span>
          </div>

          {items.map((item, index) => (
            <div key={index} className="item-row">
              <input
                type="text"
                placeholder={t("invoiceCreator.description")}
                value={item.name}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].name = e.target.value;
                  setItems(updated);
                }}
                className="item-input"
              />
              <input
                type="number"
                placeholder="1"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].quantity = parseInt(e.target.value) || 1;
                  setItems(updated);
                }}
                className="item-input qty"
              />
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={item.amount}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].amount = parseFloat(e.target.value) || 0;
                  setItems(updated);
                }}
                className="item-input amount"
              />
              <input
                type="text"
                value={item.currency}
                disabled
                className="item-input currency"
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="remove-item-btn"
                disabled={items.length <= 1}
                title={t("invoiceCreator.removeItem")}
              >
                ×
              </button>
            </div>
          ))}

<div className="invoice-total-row">
  <span className="invoice-total-label">{t("invoiceCreator.totalAmount")}:</span>
  <span className="invoice-total-value">
    {items
      .reduce((acc, i) => acc + i.amount * i.quantity, 0)
      .toFixed(2)}{" "}
    {selectedMethod === "alfabank" ? "RUB" : "INR"}
  </span>
</div>


          <button
            className="add-item-btn"
            type="button"
            onClick={handleAddItem}
          >
            + {t("invoiceCreator.addItem")}
          </button>
        </div>

        <div className="invoice-actions">
          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className={`generate-btn ${loading ? "loading" : ""}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {t("invoiceCreator.generating")}
              </>
            ) : (
              t("invoiceCreator.generateLink")
            )}
          </button>

          {paymentUrl && (
            <div className="payment-link-container">
              <p className="payment-link-label">{t("invoiceCreator.paymentLink")}</p>
              <a
                href={paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="payment-link"
              >
                {paymentUrl}
              </a>
              <div className="share-buttons">
                <button
                  className="share-btn email"
                  onClick={handleSendEmail}
                  disabled={emailSending}
                >
                  {emailSending ? "Sending..." : <><i className="icon-email"></i> {t("invoiceCreator.email")}</>}
                </button>

                <button
                  className="share-btn whatsapp"
                  onClick={handleSendWhatsApp}
                >
                  <i className="icon-whatsapp"></i> {t("invoiceCreator.whatsapp")}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreator;
