import React, { useState, useEffect } from 'react';
import './InvoiceCreator.css';
import { AiOutlineClose } from 'react-icons/ai';
import Select from 'react-select';

const InvoiceCreator = ({ onClose, courseId }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [itemChoice, setItemChoice] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [customItem, setCustomItem] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [courseItems, setCourseItems] = useState([]);

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
      item = selectedItem.value;
    }

    console.log('✅ Creating invoice for:', selectedUser.value);
    console.log('✅ Item:', item);

    onClose();
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
            <button type="submit" className="save-btn">
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceCreator;
