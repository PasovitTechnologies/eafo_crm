const express = require("express");
const axios = require("axios");
const User = require("../models/User"); 
const Course = require("../models/Course"); 
const UserNotification = require("../models/UserNotificationSchema");
const mongoose = require("mongoose");


const router = express.Router();

// Load environment variables
const WAPPI_BASE_URL = "https://wappi.pro";
const API_TOKEN = process.env.WAPPI_API_TOKEN;
const PROFILE_ID = process.env.WAPPI_PROFILE_ID;


router.get("/check", async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ error: "Missing phone number" });
  }

  try {
    const response = await axios.get(`${WAPPI_BASE_URL}/api/sync/contact/check`, {
      headers: {
        Authorization: API_TOKEN,
      },
      params: {
        profile_id: PROFILE_ID,
        phone,
      },
    });

    const onWhatsApp = response.data?.on_whatsapp || false;

    res.json({
      exists: onWhatsApp, // ✅ This line is important
      original: response.data, // Optional: for debugging
    });
  } catch (error) {
    console.error("WhatsApp check error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to check WhatsApp registration" });
  }
});


// Fetch All WhatsApp Chats (No Limits)
router.get("/chats", async (req, res) => {
  try {

    if (!API_TOKEN || !PROFILE_ID) {
      console.error("Missing API token or profile ID");
      return res.status(500).json({ error: "Missing API credentials" });
    }

    const response = await axios.get(`${WAPPI_BASE_URL}/api/sync/chats/get`, {
      headers: { Authorization: API_TOKEN },
      params: { profile_id: PROFILE_ID, show_all: true },
    });

    if (response.status !== 200) {
      console.error("Failed to fetch chats:", response.data);
      return res.status(response.status).json(response.data);
    }

    res.json(response.data);

  } catch (error) {
    console.error("Error fetching chats:", error.message);
    
    if (error.response) {
      console.warn("API Response:", error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});


// Fetch WhatsApp Chats with Optional Filter
router.get("/chats/filter", async (req, res) => {
  const { client_name } = req.query;

  try {
    const response = await axios.get(
      `${WAPPI_BASE_URL}/api/sync/chats/filter`,
      {
        headers: { Authorization: API_TOKEN },
        params: {
          profile_id: PROFILE_ID,
          client_name,
        },
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("Error filtering chats:", error.message);
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Server error" });
  }
});

// Send WhatsApp Message
// routes/whatsapp.js
router.post("/send", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: "'to' and 'message' are required"
    });
  }

  try {
    const response = await axios.post(
      `${WAPPI_BASE_URL}/api/sync/message/send`,
      {
        body: message,
        recipient: to,
      },
      {
        headers: { Authorization: API_TOKEN },
        params: { profile_id: PROFILE_ID },
        timeout: 30000
      }
    );


    // Be more flexible with success detection
    if (response.status === 200 && response.data) {
      const wasSent = response.data.sent === true;

      return res.status(wasSent ? 200 : 202).json({
        success: wasSent,
        status: wasSent ? 'sent' : 'pending',
        message: wasSent
          ? 'Message delivered successfully'
          : 'Message was processed but not confirmed as sent',
        data: response.data
      });
    }

    return res.status(502).json({
      success: false,
      error: 'Unexpected response from WhatsApp API',
      data: response.data
    });

  } catch (error) {
    // Log more details to aid debugging
    console.error("Error sending message:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});


router.post("/send-wp", async (req, res) => {

  const requiredFields = ["to", "message", "courseId", "orderId", "transactionId", "paymentUrl", "email"];
  const missingFields = requiredFields.filter(field => !req.body[field]);

  if (missingFields.length > 0) {
    console.log("Missing Fields:", missingFields);
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(", ")}`
    });
  }

  const { to, message, courseId, orderId, transactionId, paymentUrl, email, package: packageName, amount, currency, payableAmount, discountPercentage, code } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const response = await axios.post(
      `${WAPPI_BASE_URL}/api/sync/message/send`,
      { body: message, recipient: to },
      {
        headers: { Authorization: API_TOKEN },
        params: { profile_id: PROFILE_ID },
        timeout: 30000
      }
    );


    if (response.data?.status !== "done") {
      throw new Error("Failed to send WhatsApp message");
    }

    // Fetch course
    const course = await Course.findById(courseId).session(session);
    if (!course) throw new Error("Course not found");


    // Find the User by Email
    const user = await User.findOne({ email }).session(session);
    if (!user) {
      console.log(`No user found for email: ${email}`);
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "User not found" });
    }


    // Find User Course
    const userCourse = user.courses.find(c => c.courseId?.toString() === courseId?.toString());
    if (!userCourse) throw new Error("User not enrolled in the course");

    // Find Payment inside User
    const userPayment = userCourse.payments.find(p => p.transactionId === transactionId);
    if (!userPayment) throw new Error("Transaction ID not found in user payments");


    // Find Payment inside Course
    const coursePayment = course.payments.find(p => p.transactionId === transactionId);
    if (!coursePayment) throw new Error("Transaction ID not found in course payments");


// Generate new Invoice Number
let currentInvoiceNumber = course.currentInvoiceNumber || "EAFO-003/25/0100";

// Match the last 4 digits
const match = currentInvoiceNumber.match(/(\d{4})$/);

let nextInvoiceNumber = match
  ? currentInvoiceNumber.replace(/(\d{4})$/, (parseInt(match[1], 10) + 1).toString().padStart(4, "0"))
  : "EAFO-003/25/0100";  // Fallback

course.currentInvoiceNumber = nextInvoiceNumber;


    // Update user payment
    userPayment.invoiceNumber = nextInvoiceNumber;
    userPayment.paymentLink = paymentUrl;
    userPayment.orderId = orderId;
    userPayment.time = new Date();
    userPayment.viaWhatsApp = true;
    userPayment.status = "Pending";
    userPayment.package = packageName;
    userPayment.amount = amount;
    userPayment.currency = currency;
    userPayment.payableAmount = payableAmount;
    userPayment.discountPercentage = discountPercentage;
    userPayment.discountCode = code;

    // Update course payment
    coursePayment.invoiceNumber = nextInvoiceNumber;
    coursePayment.paymentLink = paymentUrl;
    coursePayment.orderId = orderId;
    coursePayment.time = new Date();
    coursePayment.viaWhatsApp = true;
    coursePayment.status = "Pending";
    coursePayment.package = packageName;
    coursePayment.amount = amount;
    coursePayment.currency = currency;
    coursePayment.payableAmount = payableAmount;
    coursePayment.discountPercentage = discountPercentage;
    coursePayment.discountCode = code;

    // Save user and course
    await user.save({ session });
    await course.save({ session });


    // Create Notification
    const notification = {
      type: "payment_created",
      courseId: courseId,
      courseName: course.name,
      invoiceNumber: nextInvoiceNumber,
      message: {
        en: `Payment invoice #${nextInvoiceNumber} has been updated for ${course.name}`,
        ru: `Счет на оплату #${nextInvoiceNumber} был обновлен для ${course.name}`,
      },
      read: false,
      createdAt: new Date(),
      paymentLink: paymentUrl,
      amount: userPayment.amount,
      currency: userPayment.currency,
      viaWhatsApp: true
    };

    let userNotification = await UserNotification.findOne({ userId: user._id }).session(session);
    if (!userNotification) {
      userNotification = new UserNotification({
        userId: user._id,
        notifications: [notification]
      });
    } else {
      userNotification.notifications.push(notification);
    }

    await userNotification.save({ session });

    await session.commitTransaction();

    return res.json({
      success: true,
      status: "sent",
      message: "WhatsApp message sent and payment updated successfully",
      invoiceNumber: nextInvoiceNumber
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error sending WhatsApp message:", error.message, error.response?.data);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  } finally {
    session.endSession();
  }
});

router.post("/resend-whatsapp", async (req, res) => {
  const { phone, invoiceNumber } = req.body;

  if (!phone || !invoiceNumber) {
    return res.status(400).json({
      success: false,
      message: "Missing phone or invoice number",
    });
  }

  try {
    // Find the course containing the invoice
    const course = await Course.findOne({
      "payments.invoiceNumber": invoiceNumber,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found in any course",
      });
    }

    const payment = course.payments.find(
      (p) => p.invoiceNumber === invoiceNumber
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Compose WhatsApp message
    const message = `*Payment Invoice*

💼 *Package:* ${payment.package}
💰 *Amount:* ${payment.amount} ${payment.currency}
📄 *Invoice No:* ${payment.invoiceNumber}
🔗 *Payment Link:* ${payment.paymentLink}`;

    const response = await axios.post(
      `${WAPPI_BASE_URL}/api/sync/message/send`,
      {
        body: message,
        recipient: phone,
      },
      {
        headers: { Authorization: API_TOKEN },
        params: { profile_id: PROFILE_ID },
        timeout: 30000,
      }
    );

    if (response.data?.status !== "done") {
      throw new Error("Failed to send WhatsApp message");
    }


    return res.status(200).json({
      success: true,
      message: "WhatsApp message resent",
      invoiceNumber,
    });
  } catch (error) {
    console.error("Resend WhatsApp error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
});







// Fetch All Messages of a Chat
router.get("/chat/messages", async (req, res) => {
  const { chat_id } = req.query;

  if (!chat_id) {
    return res.status(400).json({ error: "chat_id is required" });
  }

  try {
    const response = await axios.get(
      `${WAPPI_BASE_URL}/api/sync/messages/get`,
      {
        headers: { Authorization: API_TOKEN },
        params: {
          profile_id: PROFILE_ID,
          chat_id,
        },
      }
    );

    const messages = response.data?.messages || [];
    const uniqueMessages = Array.from(
      new Map(messages.map((msg) => [msg.id, msg])).values()
    );

    res.json(uniqueMessages);
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    res.status(error.response?.status || 500).json({
      error: "Server error while fetching messages.",
      details: error.response?.data || error.message,
    });
  }
});

// Fetch Media Data by Media ID
router.get("/media", async (req, res) => {
  const { message_id } = req.query;

  if (!message_id) {
    return res.status(400).json({ error: "message_id is required" });
  }

  try {
    const metaResponse = await axios.get(
      `${WAPPI_BASE_URL}/api/sync/message/media/download`,
      {
        headers: { Authorization: API_TOKEN, Accept: "application/json" },
        params: {
          profile_id: PROFILE_ID,
          message_id,
        },
      }
    );

    if (metaResponse.status !== 200 || !metaResponse.data.file_link) {
      return res
        .status(404)
        .json({ error: "Media not found or no download link provided." });
    }

    const { file_link, file_name, mime_type } = metaResponse.data;

    res.json({
      status: "success",
      file_name,
      mime_type,
      file_link,
    });
  } catch (error) {
    console.error("Error fetching media data:", error.message);
    res.status(error.response?.status || 500).json({
      error: "Server error while fetching media data.",
      details: error.response?.data || error.message,
    });
  }
});

router.post("/document/send", async (req, res) => {
  const { to, file_name, file_data, file_type } = req.body;


  // Validate Input
  if (!to || !file_name || !file_data || !file_type) {
    console.error("Validation Failed: Missing required fields");
    return res.status(400).json({
      error: "'to', 'file_name', 'file_data', and 'file_type' are required",
    });
  }

  // Format the Recipient Phone Number
  const formattedRecipient = to.replace("@c.us", "");

  // Prepare Payload
  let apiUrl;
  const payload = {
    recipient: formattedRecipient,
    file_name: file_name,
    b64_file: file_data,
  };

 

  // Determine the Correct API Endpoint
  switch (file_type) {
    case "document":
      apiUrl = `${WAPPI_BASE_URL}/api/sync/message/document/send`;
      break;
    case "image":
      apiUrl = `${WAPPI_BASE_URL}/api/sync/message/img/send`;
      break;
    case "video":
      apiUrl = `${WAPPI_BASE_URL}/api/sync/message/video/send`;
      break;
    default:
      console.error("Unsupported File Type:", file_type);
      return res.status(400).json({ error: "Unsupported file type" });
  }


  try {
    // Send POST Request to Wappi API
    const response = await axios.post(apiUrl, payload, {
      headers: { Authorization: API_TOKEN },
      params: { profile_id: PROFILE_ID },
    });

    return res.json(response.data);
  } catch (error) {
    console.error("Error Sending File:", error.message);

    if (error.response) {
      console.warn("Response Data:", error.response.data);
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      console.warn("No Response Received:", error.request);
      return res
        .status(502)
        .json({ error: "Bad Gateway: No response from Wappi API" });
    } else {
      console.warn("Request Setup Error:", error.message);
      return res
        .status(500)
        .json({ error: "Server error: Request setup failed" });
    }
  }
});

module.exports = router;