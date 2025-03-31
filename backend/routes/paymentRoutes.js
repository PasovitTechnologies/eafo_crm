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

console.log("AlfaBank User:", alfUser);  // Debugging: Check if environment variables are correctly loaded
console.log("AlfaBank API URL:", alfApiUrl);  // Debugging: Check if environment variables are correctly loaded

// ✅ Handle Payment Request for AlfaBank (without items & description)
router.post("/alfabank/pay", async (req, res) => {
  try {
    // Destructure required fields from the request body
    const { orderNumber, amount, returnUrl, failUrl, email } = req.body;

    // Log incoming request data for debugging
    console.log("Received request body:", req.body);

    // Validate required fields
    if (!orderNumber || !amount || !returnUrl || !failUrl || !email) {
      console.error("Missing required fields:", { orderNumber, amount, returnUrl, failUrl, email });
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // ✅ Prepare payment request
    const formData = new URLSearchParams();
    formData.append("userName", alfUser);
    formData.append("password", alfPassword);
    formData.append("orderNumber", orderNumber);  // Use the orderNumber passed from the frontend
    formData.append("amount", amount * 100); // Convert to minor currency (cents)
    formData.append("returnUrl", returnUrl);
    formData.append("failUrl", failUrl);
    formData.append("email", email);
    formData.append("sessionTimeoutSecs", 259200); // 3-day session timeout

    // Log the request to AlfaBank for debugging
    console.log("Sending request to AlfaBank:", formData.toString());

    // ✅ Send request to AlfaBank API
    const response = await axios.post(
      `${alfApiUrl}/api/rest/register.do`, // Make sure to use the correct AlfaBank API URL
      formData.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Log the response from AlfaBank for debugging
    console.log("AlfaBank response data:", response.data);

    // If the response contains the payment form URL, return it to the client
    if (response.data.formUrl) {
      console.log("Payment URL generated:", response.data.formUrl);
      return res.json({
        success: true,
        paymentUrl: response.data.formUrl, 
        orderId: response.data.orderId  // Return the orderId from the AlfaBank response
      });
    } else {
      console.error("AlfaBank response error:", response.data.errorMessage);
      return res.status(400).json({
        success: false,
        message: response.data.errorMessage || "Error generating payment URL"
      });
    }
  } catch (error) {
    // Log error and send a 500 internal server error response
    console.error("Payment error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ✅ Handle Payment Status Request for AlfaBank
router.post("/alfabank/status", async (req, res) => {  
  try {
    const { orderId } = req.body;
    console.log("🟢 Received request for payment status with Order ID:", orderId); // ✅ Log received orderId

    if (!orderId) {
      console.log("🚨 Missing order ID in request body.");
      return res.status(400).json({ success: false, message: "Missing order ID" });
    }

    // AlfaBank API request
    const formData = new URLSearchParams();
    formData.append("userName", alfUser);
    formData.append("password", alfPassword);
    formData.append("orderId", orderId);

    console.log("🔵 Sending request to AlfaBank API with:", formData.toString()); // ✅ Log API request data

    const response = await axios.post(
      `${alfApiUrl}/api/rest/getOrderStatus.do`,
      formData.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    console.log("🟢 AlfaBank API Response:", response.data); // ✅ Log full response from AlfaBank

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
    console.log(`🟢 Payment Status: ${paymentStatus}, Amount: ${Amount / 100}`); // ✅ Log parsed payment status & amount

    return res.json({
      success: true,
      paymentStatus,
      amount: Amount / 100,
    });
  } catch (error) {
    console.error("🚨 Error fetching payment status:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment status" });
  }
});

router.post("/updateStatus", async (req, res) => {
  try {
    const { email, paymentId, status, courseId } = req.body;

    console.log(`🔹 Received Request - Email: ${email}, Payment ID: ${paymentId}, Status: ${status}, Course ID: ${courseId}`);

    // ✅ Validate required fields
    if (!email || !paymentId || !status || !courseId) {
      console.log("❌ Missing required fields.");
      return res.status(400).json({ success: false, message: "❌ Missing required fields." });
    }

    // ✅ Step 1: Update User Schema
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(404).json({ success: false, message: "❌ User not found." });
    }

    console.log(`✅ User found: ${user.email}`);

    // 🔥 Find the specific course in the User schema
    const userCourse = user.courses.find(c => c.courseId.toString() === courseId.toString());

    if (!userCourse) {
      console.log(`❌ Course not found in User schema: ${courseId}`);
      return res.status(404).json({ success: false, message: "❌ Course not found for this user." });
    }

    console.log(`✅ Course found in User schema: ${userCourse.courseId}`);

    // 🔥 Find the specific payment by ID in the User schema
    const userPayment = userCourse.payments.find(p => p.paymentId === paymentId);

    if (!userPayment) {
      console.log(`❌ Payment not found in User schema: ${paymentId}`);
      return res.status(404).json({ success: false, message: "❌ Payment not found." });
    }

    console.log(`✅ Payment found in User schema: ${userPayment.paymentId}`);

    // 🔥 Update the payment status in User schema
    userPayment.status = status;

    // ✅ Save updated User schema
    await user.save();
    console.log(`✅ User payment status updated to: ${status}`);


    // ✅ Step 2: Update Course Schema
    const course = await Course.findOne({ _id: courseId });

    if (!course) {
      console.log(`❌ Course not found in Course schema: ${courseId}`);
      return res.status(404).json({ success: false, message: "❌ Course not found." });
    }

    console.log(`✅ Course found in Course schema: ${courseId}`);

    // 🔥 Find the specific payment by ID in the Course schema
    const coursePayment = course.payments.find(p => p.paymentId === paymentId);

    if (!coursePayment) {
      console.log(`❌ Payment not found in Course schema: ${paymentId}`);
      return res.status(404).json({ success: false, message: "❌ Payment not found in Course schema." });
    }

    console.log(`✅ Payment found in Course schema: ${coursePayment.paymentId}`);

    // 🔥 Update the payment status in Course schema
    coursePayment.status = status;

    // ✅ Save updated Course schema
    await course.save();
    console.log(`✅ Course payment status updated to: ${status}`);

    // ✅ Send success response
    res.json({
      success: true,
      message: "✅ Payment status updated successfully in both User and Course schemas.",
      user,
      course
    });

  } catch (error) {
    console.error("🚨 Error updating payment status:", error);
    res.status(500).json({ success: false, message: "❌ Internal server error" });
  }
});







module.exports = router;
