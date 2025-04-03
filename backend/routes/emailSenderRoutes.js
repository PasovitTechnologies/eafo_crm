const express = require("express");
const axios = require("axios");  // ✅ Use Axios for API calls
require("dotenv").config();
const User = require("../models/User"); 
const Course = require("../models/Course"); 
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const RUSENDER_API = "https://api.beta.rusender.ru/api/v1/external-mails/send";

// ✅ Helper function to send emails using Rusender
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
      console.log("📤 Sending email to:", recipient.email);
      console.log("📨 Email Data:", JSON.stringify(emailData, null, 2));

      const response = await axios.post(RUSENDER_API, emailData, {
          headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.RUSENDER_API_KEY
          }
      });

      console.log(`✅ Email sent to ${recipient.email}:`, response.data);
      return { email: recipient.email, status: "Success", data: response.data };
  } catch (error) {
      console.error(`❌ Failed to send email to ${recipient.email}:`, error.response?.data || error.message);

      return { 
          email: recipient.email, 
          status: "Failed", 
          error: error.response?.data || error.message 
      };
  }
};


// ✅ Endpoint to send emails and save payments
router.post("/send", async (req, res) => {
  const { courseId, submission, paymentUrl, orderId, currency } = req.body;
  console.log(submission);

  if (!submission || !submission.email) {
    return res.status(400).json({ success: false, message: "❌ Submission data is required." });
  }

  if (!orderId || !paymentUrl || !submission.package || !submission.amount || !submission.currency) {
    return res.status(400).json({ success: false, message: "❌ Missing payment details." });
  }

  console.log("📤 Sending invoice email to:", submission.email);

  try {
    // 🔥 Fetch User
    let user = await User.findOne({ email: submission.email });
    if (!user) {
      return res.status(404).json({ success: false, message: "❌ User not found.", email: submission.email });
    }

    // 🔥 Extract Personal Details
    const { title, firstName, middleName, lastName } = user.personalDetails || {};
    console.log(`👤 User Found: ${title} ${firstName} ${middleName} ${lastName}`);

    // 🔥 Fetch Course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "❌ Course not found." });
    }

    console.log(`📌 Course found: ${course.name}`);

    // 🔥 Generate Invoice Number
    let currentInvoiceNumber = course.currentInvoiceNumber || "INV/EAFO-000-00001";
    const match = currentInvoiceNumber.match(/(\d{5})$/);
    let nextInvoiceNumber;

    if (match) {
      const currentNumber = parseInt(match[0], 10);
      nextInvoiceNumber = currentInvoiceNumber.replace(/\d{5}$/, (currentNumber + 1).toString().padStart(5, "0"));
      course.currentInvoiceNumber = nextInvoiceNumber;
      await course.save();
    } else {
      nextInvoiceNumber = "INV/EAFO-000-00001"; // Fallback
    }

    console.log(`✅ Generated Invoice Number: ${nextInvoiceNumber}`);

    // 🔥 Use Provided Payment URL
    const finalPaymentUrl = paymentUrl;
    console.log(currency);

    // 🔥 Format Name Correctly
    const isRussian = currency === "RUP";
    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

    // 🔥 Prepare Email Content
    const emailSubject = isRussian
      ? `Счет за 45-й курс онкопатологии EAFO - ${nextInvoiceNumber} от EAFO`
      : `Invoice for the 45th EAFO OncoPathology Course - ${nextInvoiceNumber} from EAFO`;

      const emailBody = isRussian
      ? `
          <p style="font-size: 18px;"><strong>${fullName}</strong>,</p>
          <p style="font-size: 16px;">Благодарим Вас за регистрацию на <strong>45-й EAFO курс по онкопатологии «Опухоли головы и шеи»</strong>, который пройдет 13-17 июня 2025 в г. Архангельск.</p>
          <p style="font-size: 16px;">Вы можете получить доступ к деталям платежа, нажав на ссылку ниже. Завершите процесс регистрации, произведя оплату.</p>
          <p style="font-size: 16px;"><strong>Ссылка для оплаты для российских участников:</strong></p>
          <a href="${finalPaymentUrl}" style="font-size: 18px; color:blue; font-weight: bold;">🔗 Оплатить</a>
          <p style="font-size: 16px;">*Участник должен оплатить сумму, указанную в счете, <strong>в течение 3 дней</strong>.</p>
          <p style="font-size: 16px;"><strong>После совершения платежа отправьте подтверждение банковского перевода и свое полное имя на адрес <a href="mailto:travel@eafo.info">travel@eafo.info</a></strong>.</p>
          <p style="font-size: 16px;">Если у вас есть какие-либо вопросы, свяжитесь с командой EAFO по адресу <a href="mailto:info@eafo.info">info@eafo.info</a></p>
          <p style="font-size: 16px;">С наилучшими пожеланиями,</p>
          <p style="font-size: 18px;"><strong>Команда EAFO</strong></p>
        `
      : `
          <p style="font-size: 18px;"><strong>${fullName}</strong>,</p>
          <p style="font-size: 16px;">Thank you for submitting your registration form for the <strong>45th EAFO OncoPathology Course “Head & Neck Tumors”</strong>, which will be held in Archangelsk on June 13 - 17, 2025.</p>
          <p style="font-size: 16px;">You can access your invoice with payment details by clicking on the link below. Complete the registration process by making payment.</p>
          <p style="font-size: 16px;"><strong>Payment link for Other country (apart from Russia) Participants:</strong></p>
          <a href="${finalPaymentUrl}" style="font-size: 18px; color:blue; font-weight: bold;">🔗 Complete Payment</a>
          <p style="font-size: 16px;">*Participant must pay the amount mentioned in the invoice within <strong>3 days</strong>.</p>
          <p style="font-size: 16px;">After you make the payment, please send the bank transfer confirmation and your full name to <a href="mailto:travel@eafo.info">travel@eafo.info</a>.</p>
          <p style="font-size: 16px;"><strong>If you have any questions, contact our team at <a href="mailto:info@eafo.info">info@eafo.info</strong></a></p>
          <p style="font-size: 16px;">Best regards,</p>
          <p style="font-size: 18px;"><strong>Team EAFO</strong></p>
        `;
    

    const mail = { subject: emailSubject, html: emailBody };
    const emailResult = await sendEmailRusender({ email: submission.email, name: fullName }, mail);

    // 🔥 Save Payment in User Schema
    let userCourse = user.courses.find((c) => c.courseId.toString() === courseId.toString());
    if (userCourse) {
      userCourse.payments.push({
        invoiceNumber: nextInvoiceNumber,
        paymentId: orderId,
        package: submission.package,
        amount: submission.amount,
        currency: submission.currency,
        paymentLink: finalPaymentUrl,
        status: "Pending",
        time: new Date(),
      });

      await user.save();
      console.log(`✅ Payment saved for user: ${submission.email}`);
    }

    // 🔥 Save Payment in Course Schema
    course.payments.push({
      invoiceNumber: nextInvoiceNumber,
      paymentId: orderId,
      package: submission.package,
      amount: submission.amount,
      currency: submission.currency,
      paymentLink: finalPaymentUrl,
      status: "Pending",
      time: new Date(),
    });

    await course.save();
    console.log(`✅ Payment saved in course: ${courseId}`);

    res.json({ success: true, message: "✅ Invoice email sent & payment saved.", emailResult });

  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    res.status(500).json({ success: false, message: "❌ Internal Server Error.", error: error.message });
  }
});



  
  
  
  

// ✅ Route for email sending with attachment
router.post("/email-send", upload.single("attachment"), async (req, res) => {
    try {
        const recipients = JSON.parse(req.body.recipients);
        const mail = JSON.parse(req.body.mail);

        console.log("📥 Received Request:", { recipients, mail });

        if (!recipients || recipients.length === 0) {
            return res.status(400).json({ success: false, message: "❌ Recipients required." });
        }

        if (!mail || !mail.subject || !mail.html) {
            return res.status(400).json({ success: false, message: "❌ Missing email content." });
        }

        const emailPromises = recipients.map(async (recipient) => {
            try {
                // ✅ Send Email using Rusender API
                const result = await sendEmailRusender(recipient, mail);
                return result;
            } catch (error) {
                console.error(`❌ Failed to send email to ${recipient.email}:`, error);
                return { email: recipient.email, status: "Failed", error: error.message };
            }
        });

        const results = await Promise.all(emailPromises);

        res.json({
            success: true,
            message: "✅ Emails sent successfully.",
            results,
        });

    } catch (error) {
        console.error("❌ Internal Server Error:", error);
        res.status(500).json({ success: false, message: "❌ Internal Server Error", error: error.message });
    }
});

module.exports = router;
