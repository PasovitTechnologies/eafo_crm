const cron = require("node-cron");
const axios = require("axios");
require("dotenv").config();
const Course = require("../models/Course");
const User = require("../models/User");
const alfUser = process.env.ALFABANK_USER;
const alfPassword = process.env.ALFABANK_PASSWORD;
const alfApiUrl = process.env.ALFABANK_API_URL;
const { TelegramApi } = require("./TelegramApi");

console.log("✅ Payment Status Cron Initialized!");

// Debug logging (remove in production)
console.log("🚨 Debugging API keys:");
console.log(`ALFABANK_USER: ${alfUser}`);
console.log(`ALFABANK_API_URL: ${alfApiUrl}`);

const checkPendingPayments = async () => {
  try {
    console.log("🕒 Running payment status checker...");
    const now = new Date();
    console.log("📅 Current date:", now);

    // Find all active courses
    const activeCourses = await Course.find({ endDate: { $gt: now } });
    console.log(`📚 Found ${activeCourses.length} active courses to check`);

    for (const course of activeCourses) {
      console.log(`🔍 Checking payments for course: ${course._id}`);

      if (!course.payments || course.payments.length === 0) {
        console.log("⚠️ No payments found for this course.");
        continue;
      }

      for (const payment of course.payments) {
        // Skip processed payments
        if (payment.status === "Paid" || payment.status === "Expired") {
          console.log(
            `🟢 Payment ${payment._id} already processed with status: ${payment.status}`
          );
          continue;
        }

        // Check for expired payments
        const paymentTime = new Date(payment.time);
        const diffInDays = (now - paymentTime) / (1000 * 3600 * 24);

        if (diffInDays > 3) {
          payment.status = "Expired";
          payment.expiredAt = new Date();
          console.log(`⏳ Payment for order ${payment.orderId} expired.`);
          await course.save();
          continue;
        }

        if (payment.status === "Pending") {
          console.log(
            `🔎 Found pending payment _id: ${payment._id}, orderId: ${
              payment.orderId || "MISSING"
            }`
          );

          // Only check AlfaBank API for RUB payments with orderId
          if (payment.currency === "RUB" && payment.orderId) {
            try {
              console.log(
                `📝 Checking AlfaBank status for order: ${payment.orderId}`
              );

              const formData = new URLSearchParams();
              formData.append("userName", alfUser);
              formData.append("password", alfPassword);
              formData.append("orderId", payment.orderId);

              const response = await axios.post(
                `${alfApiUrl}/api/rest/getOrderStatus.do`,
                formData.toString(),
                {
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                }
              );

              console.log("🔍 AlfaBank Response:", response.data);

              if (response.data.OrderStatus === 2) {
                // Payment successful
                payment.status = "Paid";
                payment.paidAt = new Date();
                console.log(
                  `✅ Payment for order ${payment.orderId} marked as PAID.`
                );

                // Send Telegram notification
                try {
                  const telegram = new TelegramApi();
                  telegram.chat_id = "-4614501397"; // Your group chat ID

                  const userEmail = payment.email || "Unknown";
                  const user = await User.findOne({ email: userEmail });

                  let fullName = user
                    ? `${user.personalDetails?.firstName || ""} ${
                        user.personalDetails?.lastName || ""
                      }`.trim()
                    : "Unknown User";

                  telegram.text = `
📢 <b>НОВЫЙ ПЛАТЁЖ</b>
━━━━━━━━━━━━
👤 <b>Имя:</b> ${fullName}
📧 <b>Email:</b> ${userEmail}
📄 <b>Инвойс:</b> ${payment.invoiceNumber || "N/A"}
💳 <b>Сумма:</b> ${payment.amount} ${payment.currency}
🏷️ <b>Тариф:</b> ${payment.package || "N/A"}
⏱️ <b>Время:</b> ${new Date().toLocaleString("ru-RU")}
━━━━━━━━━━━━
#payment #${payment.currency}
                  `;

                  await telegram.sendMessage();
                  console.log("✅ Telegram notification sent!");
                } catch (telegramError) {
                  console.error("🚨 Telegram error:", telegramError.message);
                }
              } else {
                console.log(
                  `ℹ️ Payment still pending (Status: ${response.data.OrderStatus})`
                );
              }
            } catch (paymentError) {
              console.error(`🚨 AlfaBank API error:`, paymentError.message);
            }
          } else if (!payment.orderId) {
            console.warn(`⚠️ Skipping - missing orderId`);
          }
        }
      }

      if (course.isModified()) {
        await course.save();
        console.log(`💾 Saved updates for course ${course._id}`);
      }
    }

    console.log("✅ Payment check completed");
  } catch (err) {
    console.error("🚨 CRITICAL ERROR:", err.message);
  }
};

// Run every 1 minute
//cron.schedule("*/1 * * * *", checkPendingPayments);

cron.schedule("0 12 * * *", checkPendingPayments);
