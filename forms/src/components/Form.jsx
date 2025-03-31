import React, { useState } from "react";
import "./Form.css";

const Form = () => {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    course: "",
    termsAccepted: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.termsAccepted) {
      alert("You must accept the terms and conditions!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:4000/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("Form submitted successfully!");

        // Reset the form fields
        setFormData({
          email: "",
          phone: "",
          course: "",
          termsAccepted: false,
        });
      } else {
        setMessage(result.message || "Something went wrong!");
      }
    } catch (error) {
      setMessage("Error connecting to the server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Course Registration</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number:</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Select Your Course:</label>
          <select name="course" value={formData.course} onChange={handleChange} required>
            <option value="">-- Select a Course --</option>
            <option value="course1">Course 1</option>
            <option value="course2">Course 2</option>
          </select>
        </div>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleChange}
          />
          <label>I accept the terms and conditions</label>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default Form;
