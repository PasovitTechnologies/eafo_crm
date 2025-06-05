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
    const now = moment().tz("Europe/Moscow").format("YYYY-MM-DD HH:mm:ss");

    const activeCourses = await Course.find({ endDate: { $gt: now } });

    for (const course of activeCourses) {
      if (!course.payments || course.payments.length === 0) {
        continue;
      }

      for (const payment of course.payments) {
        const status = (payment.status || "").toLowerCase();
        if (status === "paid" || status === "expired") {
          continue;
        }

        const paymentTime = new Date(payment.time);
        const diffInDays = (new Date(now) - paymentTime) / (1000 * 3600 * 24);

        if (diffInDays > 3) {
          payment.status = "Expired";
          payment.expiredAt = new Date();
          await course.save();

          // Update user schema
          const user = await User.findOne({ email: payment.email });
          if (user) {
            const userCourse = user.courses.find(
              (uc) => String(uc.courseId) === String(course._id)
            );
            if (userCourse && Array.isArray(userCourse.payments)) {
              const userPayment = userCourse.payments.find(
                (up) => up.invoiceNumber === payment.invoiceNumber
              );
              if (userPayment) {
                userPayment.status = "Expired";
                userPayment.expiredAt = new Date();
                await user.save();
              }
            }
          }

          continue;
        }

        if (status === "pending") {
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
                payment.status = "Paid";
                payment.paidAt = new Date();

                // Update user schema
                const userEmail = payment.email || "Unknown";
                const user = await User.findOne({ email: userEmail });

                if (user) {
                  const userCourse = user.courses.find(
                    (uc) => String(uc.courseId) === String(course._id)
                  );
                  if (userCourse && Array.isArray(userCourse.payments)) {
                    const userPayment = userCourse.payments.find(
                      (up) => up.invoiceNumber === payment.invoiceNumber
                    );
                    if (userPayment) {
                      userPayment.status = "Paid";
                      userPayment.paidAt = new Date();
                      await user.save();
                    }
                  }
                }

                try {
                  const telegram = new TelegramApi();
                  telegram.chat_id = "-4614501397"; // Telegram group/chat ID

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
📧 <b>Email:</b> ${userEmail}
📄 <b>Счет:</b> ${payment.invoiceNumber || "N/A"}
💳 <b>Сумма:</b> ${payment.amount} ${payment.currency}
🏷️ <b>Тариф:</b> ${payment.package || "N/A"}
⏱️ <b>Время:</b> ${new Date().toLocaleString("ru-RU", {
                    timeZone: "Europe/Moscow",
                  })}
━━━━━━━━━━━━
                  `;

                  await telegram.sendMessage();
                } catch (telegramError) {
                  console.error("Telegram error:", telegramError.message);
                }
              } else {
                console.log(
                  `ℹ Payment still pending (Status: ${response.data.OrderStatus})`
                );
              }
            } catch (paymentError) {
              console.error("AlfaBank API error:", paymentError.message);
            }
          } else if (!payment.orderId) {
            console.warn("Skipping - missing orderId");
          }
        }
      }

      if (course.isModified()) {
        await course.save();
      }
    }
  } catch (err) {
    console.error("CRITICAL ERROR:", err.message);
  }
};

// Run every 1 minute
cron.schedule("*/1 * * * *", checkPendingPayments);
