const express = require("express");
const axios = require("axios");  // Use Axios for API calls
require("dotenv").config();
const User = require("../models/User"); 
const Course = require("../models/Course"); 
const UserNotification = require("../models/UserNotificationSchema");
const multer = require("multer");
const mongoose = require("mongoose");
const moment = require("moment-timezone");


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const RUSENDER_API = "https://api.beta.rusender.ru/api/v1/external-mails/send";

// Helper function to send emails using Rusender
const sendEmailRusender = async (recipient, mail) => {
  const emailData = {
      mail: {
          to: { email: recipient.email },
          from: { email: "eafo@e-registrar.org", name: "EAFO" },
          subject: mail.subject,
          previewTitle: mail.subject,
          html: mail.html.replace("{name}", recipient.name || "User")
      }
  };

  try {

      const response = await axios.post(RUSENDER_API, emailData, {
          headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.RUSENDER_API_KEY
          }
      });

      return { email: recipient.email, status: "Success", data: response.data };
      console.log('✅ Success:', res.data);
  } catch (error) {

      return { 
          email: recipient.email, 
          status: "Failed", 
          error: error.response?.data || error.message 
      };
      console.error('❌ Error:', err.response?.data || err.message);
  }
};


const russianEmailTemplate = (fullName, invoiceNumber, paymentUrl, packageName, amount, currency, courseName) => `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Счет от EAFO</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    
    <h2 style="color: #003366; margin-bottom: 20px;">
      Счет за участие в ${courseName} EAFO – ${invoiceNumber}
    </h2>
    
    <p style="margin-bottom: 20px;">
      <strong>${fullName},</strong>
    </p>
    
    <p style="margin-bottom: 20px;">
      Благодарим Вас за регистрацию на <strong>${courseName}</strong>.
    </p>

    <p style="margin-bottom: 20px;">
      Вы можете получить доступ к деталям платежа, нажав на ссылку ниже. Завершите процесс регистрации, произведя оплату.
    </p>

    <p style="margin-bottom: 10px;"><strong>Номер счета:</strong> ${invoiceNumber}<br />
    <strong>Пакет:</strong> ${packageName}<br />
    <strong>Сумма:</strong> ${amount} ${currency}</p>

    <p style="margin-top: 30px; margin-bottom: 10px;">
      <strong>Ссылка для оплаты для российских участников:</strong>
    </p>
    
    <p style="margin-bottom: 20px;">
      <a href=${paymentUrl} style="color: #007bff; text-decoration: none;">
        Заплатить сейчас
      </a>
    </p>

    <p style="margin-bottom: 20px; color: #d9534f;">
      *Участник должен оплатить сумму, указанную в счете, в течение 3 дней.
    </p>

    <p style="margin-bottom: 20px;">
      После совершения платежа отправьте подтверждение банковского перевода и свое полное имя на адрес: 
      <a href="mailto:travel@eafo.info">travel@eafo.info</a>
    </p>

    <p style="margin-bottom: 40px;">
      Если у вас есть какие-либо вопросы, свяжитесь с командой EAFO по адресу: 
      <a href="mailto:info@eafo.info">info@eafo.info</a>
    </p>

    <p style="margin-bottom: 0;">
      С наилучшими пожеланиями,<br/>
      <strong>Команда EAFO</strong>
    </p>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999;">
      © ${new Date().getFullYear()} EAFO. Все права защищены.
    </p>
  </div>
</body>
</html>
`;


const englishEmailTemplate = (fullName, invoiceNumber, paymentUrl, packageName, amount, currency, courseName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice from EAFO</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    
    <h2 style="color: #003366; margin-bottom: 20px;">
      Invoice for the ${courseName} - ${invoiceNumber} from EAFO
    </h2>
    
    <p style="margin-bottom: 20px;">
      <strong>${fullName},</strong>
    </p>
    
    <p style="margin-bottom: 20px;">
      Thank you for submitting your registration form for the <strong>${courseName}</strong>.
    </p>

    <p style="margin-bottom: 20px;">
      You can access your invoice with payment details by clicking on the link below. Complete the registration process by making payment.
    </p>

    <p style="margin-bottom: 10px;"><strong>Invoice Number:</strong> ${invoiceNumber}<br />
    <strong>Package:</strong> ${packageName}<br />
    <strong>Amount:</strong> ${amount} ${currency}</p>

    <p style="margin-top: 30px; margin-bottom: 10px;">
      <strong>Payment link for participants from countries other than Russia:</strong>
    </p>
    
    <p style="margin-bottom: 20px;">
      <a href=${paymentUrl} style="color: #007bff; text-decoration: none;">
        Pay Now
      </a>
    </p>

    <p style="margin-bottom: 20px; color: #d9534f;">
      *Participant must pay the amount mentioned in the invoice within 3 days.
    </p>

    <p style="margin-bottom: 20px;">
      After you make the payment, please send the bank transfer confirmation and your full name to: 
      <a href="mailto:travel@eafo.info">travel@eafo.info</a>
    </p>

    <p style="margin-bottom: 40px;">
      If you have any questions, contact our team at: 
      <a href="mailto:info@eafo.info">info@eafo.info</a>
    </p>

    <p style="margin-bottom: 0;">
      Best regards,<br/>
      <strong>Team EAFO</strong>
    </p>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999;">
      © ${new Date().getFullYear()} EAFO. All rights reserved.
    </p>
  </div>
</body>
</html>
`;




// Endpoint to send emails and save payments
router.post("/send", async (req, res) => {
  const { email, courseId, transactionId, orderId, paymentUrl, currency, package: packageName, amount, payableAmount, discountPercentage, code } = req.body;

  if (!email || !courseId || !transactionId || !orderId || !paymentUrl) {
    return res.status(400).json({ success: false, message: "Missing required data." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ email }).session(session);
    if (!user) throw new Error("User not found");

    const userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) throw new Error("User is not enrolled in this course");

    
    const userPayment = userCourse.payments.find(p => p.transactionId === transactionId);
    if (!userPayment) throw new Error("Transaction ID not found in user payments");


    // Find course
    const course = await Course.findById(courseId).session(session);
    if (!course) throw new Error("Course not found");

    const coursePayment = course.payments.find(p => p.transactionId === transactionId);
    if (!coursePayment) throw new Error("Transaction ID not found in course payments");


    // Generate next Invoice Number
    let currentInvoiceNumber = course.currentInvoiceNumber || "INV/EAFO-000-00001";
    const match = currentInvoiceNumber.match(/(\d{5})$/);
    let nextInvoiceNumber;

    if (match) {
      const currentNumber = parseInt(match[0], 10);
      nextInvoiceNumber = currentInvoiceNumber.replace(/\d{5}$/, (currentNumber + 1).toString().padStart(5, "0"));
      course.currentInvoiceNumber = nextInvoiceNumber;
    } else {
      nextInvoiceNumber = "INV/EAFO-000-00001"; // fallback
    }


    // Update User Payment
    userPayment.invoiceNumber = nextInvoiceNumber;
    userPayment.paymentLink = paymentUrl;
    userPayment.status = "Pending",
    userPayment.orderId = orderId; // <-- Push orderId into paymentId field
    userPayment.time = moment.tz("Europe/Moscow").toDate();
    userPayment.package = packageName;
    userPayment.amount = amount;
    userPayment.currency = currency;
    userPayment.payableAmount = payableAmount;
    userPayment.discountPercentage = discountPercentage;
    userPayment.discountCode = code;


    // Update Course Payment
    coursePayment.invoiceNumber = nextInvoiceNumber;
    coursePayment.paymentLink = paymentUrl;
    coursePayment.orderId = orderId;
    coursePayment.status = "Pending",
    coursePayment.time = moment.tz("Europe/Moscow").toDate();
    coursePayment.package = packageName;
    coursePayment.amount = amount;
    coursePayment.currency = currency;
    coursePayment.payableAmount = payableAmount;
    coursePayment.discountPercentage = discountPercentage;
    coursePayment.discountCode = code;


    // Save changes
    await user.save({ session });
    await course.save({ session });

    const payment = userPayment;


    // Prepare and Send Email
    const { title, firstName, middleName, lastName } = user.personalDetails || {};


    const isRussian = currency === "RUB";
    const courseName = isRussian ? course.nameRussian : course.name;

    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

      const emailSubject = isRussian
      ? `Счет за курс ${courseName} - ${nextInvoiceNumber} от EAFO`
      : `Invoice for the course ${courseName} - ${nextInvoiceNumber} from EAFO`;
    
      const emailBody = isRussian
  ? russianEmailTemplate(fullName, nextInvoiceNumber, payment.paymentLink, payment.package, payment.amount, payment.currency, courseName)
  : englishEmailTemplate(fullName, nextInvoiceNumber, payment.paymentLink, payment.package, payment.amount, payment.currency, courseName);

    const mail = { subject: emailSubject, html: emailBody };

    const emailResult = await sendEmailRusender({ email, name: fullName }, mail);


    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Invoice updated and email sent successfully",
      invoiceNumber: nextInvoiceNumber,
      emailResult
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error during email sending and updating:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});


router.post("/send-email", async (req, res) => {
  const { email, courseId, transactionId, orderId, paymentUrl, currency, package: packageName, originalAmount, discountPercentage, code } = req.body;

  if (!email || !courseId || !transactionId || !orderId || !paymentUrl) {
    return res.status(400).json({ success: false, message: "❌ Missing required data." });
  }

  

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ email }).session(session);
    if (!user) throw new Error("User not found");

    const userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) throw new Error("User is not enrolled in this course");

    const course = await Course.findById(courseId).session(session);
    if (!course) throw new Error("Course not found");

    // Generate Invoice Number
    let currentInvoiceNumber = course.currentInvoiceNumber || "INV/EAFO-000-00001";
    const match = currentInvoiceNumber.match(/(\d{5})$/);
    let nextInvoiceNumber = "INV/EAFO-000-00001"; // default fallback

    if (match) {
      const currentNumber = parseInt(match[0], 10);
      nextInvoiceNumber = currentInvoiceNumber.replace(/\d{5}$/, (currentNumber + 1).toString().padStart(5, "0"));
    }

    course.currentInvoiceNumber = nextInvoiceNumber;

    // Create New Payment Entry
    const newPayment = {
      paymentLink: paymentUrl,
      package: packageName || "standard",
      currency,
      paymentId: orderId,
      orderId,
      transactionId,
      invoiceNumber: nextInvoiceNumber,
      time: moment.tz("Europe/Moscow").toDate(),
      status: "Pending",

    };

    userCourse.payments.push(newPayment);
    course.payments.push({
      ...newPayment,
      user: user._id,
    });


    // Save to DB
    await user.save({ session });
    await course.save({ session });

    const payment = userPayment;

    // Prepare and Send Email
    const { title, firstName, middleName, lastName } = user.personalDetails || {};
    const isRussian = currency === "RUB";

    const courseName = isRussian ? course.nameRussian : course.name;


    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

      const emailSubject = isRussian
      ? `Счет за курс ${courseName} - ${nextInvoiceNumber} от EAFO`
      : `Invoice for the course ${courseName} - ${nextInvoiceNumber} from EAFO`;
    
      const emailBody = isRussian
  ? russianEmailTemplate(fullName, nextInvoiceNumber, payment.paymentLink, payment.package, payment.amount, payment.currency, courseName)
  : englishEmailTemplate(fullName, nextInvoiceNumber, payment.paymentLink, payment.package, payment.amount, payment.currency, courseName);

    const mail = { subject: emailSubject, html: emailBody };
    const emailResult = await sendEmailRusender({ email, name: fullName }, mail);


    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Payment created and email sent",
      invoiceNumber: nextInvoiceNumber,
      emailResult,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error during processing:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

router.post("/resend", async (req, res) => {
  const { email, invoiceNumber } = req.body;

  if (!email || !invoiceNumber) {
    return res.status(400).json({
      success: false,
      message: "Missing email or invoice number.",
    });
  }

  try {
    // Find the user and their payment
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");

    const course = await Course.findOne({
      "payments.invoiceNumber": invoiceNumber,
    });
    if (!course) throw new Error("Course with this invoice not found");

    const coursePayment = course.payments.find(
      (p) => p.invoiceNumber === invoiceNumber
    );
    const userCourse = user.courses.find((c) =>
      c.payments.some((p) => p.invoiceNumber === invoiceNumber)
    );

    const userPayment =
      userCourse?.payments.find((p) => p.invoiceNumber === invoiceNumber);

    const payment = coursePayment || userPayment;
    if (!payment) throw new Error("Payment not found");

    const { title, firstName, middleName, lastName } = user.personalDetails || {};
    const isRussian = payment.currency === "RUB";

    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

    const courseName = isRussian ? course.nameRussian : course.name;

    // ✅ Console log for course name
    console.log(`[Resend Email] Course Name: ${courseName}`);

    const emailSubject = isRussian
      ? `Счет за курс ${courseName} - ${invoiceNumber} от EAFO`
      : `Invoice for the course ${courseName} - ${invoiceNumber} from EAFO`;

    const emailBody = isRussian
      ? russianEmailTemplate(fullName, invoiceNumber, payment.paymentLink, payment.package, payment.payableAmount, payment.currency, courseName)
      : englishEmailTemplate(fullName, invoiceNumber, payment.paymentLink, payment.package, payment.payableAmount, payment.currency, courseName);

    const mail = { subject: emailSubject, html: emailBody };
    const emailResult = await sendEmailRusender({ email, name: fullName }, mail);

    return res.status(200).json({
      success: true,
      message: "Invoice email resent",
      emailResult,
    });

  } catch (error) {
    console.error("Resend email error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});


 

// Route for email sending with attachment
router.post("/email-send", upload.single("attachment"), async (req, res) => {
    try {
        const recipients = JSON.parse(req.body.recipients);
        const mail = JSON.parse(req.body.mail);


        if (!recipients || recipients.length === 0) {
            return res.status(400).json({ success: false, message: "❌ Recipients required." });
        }

        if (!mail || !mail.subject || !mail.html) {
            return res.status(400).json({ success: false, message: "❌ Missing email content." });
        }

        const emailPromises = recipients.map(async (recipient) => {
            try {
                //Send Email using Rusender API
                const result = await sendEmailRusender(recipient, mail);
                return result;
            } catch (error) {
                return { email: recipient.email, status: "Failed", error: error.message };
            }
        });

        const results = await Promise.all(emailPromises);

        res.json({
            success: true,
            message: "Emails sent successfully.",
            results,
        });

    } catch (error) {
        console.error("Internal Server Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});

module.exports = router;
