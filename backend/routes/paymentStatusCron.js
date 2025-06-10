const cron = require("node-cron");
const axios = require("axios");
require("dotenv").config();
const Course = require("../models/Course");
const User = require("../models/User");
const alfUser = process.env.ALFABANK_USER;
const alfPassword = process.env.ALFABANK_PASSWORD;
const alfApiUrl = process.env.ALFABANK_API_URL;
const { TelegramApi } = require("./TelegramApi");
const moment = require("moment-timezone");

const checkPendingPayments = async () => {
  try {
    console.log("\nStarting payment check process...");
    const now = moment().tz("Europe/Moscow");
    const nowFormatted = now.format("YYYY-MM-DD HH:mm:ss");
    console.log(`Current Moscow time: ${nowFormatted}`);

    const activeCourses = await Course.find({ endDate: { $gt: nowFormatted } });
    console.log(`Found ${activeCourses.length} active courses`);

    for (const course of activeCourses) {
      console.log(`\nProcessing course: ${course.name} (ID: ${course._id})`);
      
      if (!course.payments?.length) {
        console.log("ℹ No payments found for this course, skipping...");
        continue;
      }

      console.log(`Found ${course.payments.length} payments to check`);
      
      for (const payment of course.payments) {
        const status = (payment.status || "").toLowerCase();
        console.log(`\n Processing payment ${payment.invoiceNumber} (Status: ${status})`);

        // Skip already processed payments
        if (status === "paid" || status === "expired") {
          console.log("Payment already processed, skipping...");
          continue;
        }

        // Calculate payment age
        const paymentTime = moment(payment.time).tz("Europe/Moscow");
        const diffInDays = now.diff(paymentTime, 'days', true);
        console.log(`Payment is ${diffInDays.toFixed(2)} days old`);

        // Handle expired payments (> 3 days)
        if (diffInDays > 3) {
          console.log("Payment is older than 3 days, marking as expired");
          await markPaymentAsExpired(course, payment);
          continue;
        }

        // Process pending payments
        if (status === "pending") {
          await processPendingPayment(course, payment, now);
        }
      }

      if (course.isModified()) {
        console.log("Saving course updates...");
        await course.save();
      }
    }
    console.log("Payment check process completed");
  } catch (err) {
    console.error("CRITICAL ERROR:", err.message);
    console.error(err.stack);
  }
};

// Helper function to mark payment as expired
const markPaymentAsExpired = async (course, payment) => {
  payment.status = "Expired";
  payment.expiredAt = new Date();

  // Update user record if exists
  const user = await User.findOne({ email: payment.email });
  if (user) {
    console.log(`Found user: ${user.email}`);
    const userCourse = user.courses.find(
      (uc) => String(uc.courseId) === String(course._id)
    );
    
    if (userCourse?.payments) {
      const userPayment = userCourse.payments.find(
        (up) => up.invoiceNumber === payment.invoiceNumber
      );
      if (userPayment) {
        console.log("Updating user payment record to expired");
        userPayment.status = "Expired";
        userPayment.expiredAt = new Date();
        await user.save();
      }
    }
  }
};

// Helper function to process pending payments
const processPendingPayment = async (course, payment, now) => {
  console.log("Checking pending payment status...");
  
  // Skip if not RUB or missing orderId
  if (!payment.paymentId) {
    console.warn("Skipping - missing orderId or non-RUB payment");
    return;
  }

  try {
    console.log(`Calling AlfaBank API for order ${payment.paymentId}`);
    const formData = new URLSearchParams();
    formData.append("userName", alfUser);
    formData.append("password", alfPassword);
    formData.append("orderId", payment.paymentId);

    const response = await axios.post(
      `${alfApiUrl}/api/rest/getOrderStatus.do`,
      formData.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    console.log(`Bank response status: ${response.data.OrderStatus}`);
    
    if (response.data.OrderStatus === 2) {
      console.log("Payment confirmed by bank!");
      await handleSuccessfulPayment(course, payment, now);
    } else {
      console.log(`ℹ Payment still pending (Status: ${response.data.OrderStatus})`);
    }
  } catch (paymentError) {
    console.error("AlfaBank API error:", paymentError.message);
  }
};

// Helper function to handle successful payments
const handleSuccessfulPayment = async (course, payment, now) => {
  payment.status = "Paid";
  payment.paidAt = new Date();

  // Generate AKT number
  let baseAkt = course.currentAktNumber || course.aktNumber;
  if (!baseAkt) {
    console.warn("Missing aktNumber on course, using fallback");
    baseAkt = "EAFO-003/25/000";
  }

  console.log(`Current AKT base: ${baseAkt}`);
  const match = baseAkt.match(/^(.*\/)(\d{3})$/);
  let newAktNumber = baseAkt;

  if (match) {
    const prefix = match[1];
    const number = parseInt(match[2], 10) + 1;
    newAktNumber = `${prefix}${number.toString().padStart(3, "0")}`;
    course.currentAktNumber = newAktNumber;
    payment.aktNumber = newAktNumber;
    console.log(`New AKT number: ${newAktNumber}`);
  } else {
    console.warn("Invalid aktNumber format:", baseAkt);
  }

  // Update user record
  const userEmail = payment.email || "Unknown";
  console.log(`Looking for user with email: ${userEmail}`);
  const user = await User.findOne({ email: userEmail });

  if (user) {
    console.log(`👤 Found user: ${user.email}`);
    const userCourse = user.courses.find(
      (uc) => String(uc.courseId) === String(course._id)
    );
    
    if (userCourse?.payments) {
      const userPayment = userCourse.payments.find(
        (up) => up.invoiceNumber === payment.invoiceNumber
      );
      if (userPayment) {
        console.log("Updating user payment record to paid");
        userPayment.status = "Paid";
        userPayment.paidAt = new Date();
        userPayment.aktNumber = newAktNumber;
        await user.save();
      }
    }
  }

  // Send Telegram notification
  await sendTelegramNotification(payment, user);
};

// Helper function to send Telegram notifications
const sendTelegramNotification = async (payment, user) => {
  try {
    console.log("Sending Telegram notification...");
    const telegram = new TelegramApi();
    telegram.chat_id = "-4614501397";

    let fullName = "Unknown User";
    if (user) {
      fullName = `${user.personalDetails?.firstName || ""} ${
        user.personalDetails?.lastName || ""
      }`.trim();
    }

    telegram.text = `
    📢 <b>НОВЫЙ ПЛАТЁЖ</b>
    ━━━━━━━━━━━━
    👤 <b>Имя:</b> ${fullName}
    📧 <b>Email:</b> ${payment.email || "N/A"}
    📄 <b>Счет:</b> ${payment.invoiceNumber || "N/A"}
    💳 <b>Сумма:</b> ${payment.totalAmount || "N/A"} ${payment.currency || ""}
    🏷️ <b>Тарифы:</b> ${Array.isArray(payment.packages) ? payment.packages.map(p => p.name).join(", ") : "N/A"}
    ⏱️ <b>Время:</b> ${new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
    })}
    ━━━━━━━━━━━━
    `;
    

    await telegram.sendMessage();
    console.log("Telegram notification sent");
  } catch (telegramError) {
    console.error("Telegram error:", telegramError.message);
  }
};

// Run every 1 minute
cron.schedule("*/1 * * * *", () => {
  console.log("\nCron job triggered at", new Date().toISOString());
  checkPendingPayments();
});

console.log("Payment checker service initialized");