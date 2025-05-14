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
    const now = moment().tz("Europe/Moscow").format("YYYY-MM-DD HH:mm:ss");;

    // Find all active courses
    const activeCourses = await Course.find({ endDate: { $gt: now } });

    for (const course of activeCourses) {

      if (!course.payments || course.payments.length === 0) {
        continue;
      }

      for (const payment of course.payments) {
        // Skip processed payments
        if (payment.status === "Paid" || payment.status === "Expired") {
          continue;
        }

        // Check for expired payments
        const paymentTime = new Date(payment.time);
        const diffInDays = (now - paymentTime) / (1000 * 3600 * 24);

        if (diffInDays > 3) {
          payment.status = "Expired";
          payment.expiredAt = new Date();
          await course.save();
          continue;
        }

        if (payment.status === "Pending") {
          // Only check AlfaBank API for RUB payments with orderId
          if (payment.currency === "RUB" && payment.orderId) {
            try {
             

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


              if (response.data.OrderStatus === 2) {
                // Payment successful
                payment.status = "Paid";
                payment.paidAt = new Date();
              

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
⏱️ <b>Время:</b> ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}
━━━━━━━━━━━━

                  `;

                  await telegram.sendMessage();
                } catch (telegramError) {
                  console.error("Telegram error:", telegramError.message);
                }
              } else {
                console.log(
                  `ℹPayment still pending (Status: ${response.data.OrderStatus})`
                );
              }
            } catch (paymentError) {
              console.error(`AlfaBank API error:`, paymentError.message);
            }
          } else if (!payment.orderId) {
            console.warn(`Skipping - missing orderId`);
          }
        }
      }

      if (course.isModified()) {
        await course.save();
      }
    }

  } catch (err) {
    console.error("🚨 CRITICAL ERROR:", err.message);
  }
};

// Run every 1 minute
//cron.schedule("*/1 * * * *", checkPendingPayments);

cron.schedule("0 12 * * *", checkPendingPayments);
