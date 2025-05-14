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
  } catch (error) {

      return { 
          email: recipient.email, 
          status: "Failed", 
          error: error.response?.data || error.message 
      };
  }
};


// Endpoint to send emails and save payments
router.post("/send", async (req, res) => {
  const { email, courseId, transactionId, orderId, paymentUrl, currency, package: packageName,amount } = req.body;

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

    // Update Course Payment
    coursePayment.invoiceNumber = nextInvoiceNumber;
    coursePayment.paymentLink = paymentUrl;
    coursePayment.orderId = orderId;
    coursePayment.status = "Pending",
    coursePayment.time = moment.tz("Europe/Moscow").toDate();
    coursePayment.package = packageName;
    coursePayment.amount = amount;
    coursePayment.currency = currency;


    // Save changes
    await user.save({ session });
    await course.save({ session });


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
  const { email, courseId, transactionId, orderId, paymentUrl, currency, package: packageName } = req.body;

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
      ? `<p>Здравствуйте, ${fullName}.<br/>Ваш счет: <a href="${paymentUrl}">Оплатить</a></p>`
      : `<p>Hello, ${fullName}.<br/>Your invoice: <a href="${paymentUrl}">Pay Now</a></p>`;

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

    const emailSubject = isRussian
      ? `Счет за 45-й курс онкопатологии EAFO - ${invoiceNumber} от EAFO`
      : `Invoice for the 45th EAFO OncoPathology Course - ${invoiceNumber} from EAFO`;

    const emailBody = isRussian
      ? `<p>Здравствуйте, ${fullName}.<br/>Ваш счет: <a href="${payment.paymentLink}">Оплатить</a></p>`
      : `<p>Hello, ${fullName}.<br/>Your invoice: <a href="${payment.paymentLink}">Pay Now</a></p>`;

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
