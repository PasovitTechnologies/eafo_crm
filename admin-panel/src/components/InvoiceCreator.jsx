import React, { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import Select from "react-select";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./InvoiceCreator.css";
import { useTranslation } from "react-i18next";
import ContractDocument from "./ContractDocument";
import ReactDOMServer from "react-dom/server";
import html2pdf from "html2pdf.js";

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
  const [contractPdfBlob, setContractPdfBlob] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState();
  
  
  const { t } = useTranslation();
  const paymentCourseId = courseId
  console.log(paymentCourseId)

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

        const userOptions = await Promise.all(
          uniqueEmails.map(async (email) => {
            const userDetails = await fetchUserDetailsByEmail(email);
            const label = userDetails
              ? `${userDetails.fullName} (${email})`
              : email;
            return { value: email, label };
          })
        );

        setUsers(userOptions);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (courseId) {
      fetchUsers();
    }
  }, [courseId]);

  const fetchUserDetailsByEmail = async (email) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${baseUrl}/api/user/${email}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) throw new Error("User not found");
  
      const data = await response.json();
  
      const fullName = `${data.personalDetails?.firstName || ""} ${
        data.personalDetails?.middleName || ""
      } ${data.personalDetails?.lastName || ""}`.trim();
  
      const phone = data.personalDetails?.phone || "";
      const dob = data.personalDetails?.dob || "";
  
      // 🔍 Find existing payment with submittedAt
      const coursePayment = data.courses
        ?.find(c => c.courseId === courseId || c.courseId?._id === courseId)
        ?.payments?.[0]; // or use `.find()` with specific logic
  
      const submittedAt = coursePayment?.submittedAt || "";
  
      return { fullName, phone, dateOfBirth: dob, submittedAt };
    } catch (err) {
      console.error("❌ Error fetching user details:", err);
      return null;
    }
  };
  

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


    const generateContractPDFBlob = async (element) => {
      if (!element) return null;
  
      const options = {
        margin: 10,
        filename: "contract.pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: "mm", format: [210, 350], orientation: "portrait" },
      };
  
      return new Promise((resolve, reject) => {
        html2pdf()
          .from(element)
          .set(options)
          .outputPdf("blob")
          .then(resolve)
          .catch(reject);
      });
    };


  const handlePayment = async () => {
    const email = selectedUser?.value;
    const fullName = selectedUser?.label?.split("(")[0]?.trim();
    const amount = items.reduce((acc, i) => acc + i.amount * i.quantity, 0);
  
    if (!email || items.length === 0 || items.some((i) => !i.name || !i.amount)) {
      toast.error("Please fill all item fields and select a user");
      return;
    }

    const userDetails = await fetchUserDetailsByEmail(email);
  const phone = userDetails?.phone || "";
  const dob = userDetails?.dateOfBirth || "";
  const submittedAt = userDetails?.submittedAt || new Date().toISOString();

  
    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const transactionId = Math.floor(100000 + Math.random() * 900000).toString();
    const currency = selectedMethod === "alfabank" ? "RUB" : "INR";
  
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
      courseId: paymentCourseId,
      returnUrl: `${window.location.origin}/payment-success`,
      failUrl: `${window.location.origin}/payment-failed`,
      orderNumber,
      transactionId,
      packages,
    };
  
    setLoading(true);
    setError(null);
  
    try {
      const endpoint =
        selectedMethod === "stripe"
          ? `${baseUrl}/api/stripe/create-payment-link`
          : `${baseUrl}/api/payment/invoice-creator/alfabank/pay`;
  
      const response = await axios.post(endpoint, orderDetails, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
  
      if (response.data.success) {
        const resolvedOrderId = response.data.orderId || orderNumber;
        const resolvedInvoiceNumber = response.data.invoiceNumber || `EAFO-${resolvedOrderId}`;
        
        toast.success("✅ Payment link generated!");
        setPaymentUrl(response.data.paymentUrl);
        setInvoiceNumber(response.data.invoiceNumber);
        setOrderId(resolvedOrderId);
  
        // Generate contract
        const htmlString = ReactDOMServer.renderToStaticMarkup(
          <ContractDocument
            data={{
              full_name: fullName,
              email,
              phone_no: "", // optional, populate if you have userData
              agreement_number: resolvedInvoiceNumber,
              agreement_date: new Date().toISOString(),
              submitted_date: submittedAt,
              packages,
              total_amount: amount.toFixed(2),
              date_of_birth: dob, // optional
            }}
          />
        );
  
        const tempDiv = document.createElement("div");
        tempDiv.style.display = "none";
        tempDiv.innerHTML = htmlString;
        document.body.appendChild(tempDiv);
  
        const contractElement = tempDiv.querySelector(".contract-content");
  
        if (contractElement) {
          try {
            const blob = await generateContractPDFBlob(contractElement);
            setContractPdfBlob(blob);
          } catch (e) {
            console.error("PDF generation failed", e);
          }
        }
  
        document.body.removeChild(tempDiv);
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
    if (!selectedUser?.value || !contractPdfBlob || !paymentUrl || !orderId) {
      alert("❌ Missing email, payment link, or contract PDF");
      console.error("❌ Missing input:", {
        email: selectedUser?.value,
        paymentUrl,
        contractPdfBlob,
        orderId,
      });
      return;
    }
  
    const userDetails = await fetchUserDetailsByEmail(selectedUser.value);
    const phone = userDetails?.phone || "";
    const dob = userDetails?.dateOfBirth || "";
    const submittedAt = userDetails?.submittedAt || new Date().toISOString();
    const fullName = selectedUser?.label?.split("(")[0]?.trim();
  
    const packages = items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      amount: i.amount,
      currency: selectedMethod === "alfabank" ? "RUB" : "INR",
    }));
  
    const totalAmount = items.reduce((acc, i) => acc + i.amount * i.quantity, 0);
    const currency = selectedMethod === "alfabank" ? "RUB" : "INR";
  
    try {
      setEmailSending(true);
  
      const pdfFile = new File([contractPdfBlob], `Contract_${orderId}.pdf`, {
        type: "application/pdf",
      });
  
      const formData = new FormData();
      formData.append("contract", pdfFile);
      formData.append("email", selectedUser.value);
      formData.append("courseId", courseId);
      formData.append("orderId", orderId);
      formData.append("paymentUrl", paymentUrl);
      formData.append("transactionId", transactionId || "");
      formData.append("packages", JSON.stringify(packages));
      formData.append("currency", currency);
      formData.append("payableAmount", totalAmount.toFixed(2));
      formData.append("invoiceNumber", invoiceNumber); // or response.invoiceNumber if available
  
      // Optional fields
      formData.append("fullName", fullName);
      formData.append("phone", phone);
      formData.append("dob", dob);
      formData.append("submittedAt", submittedAt);
  
      console.log("📤 Sending email with contract PDF...");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`🧷 ${key}: File → ${value.name}, size: ${value.size}`);
        } else {
          console.log(`🔑 ${key}: ${value}`);
        }
      }
  
      const response = await axios.post(`${baseUrl}/api/email/send`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
  
      if (response.data.success) {
        toast.success("✅ Email sent with contract PDF");
        console.log("📨 Email response:", response.data);
      } else {
        throw new Error(response.data.message || "Unknown error from server.");
      }
    } catch (err) {
      console.error("❌ Failed to send email:", err);
      alert("Failed to send email with contract. Check console for details.");
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
          <label className="invoice-label">
            {t("invoiceCreator.selectUser")}
          </label>
          <Select
            options={users}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder={t("invoiceCreator.searchUser")}
            className="invoice-select"
            classNamePrefix="invoice-select"
            filterOption={(option, input) =>
              option.label.toLowerCase().includes(input.toLowerCase()) ||
              option.value.toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        <div className="invoice-section">
          <label className="invoice-label">
            {t("invoiceCreator.paymentMethod")}
          </label>
          <div className="payment-method-buttons">
            <button
              type="button"
              className={`method-btn ${
                selectedMethod === "alfabank" ? "active" : ""
              }`}
              onClick={() => {
                setSelectedMethod("alfabank");
                setItems(items.map((i) => ({ ...i, currency: "RUB" })));
              }}
            >
              AlfaBank (RUB)
            </button>
            <button
              type="button"
              className={`method-btn ${
                selectedMethod === "stripe" ? "active" : ""
              }`}
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
            <span className="invoice-total-label">
              {t("invoiceCreator.totalAmount")}:
            </span>
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

          {contractPdfBlob && (
          <div className="contract-preview-wrapper">
            <button
              className="view-contract-btn"
              onClick={() => setShowPdfPreview(true)}
            >
              View Contract PDF
            </button>
          </div>
        )}
          

          {paymentUrl && (
            <div className="payment-link-container">
              <p className="payment-link-label">
                {t("invoiceCreator.paymentLink")}
              </p>
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
                  {emailSending ? (
                    "Sending..."
                  ) : (
                    <>
                      <i className="icon-email"></i> {t("invoiceCreator.email")}
                    </>
                  )}
                </button>

                <button
                  className="share-btn whatsapp"
                  onClick={handleSendWhatsApp}
                >
                  <i className="icon-whatsapp"></i>{" "}
                  {t("invoiceCreator.whatsapp")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {showPdfPreview && contractPdfBlob && (
        <div className="pdf-preview-overlay">
          <div className="pdf-preview-modal">
            <div className="pdf-header">
              <h3>Contract Preview</h3>
              <button
                onClick={() => setShowPdfPreview(false)}
                className="invoice-close-btn"
              >
                ✖
              </button>
            </div>
            <iframe
              src={URL.createObjectURL(contractPdfBlob)}
              className="pdf-iframe"
              title="Contract PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCreator;
