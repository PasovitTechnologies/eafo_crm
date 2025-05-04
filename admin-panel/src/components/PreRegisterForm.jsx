import { useState } from "react";
import axios from "axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { AiOutlineClose } from "react-icons/ai";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";

import "./PreRegisterForm.css";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function PreRegisterForm({ courseId, onClose }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [agreements, setAgreements] = useState({
    terms: false,
    data: false,
    promotions: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setAgreements((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreements.terms || !agreements.data) {
      toast.error(t("pleaseAgree"));
      return;
    }

    try {
      const res = await axios.post(`${baseUrl}/api/precourse/register`, {
        ...formData,
        courseId,
      });
      toast.success(res.data.message || t("registerSuccess"));

      setFormData({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
      });

      setAgreements({ terms: false, data: false, promotions: false });
    } catch (err) {
      toast.error(err.response?.data?.message || t("formError"));
    }
  };

  // Function to render label with HTML content
  const renderLabelWithHTML = (htmlContent) => {
    return <span dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  return (
    <div className="modal-overlay">
      <div className="precourse-modal">
        <button className="close-btn" onClick={onClose}>
          <AiOutlineClose size={24} />
        </button>
        <h2>{t("preRegister")}</h2>
        <form onSubmit={handleSubmit}>
          {["firstName", "middleName", "lastName", "email"].map((field) => (
            <input
              key={field}
              name={field}
              type={field === "email" ? "email" : "text"}
              placeholder={t(field)}
              value={formData[field]}
              onChange={handleChange}
              required={field !== "middleName"}
            />
          ))}

          <div className="phone-input-wrapper">
            <PhoneInput
              country={"us"}
              value={formData.phone}
              onChange={handlePhoneChange}
              inputProps={{ name: "phone", required: true }}
              inputStyle={{ width: "100%" }}
            />
          </div>

          <div className="checkboxes">
            <label>
              <input
                type="checkbox"
                name="terms"
                checked={agreements.terms}
                onChange={handleCheckboxChange}
              />
              {renderLabelWithHTML(t("agreement"))}
            </label>
            <label>
              <input
                type="checkbox"
                name="data"
                checked={agreements.data}
                onChange={handleCheckboxChange}
              />
              {renderLabelWithHTML(t("personalData"))}
            </label>
            <label>
              <input
                type="checkbox"
                name="promotions"
                checked={agreements.promotions}
                onChange={handleCheckboxChange}
              />
              {renderLabelWithHTML(t("promotions"))}
            </label>
          </div>

          <button type="submit">{t("submit")}</button>
        </form>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      </div>
    </div>
  );
}