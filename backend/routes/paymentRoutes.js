const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();
const User = require("../models/User"); // Import the User schema
const Course = require("../models/Course");


// Load environment variables
const alfUser = process.env.ALFABANK_USER;
const alfPassword = process.env.ALFABANK_PASSWORD;
const alfApiUrl = process.env.ALFABANK_API_URL;


// Handle Payment Request for AlfaBank (without items & description)
router.post("/alfabank/pay", async (req, res) => {
  try {
    const {
      orderNumber, amount, returnUrl, failUrl, email,
      courseId, formId, packages, transactionId,
      payableAmount, discountPercentage, code,
    } = req.body;

    console.log("📥 /alfabank/pay request received");
    console.log("🧾 orderNumber:", orderNumber);
    console.log("💰 amount:", amount);
    console.log("📧 email:", email);
    console.log("📘 courseId:", courseId);
    console.log("🧾 transactionId:", transactionId);
    console.log("📦 packages:", packages);
    console.log("💵 payableAmount:", payableAmount);

    if (!orderNumber || !amount || !returnUrl || !failUrl || !email) {
      console.error("❌ Missing required fields:", {
        orderNumber, amount, returnUrl, failUrl, email,
      });
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 🔍 Load course and user
    const course = await Course.findById(courseId);
    const user = await User.findOne({ email });

    if (!course || !user) {
      console.error("❌ User or course not found");
      return res.status(404).json({ success: false, message: "User or course not found" });
    }

    console.log("✅ User and course loaded");

    // 🔢 Generate invoice number
    let currentInvoiceNumber = course.currentInvoiceNumber || "EAFO-003/25/0100";
    const match = currentInvoiceNumber.match(/(\d{4})$/);
    let nextInvoiceNumber = currentInvoiceNumber;

    if (match) {
      const newNumber = (parseInt(match[1], 10) + 1).toString().padStart(4, "0");
      nextInvoiceNumber = currentInvoiceNumber.replace(/(\d{4})$/, newNumber);
    }

    course.currentInvoiceNumber = nextInvoiceNumber;

    console.log("🧾 Next invoice number:", nextInvoiceNumber);

    // 🧾 Normalize packages
    const normalizedPackages = packages.map(pkg => ({
      name: pkg.name,
      amount: parseFloat(pkg.amount),
      currency: pkg.currency,
      quantity: parseInt(pkg.quantity),
    }));

    const currency = normalizedPackages[0].currency;

    const commonData = {
      invoiceNumber: nextInvoiceNumber,
      paymentLink: null,
      status: "Pending",
      orderId: orderNumber,
      time: new Date(),
      packages: normalizedPackages,
      totalAmount: amount,
      payableAmount,
      currency,
      discountPercentage: parseFloat(discountPercentage || 0),
      discountCode: code,
      transactionId,
    };

    // 🛠️ Update user payments
    let userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) {
      console.warn("⚠️ Course not found in user. Creating entry.");
      userCourse = { courseId, payments: [] };
      user.courses.push(userCourse);
    }

    let userPayment = userCourse.payments.find(p => p.transactionId === transactionId);
    if (!userPayment) {
      console.warn("⚠️ Transaction not found in user payments. Creating new.");
      userPayment = { transactionId };
      userCourse.payments.push(userPayment);
    }

    Object.assign(userPayment, commonData);
    console.log("✅ User payment updated");

    // 🛠️ Update course payments
    let coursePayment = course.payments.find(p => p.transactionId === transactionId);
    if (!coursePayment) {
      console.warn("⚠️ Transaction not found in course payments. Creating new.");
      coursePayment = { transactionId };
      course.payments.push(coursePayment);
    }

    Object.assign(coursePayment, commonData);
    console.log("✅ Course payment updated");

    // 🏦 Prepare AlfaBank request
    const formData = new URLSearchParams();
    formData.append("userName", alfUser);
    formData.append("password", alfPassword);
    formData.append("orderNumber", orderNumber);
    formData.append("amount", amount * 100); // minor currency
    formData.append("returnUrl", returnUrl);
    formData.append("failUrl", failUrl);
    formData.append("email", email);
    formData.append("sessionTimeoutSecs", 259200);

    console.log("🚀 Sending payment registration to AlfaBank...");

    const response = await axios.post(
      `${alfApiUrl}/api/rest/register.do`,
      formData.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    if (response.data.formUrl) {
      console.log("✅ AlfaBank payment URL generated:", response.data.formUrl);

      userPayment.paymentLink = response.data.formUrl;
      coursePayment.paymentLink = response.data.formUrl;

      if (response.data.orderId) {
        userPayment.paymentId = response.data.orderId;
        coursePayment.paymentId = response.data.orderId;
        console.log("🆔 AlfaBank orderId saved:", response.data.orderId);
      }

      await user.save();
      await course.save();

      console.log("💾 User and course saved with payment info");

      return res.json({
        success: true,
        paymentUrl: response.data.formUrl,
        orderId: response.data.orderId,
        invoiceNumber: nextInvoiceNumber,
      });
    } else {
      console.error("❌ AlfaBank error:", response.data.errorMessage);
      return res.status(400).json({
        success: false,
        message: response.data.errorMessage || "Error generating payment URL",
      });
    }
  } catch (error) {
    console.error("❌ Payment error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});



router.post("/invoice-creator/alfabank/pay", async (req, res) => {
  try {
    const {
      orderNumber,
      amount,
      returnUrl,
      failUrl,
      email,
      courseId,
      formId = null,
      packages = [],
      transactionId,
      payableAmount = amount,
      discountPercentage = 0,
      code = null,
    } = req.body;

    console.log("📥 /alfabank/pay request received");
    console.log("🧾 orderNumber:", orderNumber);
    console.log("💰 amount:", amount);
    console.log("📧 email:", email);
    console.log("📘 courseId:", courseId);
    console.log("🧾 transactionId:", transactionId);
    console.log("📦 packages:", packages);
    console.log("💵 payableAmount:", payableAmount);

    // Validate required fields
    if (!orderNumber || !amount || !returnUrl || !failUrl || !email || !courseId) {
      console.error("❌ Missing required fields:", {
        orderNumber, amount, returnUrl, failUrl, email, courseId,
      });
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Load course and user
    const course = await Course.findById(courseId);
    const user = await User.findOne({ email });

    if (!course || !user) {
      console.error("❌ User or course not found");
      return res.status(404).json({ success: false, message: "User or course not found" });
    }

    console.log("✅ User and course loaded");

    // Generate next invoice number
    let currentInvoiceNumber = course.currentInvoiceNumber || "EAFO-003/25/0100";
    const match = currentInvoiceNumber.match(/(\d{4})$/);
    let nextInvoiceNumber = currentInvoiceNumber;

    if (match) {
      const newNumber = (parseInt(match[1], 10) + 1).toString().padStart(4, "0");
      nextInvoiceNumber = currentInvoiceNumber.replace(/(\d{4})$/, newNumber);
    }

    course.currentInvoiceNumber = nextInvoiceNumber;
    console.log("🧾 Next invoice number:", nextInvoiceNumber);

    // Normalize packages
    const normalizedPackages = packages.map(pkg => ({
      name: pkg.name,
      amount: parseFloat(pkg.amount),
      currency: pkg.currency,
      quantity: parseInt(pkg.quantity),
    }));

    const currency = normalizedPackages[0]?.currency || "RUB";

    const newPayment = {
      email,
      invoiceNumber: nextInvoiceNumber,
      paymentLink: null,
      status: "Pending",
      orderId: orderNumber,
      time: new Date(),
      packages: normalizedPackages,
      totalAmount: amount,
      payableAmount,
      currency,
      discountPercentage: parseFloat(discountPercentage),
      discountCode: code,
      transactionId,
    };

    // Always push a new payment object
    let userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) {
      console.warn("⚠️ Course not found in user. Creating entry.");
      userCourse = { courseId, payments: [] };
      user.courses.push(userCourse);
    }
    userCourse.payments.push({ ...newPayment });

    let coursePaymentBlock = course.payments;
    coursePaymentBlock.push({ ...newPayment });

    console.log("✅ New payment added to user and course");

    // Register with AlfaBank
    const formData = new URLSearchParams();
    formData.append("userName", alfUser);
    formData.append("password", alfPassword);
    formData.append("orderNumber", orderNumber);
    formData.append("amount", amount * 100); // minor currency
    formData.append("returnUrl", returnUrl);
    formData.append("failUrl", failUrl);
    formData.append("email", email);
    formData.append("sessionTimeoutSecs", 259200);

    console.log("🚀 Sending payment registration to AlfaBank...");

    const response = await axios.post(
      `${alfApiUrl}/api/rest/register.do`,
      formData.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    if (response.data.formUrl) {
      console.log("✅ AlfaBank payment URL generated:", response.data.formUrl);

      const latestUserPayment = userCourse.payments[userCourse.payments.length - 1];
      const latestCoursePayment = coursePaymentBlock[coursePaymentBlock.length - 1];

      latestUserPayment.paymentLink = response.data.formUrl;
      latestCoursePayment.paymentLink = response.data.formUrl;

      if (response.data.orderId) {
        latestUserPayment.paymentId = response.data.orderId;
        latestCoursePayment.paymentId = response.data.orderId;
        console.log("🆔 AlfaBank orderId saved:", response.data.orderId);
      }

      await user.save();
      await course.save();

      console.log("💾 User and course saved with payment info");

      return res.json({
        success: true,
        paymentUrl: response.data.formUrl,
        orderId: response.data.orderId,
        invoiceNumber: nextInvoiceNumber,
      });
    } else {
      console.error("❌ AlfaBank error:", response.data.errorMessage);
      return res.status(400).json({
        success: false,
        message: response.data.errorMessage || "Error generating payment URL",
      });
    }
  } catch (error) {
    console.error("❌ Payment error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});





// Handle Payment Status Request for AlfaBank
router.post("/alfabank/status", async (req, res) => {  
  try {
    const { orderId } = req.body;

    if (!orderId) {
      console.log("Missing order ID in request body.");
      return res.status(400).json({ success: false, message: "Missing order ID" });
    }

    // AlfaBank API request
    const formData = new URLSearchParams();
    formData.append("userName", alfUser);
    formData.append("password", alfPassword);
    formData.append("orderId", orderId);


    const response = await axios.post(
      `${alfApiUrl}/api/rest/getOrderStatus.do`,
      formData.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );


    const { OrderStatus, Amount } = response.data;
    const statusMessages = {
      0: "Order registered, not paid",
      1: "Amount pre-authorized",
      2: "Payment successful",
      3: "Authorization canceled",
      4: "Refunded",
      5: "Authorization initiated via ACS",
      6: "Authorization declined",
    };

    const paymentStatus = statusMessages[OrderStatus] || "Unknown status";

    return res.json({
      success: true,
      paymentStatus,
      amount: Amount / 100,
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment status" });
  }
});

router.post("/updateStatus", async (req, res) => {
  try {
    const { email, paymentId, status, courseId } = req.body;

    console.log(`🔹 Received Request - Email: ${email}, Payment ID: ${paymentId}, Status: ${status}, Course ID: ${courseId}`);

    // Validate required fields
    if (!email || !paymentId || !status || !courseId) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }


    // Find the specific course in the User schema
    const userCourse = user.courses.find(c => c.courseId.toString() === courseId.toString());

    if (!userCourse) {
      console.log(`Course not found in User schema: ${courseId}`);
      return res.status(404).json({ success: false, message: "Course not found for this user." });
    }


    // Find the specific payment by ID in the User schema
    const userPayment = userCourse.payments.find(p => p.paymentId === paymentId);

    if (!userPayment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    userPayment.status = status;

    await user.save();

    const course = await Course.findOne({ _id: courseId });

    if (!course) {
      return res.status(404).json({ success: false, message: "❌ Course not found." });
    }


    const coursePayment = course.payments.find(p => p.paymentId === paymentId);

    if (!coursePayment) {
      console.log(`Payment not found in Course schema: ${paymentId}`);
      return res.status(404).json({ success: false, message: "Payment not found in Course schema." });
    }


    coursePayment.status = status;

    // Save updated Course schema
    await course.save();
    console.log(`Course payment status updated to: ${status}`);

    // Send success response
    res.json({
      success: true,
      message: "Payment status updated successfully in both User and Course schemas.",
      user,
      course
    });

  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});







module.exports = router;
