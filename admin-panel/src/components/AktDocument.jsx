import React, { useRef, useEffect, useState } from "react";
import html2pdf from "html2pdf.js";
import "./AktDocument.css";

const AktDocument = ({ data = {}, onClose }) => {
  const aktRef = useRef();
  const [isEditing, setIsEditing] = useState(false);

  const formatDateForDisplay = (date) => {
    if (!date) return "N/A";
    const parsedDate = new Date(date);
    return !isNaN(parsedDate) ? parsedDate.toLocaleDateString("ru-RU") : "N/A";
  };

  const formatDateForInput = (date) => {
    if (!date) return "";
    const parsedDate = new Date(date);
    return isNaN(parsedDate) ? "" : parsedDate.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    full_name: data?.full_name || "",
    date_of_birth: formatDateForInput(data?.date_of_birth),
    email: data?.email || "",
    phone_no: data?.phone_no || "",
    service_name: data?.service_name || "",
    agreement_number: data?.agreement_number || "",
    agreement_date: formatDateForInput(data?.agreement_date),
    total_amount: data?.total_amount || 0
  });
  console.log(formData.total_amount)

  useEffect(() => {
    setFormData({
      full_name: data?.full_name || "",
      date_of_birth: formatDateForInput(data?.date_of_birth),
      email: data?.email || "",
      phone_no: data?.phone_no || "",
      service_name: data?.service_name || "",
      agreement_number: data?.agreement_number || "",
      agreement_date: formatDateForInput(data?.agreement_date),
      total_amount: data?.total_amount || 0
    });
  }, [data]);

  const handleDownloadPDF = async () => {
    const input = aktRef.current;
    if (!input) {
      console.error("Failed to reference PDF content.");
      return;
    }

    const options = {
      margin: 10,
      filename: `AKT_${formData.agreement_number}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    await html2pdf().from(input).set(options).save();
  };

  const numberToWordsRussian = (num) => {
    if (!num) return "ноль рублей ноль копеек";

    const belowTwenty = [
      "ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять", "десять",
      "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать",
      "семнадцать", "восемнадцать", "девятнадцать"
    ];

    const tens = [
      "", "десять", "двадцать", "тридцать", "сорок", "пятьдесят",
      "шестьдесят", "семьдесят", "восемьдесят", "девяносто"
    ];

    const hundreds = [
      "", "сто", "двести", "триста", "четыреста",
      "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"
    ];

    const convert = (n) => {
      if (n < 20) return belowTwenty[n];
      if (n < 100) return `${tens[Math.floor(n / 10)]} ${belowTwenty[n % 10]}`.trim();
      if (n < 1000) {
        const h = Math.floor(n / 100);
        const remainder = n % 100;
        return `${hundreds[h]} ${convert(remainder)}`.trim();
      }
      return n.toString();
    };

    const integerPart = Math.floor(num);
    const fractionalPart = Math.round((num - integerPart) * 100);

    const integerWords = convert(integerPart);
    const fractionWords = fractionalPart === 0
      ? "ноль копеек"
      : `${convert(fractionalPart)} копеек`;

    return `${integerWords} рублей ${fractionWords}`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0.00 руб";
    return parseFloat(amount).toLocaleString("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
  
    // Parse total_amount as a number, keep other fields as strings
    const newValue = name === "total_amount" ? parseFloat(value) || 0 : value;
  
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };
  

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="akt-popup-overlay">
      <div className="akt-popup">
        <button className="close-btn" onClick={onClose}>&times;</button>

       

        {isEditing ? (
          <div className="akt-form-container">
            <form className="akt-form">
              <label>Full Name:</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} />

              <label>Date of Birth:</label>
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />

              <label>Email:</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} />

              <label>Phone:</label>
              <input type="text" name="phone_no" value={formData.phone_no} onChange={handleChange} />

              <label>Service Name:</label>
              <input type="text" name="service_name" value={formData.service_name} onChange={handleChange} />

              <label>Agreement Number:</label>
              <input type="text" name="agreement_number" value={formData.agreement_number} onChange={handleChange} />

              <label>Agreement Date:</label>
              <input type="date" name="agreement_date" value={formData.agreement_date} onChange={handleChange} />

              <label>Total Amount:</label>
      <input
        type="number"
        name="total_amount"
        value={formData.total_amount.toString()}
        onChange={handleChange}
      />   </form>
          </div>
        ) : (
          <div className="akt-content" ref={aktRef}>
            <div className="container">
              <p className="heading" style={{ fontSize: "25px", fontWeight: "bold", textDecoration: "underline" }}>
              Акт сдачи-приемки услуг № OF {formData.agreement_number?.slice(2) || "N/A"} от {formData.agreement_date || "N/A"}
            </p>

            <div style={{ marginTop: "20px" }}>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td>Исполнитель:</td>
                    <td>
                      АНО "ЕАФО", ИНН 7715491261, 125080, Москва г, ш Волоколамское, д. 1, стр. 1, офис 606С, тел.: +7 (915) 129-09-27,
                      р/с 40703 810 9 02570 000043, в банке АО «АЛЬФА-БАНК», БИК 044525593, к/с 30101 810 2 00000 000593
                    </td>
                  </tr>
                  <tr>
                    <td>Заказчик:</td>
                    <td>{formData.full_name} ({new Date(formData.date_of_birth).toLocaleDateString()})<br />
                      E-mail: {formData.email}; Тел.: {formData.phone_no}
                    </td>
                  </tr>
                  <tr>
                    <td>Основание:</td>
                    <td>Договор № {formData.agreement_number} от {formData.agreement_date}</td>
                  </tr>
                </tbody>
              </table>

              <table className="border-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Наименование работ, услуг</th>
                    <th>Кол-во</th>
                    <th>Ед.</th>
                    <th>Цена</th>
                    <th>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>{formData.service_name}</td>
                    <td>1</td>
                    <td>шт</td>
                    <td>{formatCurrency(formData.total_amount)}</td>
                    <td>{formatCurrency(formData.total_amount)}</td>
                  </tr>
                </tbody>
              </table>

              <p>Сумма прописью: <b>{numberToWordsRussian(parseFloat(formData.total_amount || 0))}</b></p>
              <p style={{marginTop:"10px"}}>Вышеперечисленные услуги выполнены полностью и в срок. Заказчик претензий по объему, качеству и срокам оказания услуг не имеет, в том числе и при неподписании акта сдачи-приемки.

</p>
<hr style={{ height: "2px", color: "#000", background: "#000", margin: "15px 0" }} />

              <div>
                <table style={{ width: "100%" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "20%", fontWeight: "bold" }}>ИСПОЛНИТЕЛ</td>
                      <td>Директор АНО "ЕАФО", Субраманиан С.</td>
                      <td style={{ width: "5%" }}></td>
                      <td style={{ width: "20%", fontWeight: "bold" }}>ЗАКАЗЧИК</td>
                      <td>{formData.full_name}</td>
                    </tr>

                    <tr>
                      <td></td>
                      <td style={{ borderBottom: "2px solid #000", paddingTop: "60px" }}></td>
                      <td></td>
                      <td></td>
                      <td style={{ borderBottom: "2px solid #000" }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        )}

        <div className="actions">
          <button onClick={() => setIsEditing(!isEditing)} className="btn">
            {isEditing ? "Save" : "Edit"}
          </button>
          <button onClick={handleDownloadPDF} className="btn">Download PDF</button>
        </div>
      </div>
    </div>
  );
};

export default AktDocument;
