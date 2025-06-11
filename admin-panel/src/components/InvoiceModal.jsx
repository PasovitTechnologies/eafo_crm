import React, { useState, useEffect, useRef } from "react";
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
import Swal from "sweetalert2";
import RegistrationFormsViewer from "./RegistrationFormsViewer";
import ReactDOM from "react-dom";
import ReactDOMServer from "react-dom/server";
import html2pdf from "html2pdf.js";

const InvoiceModal = ({
  submission,
  isOpen,
  onClose,
  formId,
  courseId,
  discountCode,
  discountPercentage,
  fullName,
}) => {
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
  const [isFreeParticipant, setIsFreeParticipant] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showFormViewer, setShowFormViewer] = useState(false);
  const contractPreviewRef = useRef();
  const [contractPdfBlob, setContractPdfBlob] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isInvoiceOnlyMode, setIsInvoiceOnlyMode] = useState(false);
  const [viewedContractBlob, setViewedContractBlob] = useState(null);

  const { t } = useTranslation(); // Translation hook
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const percentage = discountPercentage;

  console.log(percentage);

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
      const currency =
        submission.packages?.[0]?.currency || submission.currency || "INR";

      if (submission.packages?.length > 0) {
        setItems(
          submission.packages.map((pkg) => ({
            name: pkg.name,
            amount: pkg.amount,
            currency: pkg.currency,
            quantity: pkg.quantity || 1,
          }))
        );
      } else {
        setItems([
          {
            name: submission.package || "",
            amount: parseFloat(submission.amount) || 0,
            currency,
            quantity: 1,
          },
        ]);
      }

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

      if (submission.status?.toLowerCase() === "free") {
        setIsFreeParticipant(true);
      } else {
        setIsFreeParticipant(false);
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
        return [];
      }

      const payments = course.payments.map((payment) => ({
        ...payment,
        time: payment.time ? new Date(payment.time).toLocaleString() : "N/A",
      }));

      setPaymentHistory(payments);
      setUserData(response.data);

      // ✅ Auto-set selectedPayment if available
      if (
        submission.invoiceNumber &&
        (!selectedPayment ||
          selectedPayment.invoiceNumber !== submission.invoiceNumber)
      ) {
        const currentInvoice = payments.find(
          (p) => p.invoiceNumber === submission.invoiceNumber
        );
        if (currentInvoice) {
          setSelectedPayment(currentInvoice);
        }
      }

      return payments;
    } catch (error) {
      console.error("Payment history error:", error);
      setError(
        error.response?.data?.message || "Failed to fetch payment history"
      );
      return [];
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
      {
        name: "",
        amount: 0,
        currency: items[0]?.currency || "INR",
        quantity: 1,
      },
    ]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const currency = items[0]?.currency || "INR";

  const rawTotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.amount) || 0) * (parseInt(item.quantity) || 1),
    0
  );

  const totalAmount = discountPercentage
    ? rawTotal - (rawTotal * discountPercentage) / 100
    : rawTotal;

    const generateContractPDFBlob = async (element) => {
      if (!element) return null;
    
      // Apply global font size to the element before converting
      element.style.fontSize = "10px";
    
      const options = {
        margin: 5,
        filename: "contract.pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
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

    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const currency = selectedMethod === "stripe" ? "INR" : "RUB";

    const orderDetails = {
      amount: totalAmount,
      currency,
      email: submission.email,
      transactionId: submission.transactionId,
      packages: items.map((item) => ({
        name: item.name,
        amount: parseFloat(item.amount),
        currency: item.currency,
        quantity: parseInt(item.quantity) || 1,
      })),
      courseId,
      formId,
      returnUrl: window.location.origin + "/payment-success",
      failUrl: window.location.origin + "/payment-failed",
      orderNumber,
    };

    console.log("📦 Initiating payment with:", orderDetails);

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
        const resolvedOrderId = response.data.orderId || orderNumber;
        const resolvedInvoiceNumber =
          response.data.invoiceNumber || `EAFO-${resolvedOrderId}`;

        toast.success("✅ Payment link generated");

        setPaymentUrl(response.data.paymentUrl);
        setOrderId(resolvedOrderId);

        // ✅ Set selectedPayment with generated invoice info
        setSelectedPayment({
          invoiceNumber: resolvedInvoiceNumber,
          totalAmount: totalAmount.toFixed(2),
          currency,
          time: new Date().toISOString(),
          paymentLink: response.data.paymentUrl,
          status: "pending",
          packages: items,
          email: submission.email,
        });

        // 👇 Create a temporary div for contract generation
        const htmlString = ReactDOMServer.renderToStaticMarkup(
          <ContractDocument
            data={{
              full_name: submission.fullName,
              email: submission.email,
              phone_no: userData?.personalDetails?.phone || "",
              agreement_number: resolvedInvoiceNumber,
              agreement_date: new Date().toISOString(),
              submitted_date: submission.submittedAt || "",
              packages: items,
              total_amount: totalAmount.toFixed(2),
              date_of_birth: userData?.personalDetails?.dob,
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
        console.error("❌ Payment failed:", response.data.message);
        setError(response.data.message || "Payment failed.");
      }
    } catch (error) {
      console.error("❌ Payment error:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Payment request failed.");
    } finally {
      setLoading(false);
      console.log("✅ Payment process completed");
    }
  };

  const handleSendEmail = async () => {
    if (!submission?.email || !contractPdfBlob || !selectedPayment) {
      alert("❌ Missing email, payment link, contract, or payment data");
      console.error("❌ Missing input:", {
        email: submission?.email,
        paymentUrl,
        contractPdfBlob,
        selectedPayment,
      });
      return;
    }

    // Ensure invoiceNumber exists
    if (!selectedPayment.invoiceNumber) {
      alert("❌ Missing invoice number");
      console.error("❌ Missing invoice number:", selectedPayment);
      return;
    }

    // Ensure packages is a non-empty array
    if (
      !Array.isArray(selectedPayment.packages) ||
      selectedPayment.packages.length === 0
    ) {
      alert("❌ Missing or empty packages");
      console.error("❌ Invalid packages:", selectedPayment.packages);
      return;
    }

    console.log("📧 Preparing to send email using existing PDF...");

    try {
      setEmailSending(true);

      const pdfFile = new File([contractPdfBlob], `Contract_${orderId}.pdf`, {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("contract", pdfFile);
      formData.append("email", submission.email);
      formData.append("courseId", courseId);
      formData.append("formId", formId || "");
      formData.append("transactionId", selectedPayment.transactionId || "");
      formData.append("orderId", selectedPayment.orderId || "");
      formData.append("paymentUrl", selectedPayment.paymentLink || "");
      formData.append("packages", JSON.stringify(selectedPayment.packages));
      formData.append(
        "payableAmount",
        selectedPayment.payableAmount !== undefined
          ? selectedPayment.payableAmount
          : totalAmount.toFixed(2)
      );
      formData.append("discountPercentage", discountPercentage || 0);
      formData.append("code", discountCode || "");
      formData.append("invoiceNumber", selectedPayment.invoiceNumber);

      console.log("📤 Sending FormData to backend (PDF from blob)...");
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
      console.error("❌ Email send error:", err);
      alert("Failed to send email with contract. Check console for details.");
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

    const currency = items[0]?.currency || "INR";

    const packageDetails = items
      .map((item) => `🔹 ${item.name}: ${item.amount} ${item.currency}`)
      .join("\n");

    const message = `*📩 Payment Invoice*\n\n${packageDetails}\n\n💰 *Total:* ${totalAmount.toFixed(
      2
    )} ${currency}\n🔗 *Payment Link:* ${paymentUrl}`;

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
          packages: items.map((item) => ({
            name: item.name,
            amount: parseFloat(item.amount),
            currency: item.currency,
            quantity: parseInt(item.quantity) || 1,
          })),
          payableAmount: totalAmount.toFixed(2),
          discountPercentage: discountPercentage || 0,
          code: discountCode,
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

        const newInvoiceNumber = response.data.invoiceNumber;

        // 👇 Refetch and auto-set selected payment
        if (newInvoiceNumber) {
          const payments = await fetchPaymentHistory();
          const currentInvoice = payments.find(
            (p) => p.invoiceNumber === newInvoiceNumber
          );
          if (currentInvoice) {
            setSelectedPayment(currentInvoice);
          }
        }

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

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const handleViewAkt = (payment) => {
    console.log("🧾 handleViewAkt clicked", payment); // ✅ Debug log

    if (userData) {
      console.log("✅ Valid paid payment, opening AKT modal");

      const aktDetails = {
        full_name: `${userData.personalDetails.lastName.toUpperCase()} ${capitalize(
          userData.personalDetails.firstName
        )} ${capitalize(userData.personalDetails.middleName)}`,
        date_of_birth: new Date(
          userData.personalDetails.dob
        ).toLocaleDateString(),
        email: userData.email,
        phone_no: userData.personalDetails.phone || "N/A",
        agreement_number: `${payment.invoiceNumber}`,
        akt_number: payment.aktNumber,
        agreement_date: `${payment.paidAt}`,
        packages: payment.packages || [],
        total_amount: `${payment.amount} ${payment.currency}`,
        userData,
      };

      console.log("📄 AKT Details:", aktDetails);

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

  const handleViewContract = async (payment) => {
    const contractFileId = payment?.contractFileId || submission?.contractFileId;
  
    if (!contractFileId) {
      toast.error("Missing contract file ID");
      return;
    }
  
    try {
      const response = await axios.get(
        `${baseUrl}/api/email/contract-file/${contractFileId}`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
  
      const blob = new Blob([response.data], { type: "application/pdf" });
      setViewedContractBlob(blob);
      setShowPdfPreview(true);          // Controls modal visibility
    } catch (error) {
      console.error("Failed to fetch contract file:", error);
      toast.error("Could not load contract PDF");
    }
  };
  

  const handleCloseContract = () => {
    setIsContractOpen(false);
  };

  const handleCloseFormViewer = () => {
    setShowFormViewer(false);
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
      toast.error("❌ Recipient email is missing.");
      return;
    }

    if (!payment?.invoiceNumber) {
      toast.error("❌ Invoice number is missing.");
      return;
    }

    try {
      setEmailSending(true);

      const { data } = await axios.post(
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

      if (data.success) {
        toast.success("✅ Email resent successfully");
        fetchPaymentHistory(); // Refresh list if needed
      } else {
        toast.error(`❌ ${data.message || "Failed to resend email"}`);
      }
    } catch (error) {
      console.error("Error resending email:", error);
      toast.error(
        `❌ ${
          error.response?.data?.message ||
          "Error occurred while resending email"
        }`
      );
    } finally {
      setEmailSending(false);
    }
  };

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

  const handleFreeCheckboxChange = async (e) => {
    const checked = e.target.checked;

    console.log("📥 Free checkbox changed:", checked);

    if (!checked) {
      console.log("🛑 Unchecked – skipping free marking.");
      setIsFreeParticipant(false);
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Free Access",
      text: "Are you sure you want to mark this participant as free?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, make free",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        console.log("✅ Confirmed. Sending request to mark as free...");
        setIsFreeParticipant(true);
        const token = localStorage.getItem("token");

        const response = await axios.put(
          `${baseUrl}/api/user/${submission.email}/courses/${courseId}/free`,
          {
            transactionId: submission.transactionId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("📤 Free mark response:", response.data);

        if (response.data.success) {
          Swal.fire(
            "Marked Free",
            "The participant was marked as free.",
            "success"
          );
          fetchPaymentHistory();
          await fetchCoursePayments(); // <-- Add this line
        } else {
          throw new Error(response.data.message || "Failed to mark as free");
        }
      } catch (error) {
        console.error("❌ Error updating free status:", error);
        Swal.fire("Error", error.message || "Failed to update status", "error");
        setIsFreeParticipant(false);
      }
    } else {
      console.log("❌ Cancelled marking as free");
      setIsFreeParticipant(false);
    }
  };

  const handleGenerateInvoiceOnly = async () => {
    if (!submission.email || items.length === 0 || totalAmount <= 0) {
      setError("Email and valid amount required.");
      return;
    }

    setLoading(true);
    setIsInvoiceOnlyMode(true); // 🔁 Track mode
    setError(null);

    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const invoiceData = {
      amount: totalAmount,
      currency: selectedMethod === "stripe" ? "INR" : "RUB",
      email: submission.email,
      courseId,
      formId,
      orderId: orderNumber,
      transactionId: submission.transactionId,
      packages: items.map((item) => ({
        name: item.name,
        amount: parseFloat(item.amount),
        currency: item.currency,
        quantity: parseInt(item.quantity) || 1,
      })),
      rawAmount: rawTotal.toFixed(2),
      payableAmount: totalAmount.toFixed(2),
      discountPercentage: discountPercentage || 0,
      code: discountCode,
      paymentUrl: null, // 🛑 NO payment link
      onlyInvoice: true,
    };

    try {
      const response = await axios.post(
        `${baseUrl}/api/email/manual`,
        invoiceData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success(`Invoice generated: ${response.data.invoiceNumber}`);
        setOrderId(orderNumber);
        setSelectedPayment({
          ...invoiceData,
          invoiceNumber: response.data.invoiceNumber,
          time: new Date().toISOString(),
        });

        // ⬇️ Generate PDF using ContractDocument
        const htmlString = ReactDOMServer.renderToStaticMarkup(
          <ContractDocument
            data={{
              full_name: submission.fullName,
              email: submission.email,
              phone_no: userData?.personalDetails?.phone || "",
              agreement_number: response.data.invoiceNumber,
              agreement_date: new Date().toISOString(),
              packages: items,
              total_amount: totalAmount.toFixed(2),
              date_of_birth: userData?.personalDetails?.dob,
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
        throw new Error(response.data.message || "Failed to generate invoice");
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      setError(error.response?.data?.message || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (payment) => {
    const confirmed = await Swal.fire({
      title: "Confirm Payment",
      text: `Are you sure you want to mark invoice ${payment.invoiceNumber} as paid?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, mark as paid",
      cancelButtonText: "Cancel",
    });

    if (!confirmed.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${baseUrl}/api/email/payment/mark-paid`,
        {
          invoiceNumber: payment.invoiceNumber,
          courseId,
          email: submission.email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success(`Invoice ${payment.invoiceNumber} marked as paid`);
        fetchPaymentHistory();
        await fetchCoursePayments(); // <-- Add this line
      } else {
        throw new Error(response.data.message || "Failed to update status");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Error updating payment status"
      );
    }
  };

  return (
    <>
      <ToastContainer
        className="custom-toast-container"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Modern Overlay with blue tint */}
      <div
        className={`invoice-modal-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      ></div>

      {/* Main Modal Container */}
      <div
        className={`modern-invoice-modal ${isOpen ? "open" : ""} ${
          showFormViewer ? "split-view" : ""
        }`}
      >
        {/* Modal Header with primary color */}
        <div className="modal-header">
          <h2 className="modal-title">{t("invoiceModal.title")}</h2>
          <button className="close-button" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* User Info Section */}
        <div className="user-info-section">
          <div className="user-email">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                fill="none"
                stroke="#033672"
                strokeWidth="2"
              />
              <path
                d="M22 6L12 13L2 6"
                stroke="#033672"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="user-div">
              <span>{submission.fullName}</span>
              <span>({submission.email})</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="section-card">
          <h3 className="section-title">{t("invoiceModal.paymentMethod")}</h3>
          <div className="payment-method-selector">
            <select
              value={selectedMethod}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="modern-select"
            >
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Section */}
        <div className="section-card">
          <h3 className="section-title">{t("invoiceModal.items")}</h3>
          <div className="items-grid">
            {items.map((item, index) => (
              <div key={index} className="item-card">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    handleItemChange(index, "name", e.target.value)
                  }
                  placeholder={t("invoiceModal.itemName")}
                  className="modern-input"
                />
                <div className="item-details">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                    placeholder={t("invoiceModal.quantity")}
                    className="modern-input quantity-input"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.amount}
                    onChange={(e) =>
                      handleItemChange(index, "amount", e.target.value)
                    }
                    placeholder={t("invoiceModal.amount")}
                    className="modern-input amount-input"
                  />
                  <span className="currency-badge">{currency}</span>
                  <button
                    className="delete-item-button"
                    onClick={() => removeItem(index)}
                    title={t("invoiceModal.removeItem")}
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button className="add-item-button" onClick={addNewItem}>
              <span>+</span> {t("invoiceModal.addItem")}
            </button>
            <button
              className="toggle-form-button"
              onClick={() => setShowFormViewer((prev) => !prev)}
            >
              {showFormViewer
                ? t("invoiceModal.hideRegistration")
                : t("invoiceModal.viewRegistration")}
            </button>
          </div>
        </div>

        {/* Total Amount Section */}
        <div className="section-card total-section">
          <h3 className="section-title">{t("invoiceModal.totalAmount")}</h3>
          {discountPercentage ? (
            <div className="amount-details">
              <div className="amount-row">
                <span>{t("invoiceModal.originalTotal")}:</span>
                <span className="original-amount">
                  {rawTotal.toFixed(2)} {currency}
                </span>
              </div>
              <div className="amount-row discount-row">
                <span>
                  {t("invoiceModal.discount", {
                    percentage: discountPercentage,
                  })}
                  :
                </span>
                <span className="discount-amount">
                  -{(rawTotal - totalAmount).toFixed(2)} {currency}
                  <span className="discount-code">({discountCode})</span>
                </span>
              </div>
              <div className="amount-row total-row">
                <span>{t("invoiceModal.totalPayable")}:</span>
                <span className="total-amount">
                  {totalAmount.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          ) : (
            <div className="amount-row total-row">
              <span>{t("invoiceModal.total")}:</span>
              <span className="total-amount">
                {totalAmount.toFixed(2)} {currency}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-container">
          <button
            className="primary-button"
            onClick={handlePayment}
            disabled={
              loading ||
              totalAmount <= 0 ||
              getRealPaymentStatus(submission) === "paid"
            }
          >
            {loading
              ? t("invoiceModal.processing")
              : t("invoiceModal.generateLink")}
          </button>

          <button
            className="secondary-button"
            onClick={handleGenerateInvoiceOnly}
            disabled={
              loading ||
              totalAmount <= 0 ||
              getRealPaymentStatus(submission) === "paid"
            }
          >
            {t("invoiceModal.generateInvoiceOnly")}
          </button>
        </div>

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

        {/* Payment Link Section */}
        {contractPdfBlob && (
          <div className="section-card payment-link-section">
            <h3 className="section-title">
              {t("invoiceModal.paymentLinkGenerated")}
            </h3>
            <div className="link-container">
              <div className="link-group">
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="payment-link"
                >
                  {paymentUrl.substring(0, 40)}...
                </a>
                <button
                  className="copy-link-button"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentUrl);
                    toast.success(t("invoiceModal.linkCopied"));
                  }}
                  title={t("invoiceModal.copyLink")}
                >
                  <FaRegCopy />
                </button>
              </div>
            </div>

            <div className="send-options">
              <button
                className="email-button"
                onClick={handleSendEmail}
                disabled={emailSending}
              >
                <FaEnvelope />
                {emailSending
                  ? t("invoiceModal.sending")
                  : t("invoiceModal.sendEmail")}
              </button>

              <button
                className="whatsapp-button"
                onClick={handleSendWhatsApp}
                disabled={whatsappLoading}
              >
                <FaWhatsapp />
                {whatsappLoading
                  ? t("invoiceModal.sending")
                  : t("invoiceModal.sendWhatsApp")}
              </button>
            </div>
          </div>
        )}

        {/* Free Access Toggle */}
        <div className="section-card free-access-section">
          <div className="invoice-toggle-wrapper">
            <label className="invoice-toggle-container">
              <input
                type="checkbox"
                checked={isFreeParticipant}
                onChange={handleFreeCheckboxChange}
                className="invoice-toggle-input"
              />
              <span className="invoice-toggle-slider"></span>
              <span className="invoice-toggle-label">
                {t("invoiceModal.markAsFree")}
              </span>
            </label>
            {isFreeParticipant && (
              <div className="free-access-badge">
                <FaCheckCircle />
                <span>{t("invoiceModal.freeAccess")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment History */}
        {selectedPayment ? (
          <div className="payment-history-grid">
            <div className="payment-card">
              <div className="payment-header">
                <span className="invoice-number">
                  #{selectedPayment.invoiceNumber}
                </span>
                <span
                  className={`status-badge ${getRealPaymentStatus(
                    selectedPayment
                  )}`}
                >
                  {t(
                    `invoiceModal.status.${getRealPaymentStatus(
                      selectedPayment
                    )}`
                  )}
                </span>
              </div>

              {selectedPayment.packages &&
                selectedPayment.packages.length > 0 && (
                  <div className="packages-list">
                    {selectedPayment.packages.map((pkg, idx) => {
                      const quantity = pkg.quantity || 1;
                      const unitAmount = parseFloat(pkg.amount) || 0;
                      const total = (unitAmount * quantity).toFixed(2);

                      return (
                        <div key={idx} className="package-item">
                          <span className="package-name">{pkg.name}</span>
                          <span className="package-details">
                            {unitAmount.toFixed(2)} × {quantity} = {total}{" "}
                            {pkg.currency}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

              <div className="payment-details">
                <div className="detail-row">
                  <span>{t("invoiceModal.amount")}:</span>
                  <span>
                    {selectedPayment.totalAmount} {selectedPayment.currency}
                  </span>
                </div>
                <div className="detail-row">
                  <span>{t("invoiceModal.date")}:</span>
                  <span>{selectedPayment.time}</span>
                </div>
              </div>

              {selectedPayment.paymentLink &&
                getRealPaymentStatus(selectedPayment) !== "paid" && (
                  <div className="link-actions">
                    <div className="link-group">
                      <a
                        href={selectedPayment.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="payment-link-button"
                      >
                        {t("invoiceModal.viewLink")}
                      </a>
                      <button
                        className="copy-link-button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            selectedPayment.paymentLink
                          );
                          toast.success(t("invoiceModal.linkCopied"));
                        }}
                        title={t("invoiceModal.copyLink")}
                      >
                        <FaRegCopy />
                      </button>
                    </div>
                  </div>
                )}

              <div className="payment-actions">
                <div className="document-actions">
                  <button
                    onClick={() => handleViewAkt(selectedPayment)}
                    disabled={getRealPaymentStatus(selectedPayment) !== "paid"}
                    className={`document-button akt-button ${
                      getRealPaymentStatus(selectedPayment) === "paid"
                        ? ""
                        : "payment-disabled"
                    }`}
                  >
                    {t("invoiceModal.viewAkt")}
                  </button>
                  <button
                    onClick={() => handleViewContract(selectedPayment)}
                    className={`document-button contract-button`}
                  >
                    {t("invoiceModal.viewContract")}
                  </button>
                </div>

                {selectedPayment.paymentLink &&
                  getRealPaymentStatus(selectedPayment) !== "paid" && (
                    <div className="resend-actions">
                      <button
                        onClick={() => handleResendEmail(selectedPayment)}
                        disabled={emailSending}
                        className={`resend-button email-resend ${
                          emailSending ? "payment-disabled" : ""
                        }`}
                      >
                        <FaEnvelope />
                        {emailSending
                          ? t("invoiceModal.sending")
                          : t("invoiceModal.resendEmail")}
                      </button>
                      <button
                        onClick={() => handleResendWhatsApp(selectedPayment)}
                        disabled={whatsappLoading}
                        className={`resend-button whatsapp-resend ${
                          whatsappLoading ? "payment-disabled" : ""
                        }`}
                      >
                        <FaWhatsapp />
                        {whatsappLoading
                          ? t("invoiceModal.sending")
                          : t("invoiceModal.resendWhatsApp")}
                      </button>
                    </div>
                  )}
              </div>

              <div className="mark-paid-section">
                <label className="paid-checkbox">
                  <input
                    type="checkbox"
                    onChange={() => handleMarkAsPaid(selectedPayment)}
                    disabled={getRealPaymentStatus(selectedPayment) === "paid"}
                    checked={getRealPaymentStatus(selectedPayment) === "paid"}
                  />
                  <span>{t("invoiceModal.markAsPaid")}</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>{t("invoiceModal.noPaymentHistory")}</p>
          </div>
        )}
      </div>

      {/* Popup Modals */}
      {showPopup && (
        <div className="success-popup">
          <FaCheckCircle />
          <span>{t("invoiceModal.emailSentSuccess")}</span>
        </div>
      )}

      {isAktOpen && aktData && (
        <div className="document-modal-overlay">
          <AktDocument data={aktData} onClose={handleCloseAkt} />
        </div>
      )}

      {isContractOpen && contractData && (
        <div className="document-modal-overlay">
          <ContractDocument data={contractData} onClose={handleCloseContract} />
        </div>
      )}

      {showFormViewer && (
        <div className="form-viewer-split">
          <RegistrationFormsViewer
            email={submission.email}
            onClose={handleCloseFormViewer}
            fullName={fullName || submission.fullName || ""}
          />
        </div>
      )}

      {/* This should come AFTER <div className="modern-invoice-modal"> */}
      {showPdfPreview && (contractPdfBlob || viewedContractBlob) && (
  <div className="pdf-preview-overlay">
    <div className="pdf-preview-modal">
      <div className="pdf-header">
        <h3>Contract Preview</h3>
        <div className="pdf-header-buttons">
          <button
            onClick={() => {
              const blob = viewedContractBlob || contractPdfBlob;
              const fileName = `Счет_${selectedPayment?.invoiceNumber || "EAFO"}.pdf`;
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="invoice-download-btn"
          >
            ⬇ Download
          </button>
          <button
            onClick={() => setShowPdfPreview(false)}
            className="invoice-close-btn"
          >
            ✖
          </button>
        </div>
      </div>
      <iframe
        src={URL.createObjectURL(viewedContractBlob || contractPdfBlob)}
        className="pdf-iframe"
        title="Contract PDF"
      />
    </div>
  </div>
)}


    </>
  );
};

export default InvoiceModal;
