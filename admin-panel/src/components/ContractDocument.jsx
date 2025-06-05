import React, { useRef, useEffect, useState } from "react";
import html2pdf from "html2pdf.js";
import "./ContractDocument.css";

const ContractDocument = ({ data = {}, onClose }) => {
  const contractRef = useRef();
  const [isEditing, setIsEditing] = useState(false);

  const formatDateForInput = (date) => {
    if (!date) return "";
    const parsedDate = new Date(date);
    return isNaN(parsedDate) ? "" : parsedDate.toISOString().split("T")[0];
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0.00 руб";
    return parseFloat(amount).toLocaleString("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    });
  };

  const [formData, setFormData] = useState({
    full_name: data?.full_name || "",
    date_of_birth: formatDateForInput(data?.date_of_birth),
    email: data?.email || "",
    phone_no: data?.phone_no || "",
    agreement_number: data?.agreement_number || "",
    agreement_date: formatDateForInput(data?.agreement_date),
    service_name: data?.service_name || "",
    total_amount: data?.total_amount || 0,
  });

  useEffect(() => {
    setFormData({
      full_name: data?.full_name || "",
      date_of_birth: formatDateForInput(data?.date_of_birth),
      email: data?.email || "",
      phone_no: data?.phone_no || "",
      service_name: data?.service_name || "",
      agreement_number: data?.agreement_number || "",
      agreement_date: formatDateForInput(data?.agreement_date),
      total_amount: data?.total_amount || 0,
    });
  }, [data]);

  const handleDownloadPDF = async () => {
    const input = contractRef.current;
    if (!input) {
      console.error("Failed to reference PDF content.");
      return;
    }

    // Clone the content to apply PDF-specific styling
    const clonedContent = input.cloneNode(true);

    // Apply smaller font size and larger height for PDF
    clonedContent.style.fontSize = "10px"; // Smaller font size for fitting content
    clonedContent.style.width = "210mm"; // Standard A4 width
    clonedContent.style.height = "400mm"; // Increased height for more content
    clonedContent.style.padding = "5mm"; // Padding for clean layout

    const options = {
      margin: [0, 0, 0, 0],
      filename: `Счет_${formData.agreement_number}.pdf`,
      image: { type: "jpeg", quality: 1.0 }, // High quality image rendering
      html2canvas: { scale: 3, useCORS: true }, // Increased scale for sharpness
      jsPDF: { unit: "mm", format: [210, 350], orientation: "portrait" }, // Increased height
    };

    await html2pdf().from(clonedContent).set(options).save();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === "total_amount" ? parseFloat(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };


  const numberToWordsRussian = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "ноль рублей ноль копеек";
  
    const belowTwenty = [
      "ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять", "десять",
      "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать",
      "семнадцать", "восемнадцать", "девятнадцать"
    ];
  
    const tens = [
      "", "", "двадцать", "тридцать", "сорок", "пятьдесят",
      "шестьдесят", "семьдесят", "восемьдесят", "девяносто"
    ];
  
    const hundreds = [
      "", "сто", "двести", "триста", "четыреста",
      "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"
    ];
  
    const thousandsForms = ["тысяча", "тысячи", "тысяч"];
    const millionsForms = ["миллион", "миллиона", "миллионов"];
    const billionsForms = ["миллиард", "миллиарда", "миллиардов"];
  
    const getForm = (n, forms) => {
      const lastDigit = n % 10;
      const lastTwoDigits = n % 100;
      if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return forms[2];
      if (lastDigit === 1) return forms[0];
      if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
      return forms[2];
    };
  
    const convertTriplet = (n, isFemale = false) => {
      let result = [];
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const u = n % 10;
      result.push(hundreds[h]);
      if (t > 1) {
        result.push(tens[t]);
        result.push(u === 1 && isFemale ? "одна" : u === 2 && isFemale ? "две" : belowTwenty[u]);
      } else {
        if (t * 10 + u > 0) {
          if (t * 10 + u === 1 && isFemale) result.push("одна");
          else if (t * 10 + u === 2 && isFemale) result.push("две");
          else result.push(belowTwenty[t * 10 + u]);
        }
      }
      return result.filter(Boolean).join(" ");
    };
  
    const parts = [];
  
    const integerPart = Math.floor(num);
    const fractionalPart = Math.round((num - integerPart) * 100);
  
    const billions = Math.floor(integerPart / 1e9);
    const millions = Math.floor((integerPart % 1e9) / 1e6);
    const thousands = Math.floor((integerPart % 1e6) / 1e3);
    const remainder = integerPart % 1e3;
  
    if (billions) parts.push(`${convertTriplet(billions)} ${getForm(billions, billionsForms)}`);
    if (millions) parts.push(`${convertTriplet(millions)} ${getForm(millions, millionsForms)}`);
    if (thousands) parts.push(`${convertTriplet(thousands, true)} ${getForm(thousands, thousandsForms)}`);
    if (remainder || parts.length === 0) parts.push(`${convertTriplet(remainder)} рублей`);
  
    const kopecks = fractionalPart.toString().padStart(2, "0");
    const kopeckWords = fractionalPart === 0 ? "ноль копеек" : `${convertTriplet(fractionalPart)} копеек`;
  
    return `${parts.join(" ")} ${kopeckWords}`.replace(/\s+/g, " ").trim();
  };

  const formatDateDDMMYYYY = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d)) return "N/A";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };




  return (
    <div className="contract-page">
      <div className="contract-popup-overlay">
        <div className="contract-popup">
          <button className="contract-close-btn" onClick={onClose}>
            &times;
          </button>

          {isEditing ? (
            <div className="contract-form-container">
              <form className="contract-form">
                <div className="form-row">
                  <label>Full Name:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label>Date of Birth:</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label>Phone:</label>
                  <input
                    type="text"
                    name="phone_no"
                    value={formData.phone_no}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label>Agreement Number:</label>
                  <input
                    type="text"
                    name="agreement_number"
                    value={formData.agreement_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label>Agreement Date:</label>
                  <input
                    type="date"
                    name="agreement_date"
                    value={formData.agreement_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label>Total Amount:</label>
                  <input
                    type="number"
                    name="total_amount"
                    value={formData.total_amount.toString()}
                    onChange={handleChange}
                  />
                </div>
              </form>
            </div>
          ) : (
            <div
              className="contract-content"
              ref={contractRef}
              style={{ fontSize: "12px" }}
            >
              <div className="container">
                <table className="top-table">
                  <tbody>
                    <tr>
                      <td className="col-1">АО «Альфа-Банк», г. Москва</td>
                      <td className="col-2">БИК</td>
                      <td className="col-3">044525593</td>
                    </tr>
                    <tr>
                      <td className="col-1">Банк получателя</td>
                      <td className="col-2">Сч. №</td>
                      <td className="col-3">30101 810 2 00000 000593</td>
                    </tr>

                    {/* ✅ Combined ИНН and КПП into a single cell with row structure */}
                    <tr>
                      <td colSpan="1">
                        <div
                          className="row-3"
                          style={{
                            display: "flex",
                            gap: "15px",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ width: "25%" }}>ИНН</div>
                          <div style={{ width: "50%" }}>7715491261</div>
                          <div style={{ width: "25%" }}>КПП</div>
                          <div style={{ width: "50%" }}>774301001</div>
                        </div>
                      </td>
                      <td className="col-2">Сч. №</td>
                      <td className="col-3">40703810 9 02570 000043</td>
                    </tr>

                    {/* Dynamic participant info */}
                    <tr>
                      <td className="col-1">
                        Исполнитель: Автономная некоммерческая организация
                        «Научно-образовательный центр «Евразийская
                        онкологическая программа «ЕАФО» (АНО "ЕАФО")
                        <br />
                        <br />
                        Заказчик: {formData.full_name} ({formatDateDDMMYYYY(formData.date_of_birth) || ""} г.р),
                        <br />
                        контактные данные: {formData.email}; тел.:{" "}
                        {formData.phone_no}
                      </td>
                      <td className="col-2"></td>
                      <td className="col-3"></td>
                    </tr>
                  </tbody>
                </table>

                <h2 style={{ margin: "5px 0px", fontSize: "16px" }}>
                  Счет-оферта на оплату № {formData.agreement_number} от{" "}
                  {formatDateDDMMYYYY(formData.agreement_date) || ""} г
                </h2>

                <p style={{ textDecoration: "underline", marginBottom: "5px" }}>
                  {" "}
                  В назначении платежа укажите: оплата по счету{" "}
                  {formData.agreement_number}, а также ФИО получателя услуги
                </p>
                <table
                  className="information-table"
                  style={{ fontSize: "8px" }}
                >
                  <tbody>
                    <tr>
                      <td>Исполнитель:</td>
                      <td>
                        АНО "ЕАФО", ИНН 7715491261, 125080, Москва г, ш
                        Волоколамское, д. 1, стр. 1, офис 606С, тел.: +7 (915)
                        129-09-27, р/с 40703 810 9 02570 000043, в банке АО
                        «АЛЬФА-БАНК», БИК 044525593, к/с 30101 810 2 00000
                        000593
                      </td>
                    </tr>
                    <tr>
                      <td>Заказчик:</td>
                      <td>
                        {formData.full_name} (
                          {formatDateDDMMYYYY(formData.date_of_birth) || ""} г.р)
                        <br />
                        E-mail: {formData.email}; Тел.: {formData.phone_no}
                      </td>
                    </tr>
                    <tr>
                      <td>Основание:</td>
                      <td>
                        Договор № {formData.agreement_number} от{" "}
                        {formatDateDDMMYYYY(formData.agreement_date) || ""} г.
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table className="border-table" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Товары (работы, услуги)</th>
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

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "20px",
                  }}
                >
                  <table
                    style={{
                      borderCollapse: "collapse",
                      fontSize: "14px",
                      width: "400px",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td style={{ padding: "5px", whiteSpace: "nowrap" }}>
                          Итого:
                        </td>
                        <td
                          style={{
                            padding: "5px",
                            whiteSpace: "nowrap",
                            fontWeight: "bold",
                          }}
                        >
                          {formatCurrency(formData.total_amount)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "5px", whiteSpace: "nowrap" }}>
                          Без НДС:
                        </td>
                        <td
                          style={{
                            padding: "5px",
                            whiteSpace: "nowrap",
                            fontWeight: "bold",
                          }}
                        >
                          {formatCurrency(formData.total_amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* New section with all the additional information */}
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  {/* Item count and total amount */}
                  <p style={{ fontSize: "14px" }}>
                    Всего наименований 1, на сумму{" "}
                    {formatCurrency(formData.total_amount)}.
                  </p>
                  <p style={{ fontSize: "14px" }}>
                    Сумма прописью: <b>{numberToWordsRussian(parseFloat(formData.total_amount || 0))}</b>
                  </p>

                  {/* Compact table for total and VAT */}

                  {/* Service deadline */}
                  <p style={{ marginTop: "10px", fontSize: "14px" }}>
                    <b>Срок организации услуги:</b> не позднее 20 рабочих дней
                    после поступления денежных средств на расчетный счет.
                  </p>

                  {/* Payment instructions */}
                  <p style={{ marginTop: "10px", fontSize: "14px" }}>
                    <b>Внимание!</b> Прежде чем произвести оплату настоящего
                    счёта ознакомьтесь со всеми условиями Договора оказания
                    услуг информационно-аналитического ассистанса,
                    опубликованного на сайте:
                    <a
                      href=" https://www.basic.eafo.info"
                      target="_blank"
                      style={{ color: "#007BFF", textDecoration: "none" }}
                    >
                      https://www.basic.eafo.info
                    </a>
                    <br />и Политикой оператора в отношении персональных данных,
                    опубликованной на сайте:
                    <a
                      href="https://www.eafo.info/ru/privacy-policy"
                      target="_blank"
                      style={{ color: "#007BFF", textDecoration: "none" }}
                    >
                      https://www.eafo.info/ru/privacy-policy
                    </a>
                  </p>

                  <p style={{ fontSize: "14px" }}>
                    Оплата данного счета означает принятие всех условий АНО
                    «ЕАФО» и заключение Договора оказания услуг
                    информационно-аналитического ассистанса, опубликованного на
                    сайте:
                    <a
                      href=" https://www.basic.eafo.info"
                      target="_blank"
                      style={{ color: "#007BFF", textDecoration: "none" }}
                    >
                      https://www.basic.eafo.info: 
                    </a>
                     в письменной форме (п.п.2,3 ст.434, п.3 ст.438 ГК РФ), а
                    также письменное согласие на обработку персональных данных
                    согласно Политики оператора в отношении персональных данных,
                    опубликованной на сайте:
                    <a
                      href="https://www.eafo.info/ru/privacy-policy"
                      target="_blank"
                      style={{ color: "#007BFF", textDecoration: "none" }}
                    >
                      https://www.eafo.info/ru/privacy-policy
                    </a>
                  </p>

                  {/* Signature section */}
                  <div style={{ marginTop: "10px", fontSize: "14px" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "none",
                      }}
                    >
                      <tbody>
                        {/* Client Row */}
                        <tr style={{ fontSize: "10px"}}>
                          <td style={{ padding: "10px 0", width: "20%" }}>
                            <b>Клиент</b>
                          </td>
                          <td style={{ width: "10%" }}></td>{" "}
                          {/* Empty Column */}
                          <td style={{ width: "30%" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                               
                              }}
                            >
                              <span>______________________________</span>
                              <span>подписи</span>
                            </div>
                          </td>
                          <td style={{ width: "40%" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <span>______________________________</span>
                              <span>расшифровка подписи</span>
                            </div>
                          </td>
                        </tr>

                        {/* Director Row with 4 Columns */}
                        <tr style={{ fontSize: "10px"}}>
                          <td style={{ padding: "10px 0", width: "20%" }}>
                            <b>Руководитель</b>
                          </td>
                          <td style={{ width: "10%", textAlign: "center" }}>
                          <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            > <span style={{marginBottom:"-10px"}}>Директор</span>
                              <span>___________________</span>
                              <span>должность</span>
                            </div>
                          </td>
                          <td style={{ width: "30%", textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                marginTop: "5px",
                               
                              }}
                            >
                             <span>______________________________</span>
                             <span>подписи</span>
                            </div>
                          </td>
                          <td style={{ width: "40%", textAlign: "center" }}>
                          <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                marginTop: "5px",
                               
                              }}
                            >
                             <span style={{marginBottom:"-10px"}}>Субраманиан Сомасундарам </span>
                             <span>______________________________</span>
                             <span>расшифровка подписи</span>
                            </div>
                          </td>
                        </tr>

                        {/* Accountant Row */}
                        <tr style={{ fontSize: "10px"}}>
                          <td style={{ padding: "10px 0px", width: "20%" }}>
                            <b>Главный (старший) бухгалтер</b>
                          </td>
                          <td style={{ width: "10%" }}></td>
                          <td style={{ width: "30%", textAlign: "center" }}>
                          <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                marginTop: "5px",
                               
                              }}
                            >
                             <span>______________________________</span>
                             <span>подписи</span>
                            </div>
                          </td>
                          <td style={{ width: "40%", textAlign: "center" }}>
                          <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                marginTop: "5px",
                               
                              }}
                            >
                             <span style={{marginBottom:"-10px"}}>Смирнова Елена Федоровна </span>
                             <span>______________________________</span>
                             <span>расшифровка подписи</span>
                            </div>
                          </td>
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
            <button onClick={handleDownloadPDF} className="btn">
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDocument;
