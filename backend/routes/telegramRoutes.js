const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
require("dotenv").config();

const router = express.Router();

// Telegram API credentials
const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);  // Convert apiId to number
const apiHash = process.env.TELEGRAM_API_HASH;

if (!apiId || !apiHash) {
  console.error("❌ ERROR: Missing API ID or API Hash. Check your .env file!");
  process.exit(1);
}

// Route to request OTP
router.post("/request-otp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Debugging: Log phone number received in the body
    console.log("Received phoneNumber:", phoneNumber);

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Ensure the phone number starts with +91 (Indian country code)
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith("+91")) {
      formattedPhone = "+91" + formattedPhone;
    }

    // Create a new Telegram client
    const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
      connectionRetries: 5,
    });

    // Connect to Telegram
    await client.connect();

    // Send the OTP to the phone number
    const result = await client.sendCode({ phone: formattedPhone });

    res.json({ phoneCodeHash: result.phoneCodeHash });
  } catch (error) {
    console.error("❌ Error in request-otp:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Route to verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, phoneCode, phoneCodeHash } = req.body;

    if (!phoneNumber || !phoneCode || !phoneCodeHash) {
      return res.status(400).json({ error: "Phone number, OTP, and code hash are required" });
    }

    // Create a new Telegram client
    const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
      connectionRetries: 5,
    });

    // Connect to Telegram
    await client.connect();

    // Try to sign in with the phone code
    const result = await client.signIn({
      phoneNumber: phoneNumber,
      phoneCode: phoneCode,
      phoneCodeHash: phoneCodeHash,
    });

    res.json(result); // Return the result of the login attempt
  } catch (error) {
    console.error("❌ Error in verify-otp:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

module.exports = router;
