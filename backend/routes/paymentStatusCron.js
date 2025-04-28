const cron = require('node-cron');
const axios = require('axios');
require("dotenv").config();
const Course = require('../models/Course'); // Adjust path to your Course model
const User = require("../models/User"); // Import the User schema
const alfUser = process.env.ALFABANK_USER;
const alfPassword = process.env.ALFABANK_PASSWORD;
const alfApiUrl = process.env.ALFABANK_API_URL;
const {TelegramApi} = require('./TelegramApi');

console.log('✅ Payment Status Cron Initialized!');

// Log API Keys for Debugging (but avoid logging full sensitive keys)
console.log("🚨 Debugging API keys (DO NOT log in production):");
console.log(`ALFABANK_USER: ${alfUser}`);
console.log(`ALFABANK_API_URL: ${alfApiUrl}`);
console.log(`STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '******' : 'Not Provided'}`);
console.log(`RUSENDER_API_KEY: ${process.env.RUSENDER_API_KEY ? '******' : 'Not Provided'}`);

// Function to check and update payments
const checkPendingPayments = async () => {
  try {
    console.log('🕒 Running payment status checker...');

    const now = new Date();

    console.log('📅 Current date:', now);

    // 1. Find all courses that are still active (endDate > yesterday)
    const activeCourses = await Course.find({ endDate: { $gt: now } });
    
    console.log(`📚 Found ${activeCourses.length} active courses to check`);

    for (const course of activeCourses) {
      console.log(`🔍 Checking payments for course: ${course._id}`);

      if (!course.payments || course.payments.length === 0) {
        console.log('⚠️ No payments found for this course.');
        continue;
      }

      for (const payment of course.payments) {
        // Skip processed payments or expired ones
        if (payment.status === 'Paid' || payment.status === 'Expired') {
          console.log(`🟢 Payment ${payment._id} already processed with status: ${payment.status}`);
          continue;
        }

        // Check if the payment has expired (older than 3 days based on payment.time)
        const paymentTime = new Date(payment.time); // Use payment.time instead of createdAt
        const diffInDays = (now - paymentTime) / (1000 * 3600 * 24); // Calculate days difference

        if (diffInDays > 3) {
          payment.status = 'Expired';
          payment.expiredAt = new Date();
          console.log(`⏳ Payment for order ${payment.paymentId} is more than 3 days old and marked as EXPIRY.`);
          await course.save(); // Save the course with updated status
          continue; // Skip this payment further processing
        }

        if (payment.status === 'Pending') {
          console.log(`🔎 Found pending payment _id: ${payment._id}, orderId: ${payment.paymentId || 'MISSING'}`);

          // Only check AlfaBank API for payments with currency 'RUP'
          if (payment.currency === 'RUP' && payment.paymentId) {
            try {
              console.log(`📝 Sending request to AlfaBank API to check status for payment ID: ${payment.paymentId}`);

              const formData = new URLSearchParams();
              formData.append('userName', alfUser);
              formData.append('password', alfPassword);
              formData.append('orderId', payment.paymentId);

              const response = await axios.post(
                `${alfApiUrl}/api/rest/getOrderStatus.do`,
                formData.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
              );

              console.log('🔍 AlfaBank API Response:', response.data);

              const { OrderStatus } = response.data;

              if (OrderStatus === 2) { // 2 means Payment successful
                payment.status = 'Paid';
                payment.paidAt = new Date();
                console.log(`✅ Payment for order ${payment.paymentId} marked as PAID.`);
              
                // 🚀 Now, send Telegram notification
                try {
                  const telegram = new TelegramApi();
                  telegram.chat_id = '-4740453782'; // Your group chat ID
              
                  // Find user email from payment
                  const userEmail = payment.email || "Unknown";
              
                  // Try finding the user to get name details
                  const user = await User.findOne({ email: userEmail });
              
                  let fullName = user 
                    ? `${user.personalDetails?.firstName || ""} ${user.personalDetails?.lastName || ""}`.trim()
                    : "Unknown User";
              
                                
                  telegram.text = `
                    📢 <b>New Payment Received</b>
                    👤 <b>Name:</b> ${fullName}
                    📧 <b>Email:</b> ${userEmail}
                    💳 <b>Amount:</b> ${payment.amount} ${payment.currency}
                    🕒 <b>Paid At:</b> ${new Date().toLocaleString()}
                  `;
              
                  await telegram.sendMessage();
                  console.log("✅ Payment notification sent to Telegram group!");
                } catch (telegramError) {
                  console.error("🚨 Error sending Telegram payment notification:", telegramError.message);
                }
              }
               else {
                console.log(`ℹ️ Payment for order ${payment.paymentId} still pending or another status (StatusCode: ${OrderStatus}).`);
              }
            } catch (paymentError) {
              console.error(`🚨 Error checking payment for order ${payment.paymentId}:`, paymentError.message);
            }
          } else if (!payment.paymentId) {
            console.warn(`⚠️ Skipping payment ${payment._id} because orderId is missing!`);
          }
        }
      }

      // Save course if any payment updated
      if (course.isModified()) {
        console.log(`💾 Saving updated course ${course._id} after payment status changes.`);
        await course.save();
      } else {
        console.log(`🟡 No changes made to course ${course._id}.`);
      }
    }

    console.log('✅ Finished checking payments!');
  } catch (err) {
    console.error('🚨 Error in payment status cron job:', err.message);
  }
};

// Schedule the task to run every 1 minute
cron.schedule('*/5 * * * *', checkPendingPayments);
