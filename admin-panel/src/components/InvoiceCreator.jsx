import React, { useState, useEffect } from 'react';
import './InvoiceCreator.css';
import { AiOutlineClose } from 'react-icons/ai';
import Select from 'react-select';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InvoiceCreator = ({ onClose, courseId }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [itemChoice, setItemChoice] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [customItem, setCustomItem] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [courseItems, setCourseItems] = useState([]);
  const [transactionId, setTransactionId] = useState("");

  const [paymentUrl, setPaymentUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("stripe");

  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const courseRes = await fetch(`${baseUrl}/api/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!courseRes.ok) throw new Error('Failed to fetch course');

        const courseData = await courseRes.json();
        const registrationForm = courseData.forms.find(f => f.isUsedForRegistration);
        if (!registrationForm) throw new Error('No registration form found');

        const formRes = await fetch(`${baseUrl}/api/form/${registrationForm.formId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!formRes.ok) throw new Error('Failed to fetch form submissions');

        const formData = await formRes.json();
        const submissions = formData.submissions || [];

        const userOptions = submissions
          .filter(sub => !!sub.email)
          .map(sub => ({
            value: sub.email,
            label: sub.email,
          }));

        setUsers(userOptions);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const fetchItems = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${baseUrl}/api/courses/${courseId}/items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch course items');

        const data = await res.json();
        setCourseItems(data.items || []);
      } catch (error) {
        console.error('Error fetching course items:', error);
      }
    };

    if (courseId) {
      fetchUsers();
      fetchItems();
    }
  }, [courseId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return alert('Please select a user.');

    let item = '';
    if (itemChoice === 'manual') {
      if (!customItem || !amount || !currency) {
        return alert('Please fill out all manual item fields.');
      }
      item = `${customItem} - ${amount} ${currency}`;
    } else {
      if (!selectedItem) return alert('Please select an item.');
      item = selectedItem.label;
    }

    console.log('✅ Creating invoice for:', selectedUser.value);
    console.log('✅ Item:', item);
    onClose();
  };

  const handlePayment = async () => {
    const email = selectedUser?.value;
    const packageName = itemChoice === 'manual' ? customItem : selectedItem?.value;
    const totalAmount = itemChoice === 'manual'
      ? parseFloat(amount)
      : courseItems.find(item => item.name === selectedItem?.value)?.amount;
    const currencyFinal = itemChoice === 'manual'
      ? currency
      : courseItems.find(item => item.name === selectedItem?.value)?.currency;
  
    if (!email || !packageName || !totalAmount || !currencyFinal) {
      alert("Missing required payment info.");
      return;
    }
  
    const paymentMethod = currencyFinal === "INR" ? "stripe" : "alfabank";
    const orderDetails = {
      amount: totalAmount,
      currency: currencyFinal,
      email,
      course: packageName,
      returnUrl: "http://localhost:3000/payment-success",
      failUrl: "http://localhost:3000/payment-failed",
    };
  
    setLoading(true);
    setError(null);
  
    try {
      const endpoint =
        paymentMethod === "stripe"
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
  
  // Email sender
  const handleSendEmail = async () => {
    if (!selectedUser?.value || !paymentUrl || !orderId) {
      return alert("Missing required data for email.");
    }

    const orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
  
    const packageName = itemChoice === 'manual' ? customItem : selectedItem?.value;
    const currencyFinal = itemChoice === 'manual'
      ? currency
      : courseItems.find(item => item.name === selectedItem?.value)?.currency;
  
    const emailData = {
      email: selectedUser.value,
      courseId,
      orderId,
      paymentUrl,
      transactionId:orderNumber,
      package: packageName,
      currency: currencyFinal,
    };
  
    try {
      const res = await axios.post(`${baseUrl}/api/email/send-email`, emailData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
  
      if (res.data.success) {
        toast.success("📧 Email sent successfully!");
      } else {
        toast.error(res.data.message || "Email sending failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email.");
    }
  };
  
  
  // WhatsApp sender
  const handleSendWhatsApp = async () => {
    if (!selectedUser?.value || !paymentUrl || !transactionId || !orderId) {
      return alert("Missing required data for WhatsApp.");
    }
  
    const packageName = itemChoice === 'manual' ? customItem : selectedItem?.value;
    const currencyFinal = itemChoice === 'manual'
      ? currency
      : courseItems.find(item => item.name === selectedItem?.value)?.currency;
  
    const wpData = {
      to: selectedUser.value,
      message: `Please complete your payment: ${paymentUrl}`,
      courseId,
      orderId,
      transactionId,
      paymentUrl,
      email: selectedUser.value,
      package: packageName,
      currency: currencyFinal,
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
  

  const itemOptions = courseItems.map(item => ({
    value: item.name,
    label: `${item.name} - ${item.amount} ${item.currency}`,
  }));

  return (
    <div className="invoice-creator-modal-overlay">
      <div className="invoice-creator-modal">
        <button className="invoice-creator-close-icon" onClick={onClose}>
          <AiOutlineClose size={20} />
        </button>

        <h2>Create Invoice</h2>
        <form onSubmit={handleSubmit}>
          <label>Select User</label>
          <Select
            options={users}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder="Search or select a user"
            className="invoice-creator-select"
          />

          <label style={{ marginTop: '1rem' }}>Select Item Method</label>
          <div className="choice-buttons">
            <button
              type="button"
              className={itemChoice === 'select' ? 'active' : ''}
              onClick={() => {
                setItemChoice('select');
                setCustomItem('');
                setAmount('');
                setCurrency('INR');
              }}
            >
              Select from List
            </button>
            <button
              type="button"
              className={itemChoice === 'manual' ? 'active' : ''}
              onClick={() => {
                setItemChoice('manual');
                setSelectedItem(null);
              }}
            >
              Enter Manually
            </button>
          </div>

          {itemChoice === 'select' && (
            <Select
              options={itemOptions}
              value={selectedItem}
              onChange={setSelectedItem}
              className="invoice-creator-select"
            />
          )}

          {itemChoice === 'manual' && (
            <div className="manual-item-fields">
              <input
                type="text"
                placeholder="Package Name"
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                className="invoice-creator-input"
              />
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="invoice-creator-input"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="invoice-creator-input"
              >
                <option value="INR">INR</option>
                <option value="RUP">RUP</option>
              </select>
            </div>
          )}

          <div className="actions">
          <button
              type="button"
              onClick={handlePayment}
              disabled={loading}
              className="generate-btn"
            >
              {loading ? "Generating..." : "Generate Payment Link"}
            </button>
            <div className="send-actions-row">
            <div className="send-actions-row">
  <button type="button" className="email-btn" onClick={handleSendEmail}>
    📧 Send via Email
  </button>
  <button type="button" className="whatsapp-btn" onClick={handleSendWhatsApp}>
    📲 Send via WhatsApp
  </button>
</div>

</div>

           
          </div>

          {paymentUrl && (
            <div className="payment-result">
              <strong>Payment Link:</strong>{" "}
              <a href={paymentUrl} target="_blank" rel="noreferrer" className="payment-link">
                Payment Link
              </a>
            </div>
          )}

          {error && <div className="error-text">❌ {error}</div>}
        </form>
      </div>
    </div>
  );
};

export default InvoiceCreator;
