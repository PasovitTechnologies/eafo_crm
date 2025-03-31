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
            previewTitle: mail.subject,  // Rusender requires previewTitle
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

        console.log(`✅ Email sent to ${recipient.email}:`, response.data);
        return { email: recipient.email, status: "Success", data: response.data };
    } catch (error) {
        console.error(`❌ Failed to send email to ${recipient.email}:`, error.response?.data || error.message);
        return { email: recipient.email, status: "Failed", error: error.message };
    }
};

// ✅ Endpoint to send emails and save payments
router.post("/send", async (req, res) => {
    const { courseId, recipients, mail, paymentUrl, orderId, package, amount, currency } = req.body;
  
    console.log("📥 Received Request Body:", req.body);
  
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "❌ Recipients list is required." });
    }
  
    if (!mail || !mail.subject || !mail.html) {
      return res.status(400).json({ success: false, message: "❌ Missing email content (subject or HTML body)." });
    }
  
    if (!orderId || !paymentUrl || !package || !amount || !currency) {
      return res.status(400).json({ success: false, message: "❌ Missing payment details." });
    }
  
    console.log("📤 Sending emails to:", recipients.map((r) => r.email).join(", "));
  
    try {
      // 🔥 Fetch the course
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "❌ Course not found." });
      }
  
      console.log(`📌 Course found: ${course.name}`);
  
      // 🔥 Extract and increment `currentInvoiceNumber`
      let currentInvoiceNumber = course.currentInvoiceNumber || "INV/EAFO-000-00001";
  
      console.log(`🔢 Current Invoice Number: ${currentInvoiceNumber}`);
  
      // Extract and increment the last 5 digits
      const match = currentInvoiceNumber.match(/(\d{5})$/);
      let nextInvoiceNumber;
  
      if (match) {
        const currentNumber = parseInt(match[0], 10);
        const nextNumber = currentNumber + 1;
  
        // Generate the new invoice number
        nextInvoiceNumber = currentInvoiceNumber.replace(
          /\d{5}$/,
          nextNumber.toString().padStart(5, "0")
        );
  
        // Update the course with the new invoice number
        course.currentInvoiceNumber = nextInvoiceNumber;
        await course.save();
  
        console.log(`✅ Incremented Invoice Number: ${nextInvoiceNumber}`);
      } else {
        console.log(`🚫 Failed to parse the current invoice number.`);
        nextInvoiceNumber = currentInvoiceNumber || "INV/EAFO-000-00001";  // Fallback
      }
  
      // 🔥 Send Emails and Add Payments
      const emailPromises = recipients.map(async (recipient) => {
        try {
          // ✅ Send Email using Rusender
          const emailResult = await sendEmailRusender(recipient, mail);
  
          // 🔥 Step 1: Find the User
          let user = await User.findOne({ email: recipient.email });
  
          if (!user) {
            console.log(`🚫 User not found: ${recipient.email}`);
            return { email: recipient.email, status: "User not found" };
          }
  
          console.log(`📌 User found: ${recipient.email}`);
  
          // 🔥 Step 2: Add Payment to User
          let userCourse = user.courses.find((c) => c.courseId?.toString() === courseId?.toString());
  
          if (userCourse) {
            console.log(`✅ Course found in User schema, adding payment.`);
  
            const finalInvoiceNumber = nextInvoiceNumber || "INV/EAFO-000-00001";  // Fallback if missing
  
            // Log the invoice number before adding
            console.log(`📄 Invoice Number: ${finalInvoiceNumber}`);
  
            userCourse.payments.push({
              invoiceNumber: finalInvoiceNumber,   // ✅ Ensure invoice number is always present
              paymentId: orderId,
              package,
              amount,
              currency,
              paymentLink: paymentUrl,
              status: "Pending",
              time: new Date(),
            });
  
            await user.save();
            console.log(`✅ User payment saved: ${recipient.email}`);
          } else {
            console.log(`🚫 Course not found in User schema for ${recipient.email}. Skipping payment.`);
          }
  
          // 🔥 Step 3: Add Payment to Course Schema
          course.payments.push({
            invoiceNumber: nextInvoiceNumber || "INV/EAFO-000-00001",   // ✅ Fallback if missing
            paymentId: orderId,
            package,
            amount,
            currency,
            paymentLink: paymentUrl,
            status: "Pending",
            time: new Date(),
          });
  
          await course.save();
          console.log(`✅ Course payment saved: ${courseId}`);
  
          return emailResult;
  
        } catch (error) {
          console.error(`❌ Error processing ${recipient.email}:`, error.message);
          return { email: recipient.email, status: "Failed", error: error.message };
        }
      });
  
      const results = await Promise.all(emailPromises);
      res.json({ success: true, message: "✅ Emails sent, payments saved, and invoice number incremented.", results });
  
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
