const express = require("express");
const axios = require("axios");  // ✅ Use Axios for API calls
require("dotenv").config();
const User = require("../models/User"); 
const Course = require("../models/Course"); 
const UserNotification = require("../models/UserNotificationSchema");
const multer = require("multer");
const mongoose = require("mongoose");


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
  const { email, courseId, transactionId, orderId, paymentUrl, currency, package: packageName,amount } = req.body;

  if (!email || !courseId || !transactionId || !orderId || !paymentUrl) {
    return res.status(400).json({ success: false, message: "❌ Missing required data." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📩 Finding User with email:", email);
    const user = await User.findOne({ email }).session(session);
    if (!user) throw new Error("❌ User not found");

    const userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) throw new Error("❌ User is not enrolled in this course");

    console.log("📋 User Course Payments:", userCourse.payments.map(p => p.paymentId));
    console.log("🔍 Searching for transactionId:", transactionId);

    const userPayment = userCourse.payments.find(p => p.transactionId === transactionId);
    if (!userPayment) throw new Error("❌ Transaction ID not found in user payments");

    console.log("✅ Found user payment.");

    // Find course
    const course = await Course.findById(courseId).session(session);
    if (!course) throw new Error("❌ Course not found");

    const coursePayment = course.payments.find(p => p.transactionId === transactionId);
    if (!coursePayment) throw new Error("❌ Transaction ID not found in course payments");

    console.log("✅ Found course payment.");

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

    console.log("🧾 Generated Invoice Number:", nextInvoiceNumber);

    // Update User Payment
    userPayment.invoiceNumber = nextInvoiceNumber;
    userPayment.paymentLink = paymentUrl;
    userPayment.status = "Pending",
    userPayment.orderId = orderId; // <-- Push orderId into paymentId field
    userPayment.time = new Date();
    userPayment.package = packageName;
    userPayment.amount = amount;
    userPayment.currency = currency;

    // Update Course Payment
    coursePayment.invoiceNumber = nextInvoiceNumber;
    coursePayment.paymentLink = paymentUrl;
    coursePayment.orderId = orderId;
    coursePayment.status = "Pending",
    coursePayment.time = new Date();
    coursePayment.package = packageName;
    coursePayment.amount = amount;
    coursePayment.currency = currency;

    console.log("📝 Updated payment info for User and Course");

    // Save changes
    await user.save({ session });
    await course.save({ session });

    console.log("💾 User and Course saved");

    // Prepare and Send Email
    const { title, firstName, middleName, lastName } = user.personalDetails || {};

    const isRussian = currency === "RUB";
    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

    const emailSubject = isRussian
      ? `Счет за 45-й курс онкопатологии EAFO - ${nextInvoiceNumber} от EAFO`
      : `Invoice for the 45th EAFO OncoPathology Course - ${nextInvoiceNumber} from EAFO`;

    const emailBody = isRussian
      ? `<p>Здравствуйте, ${fullName}. Ваш счет: <a href="${paymentUrl}">Оплатить</a></p>`
      : `<p>Hello, ${fullName}. Your invoice: <a href="${paymentUrl}">Pay Now</a></p>`;

    const mail = { subject: emailSubject, html: emailBody };

    const emailResult = await sendEmailRusender({ email, name: fullName }, mail);

    console.log("📧 Email successfully sent to:", email);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "✅ Invoice updated and email sent successfully",
      invoiceNumber: nextInvoiceNumber,
      emailResult
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error during email sending and updating:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});


router.post("/send-email", async (req, res) => {
  const { email, courseId, transactionId, orderId, paymentUrl, currency, package: packageName } = req.body;

  if (!email || !courseId || !transactionId || !orderId || !paymentUrl) {
    return res.status(400).json({ success: false, message: "❌ Missing required data." });
  }

  console.log(email)
  console.log(courseId)
  console.log(transactionId)
  console.log(orderId)
  console.log(paymentUrl)
  console.log(currency)
  console.log(packageName)

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📩 Finding User with email:", email);
    const user = await User.findOne({ email }).session(session);
    if (!user) throw new Error("❌ User not found");

    const userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) throw new Error("❌ User is not enrolled in this course");

    const course = await Course.findById(courseId).session(session);
    if (!course) throw new Error("❌ Course not found");

    // 🔢 Generate Invoice Number
    let currentInvoiceNumber = course.currentInvoiceNumber || "INV/EAFO-000-00001";
    const match = currentInvoiceNumber.match(/(\d{5})$/);
    let nextInvoiceNumber = "INV/EAFO-000-00001"; // default fallback

    if (match) {
      const currentNumber = parseInt(match[0], 10);
      nextInvoiceNumber = currentInvoiceNumber.replace(/\d{5}$/, (currentNumber + 1).toString().padStart(5, "0"));
    }

    course.currentInvoiceNumber = nextInvoiceNumber;
    console.log("🧾 Generated Invoice Number:", nextInvoiceNumber);

    // 💳 Create New Payment Entry
    const newPayment = {
      paymentLink: paymentUrl,
      package: packageName || "standard",
      currency,
      paymentId: orderId,
      orderId,
      transactionId,
      invoiceNumber: nextInvoiceNumber,
      time: new Date(),
      status: "Pending",
    };

    userCourse.payments.push(newPayment);
    course.payments.push({
      ...newPayment,
      user: user._id,
    });

    console.log("📝 New payment added for User and Course");

    // 💾 Save to DB
    await user.save({ session });
    await course.save({ session });
    console.log("✅ Changes saved to User and Course");

    // 📧 Prepare and Send Email
    const { title, firstName, middleName, lastName } = user.personalDetails || {};
    const isRussian = currency === "RUB";

    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

    const emailSubject = isRussian
      ? `Счет за 45-й курс онкопатологии EAFO - ${nextInvoiceNumber} от EAFO`
      : `Invoice for the 45th EAFO OncoPathology Course - ${nextInvoiceNumber} from EAFO`;

    const emailBody = isRussian
      ? `<p>Здравствуйте, ${fullName}.<br/>Ваш счет: <a href="${paymentUrl}">Оплатить</a></p>`
      : `<p>Hello, ${fullName}.<br/>Your invoice: <a href="${paymentUrl}">Pay Now</a></p>`;

    const mail = { subject: emailSubject, html: emailBody };
    const emailResult = await sendEmailRusender({ email, name: fullName }, mail);

    console.log("📧 Email sent to:", email);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "✅ Payment created and email sent",
      invoiceNumber: nextInvoiceNumber,
      emailResult,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error during processing:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
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
