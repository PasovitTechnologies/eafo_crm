const express = require("express");
const axios = require("axios");

const router = express.Router();

// Load environment variables
const WAPPI_BASE_URL = "https://wappi.pro";
const API_TOKEN = process.env.WAPPI_API_TOKEN;
const PROFILE_ID = process.env.WAPPI_PROFILE_ID;

// 🟢 Fetch All WhatsApp Chats (No Limits)
router.get("/chats", async (req, res) => {
  try {
    console.log("📩 Fetching all WhatsApp chats...");

    if (!API_TOKEN || !PROFILE_ID) {
      console.error("❌ Missing API token or profile ID");
      return res.status(500).json({ error: "Missing API credentials" });
    }

    const response = await axios.get(`${WAPPI_BASE_URL}/api/sync/chats/get`, {
      headers: { Authorization: API_TOKEN },
      params: { profile_id: PROFILE_ID, show_all: true },
    });

    if (response.status !== 200) {
      console.error("❌ Failed to fetch chats:", response.data);
      return res.status(response.status).json(response.data);
    }

    console.log("✅ Chats fetched:", response.data);
    res.json(response.data);

  } catch (error) {
    console.error("❌ Error fetching chats:", error.message);
    
    if (error.response) {
      console.warn("⚠️ API Response:", error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});


// 🟢 Fetch WhatsApp Chats with Optional Filter
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

// 🟢 Send WhatsApp Message
router.post("/send", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "'to' and 'message' are required" });
  }

  try {
    const response = await axios.post(
      `${WAPPI_BASE_URL}/api/async/message/send`,
      {
        body: message,
        recipient: to,
      },
      {
        headers: { Authorization: API_TOKEN },
        params: { profile_id: PROFILE_ID },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error sending message:", error.message);
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: "Server error" });
  }
});

// 🟢 Fetch All Messages of a Chat
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

// 🟢 Fetch Media Data by Media ID
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

  console.log("🟡 Initial Payload Received:", req.body);

  // ✅ Validate Input
  if (!to || !file_name || !file_data || !file_type) {
    console.error("❌ Validation Failed: Missing required fields");
    return res.status(400).json({
      error: "'to', 'file_name', 'file_data', and 'file_type' are required",
    });
  }

  // ✅ Format the Recipient Phone Number
  const formattedRecipient = to.replace("@c.us", "");
  console.log("📨 Formatted 'to' Field:", formattedRecipient);

  // ✅ Prepare Payload
  let apiUrl;
  const payload = {
    recipient: formattedRecipient,
    file_name: file_name,
    b64_file: file_data,
  };

  console.log(
    "📄 Base64 File Size (KB):",
    (Buffer.byteLength(payload.b64_file, "base64") / 1024).toFixed(2)
  );

  // ✅ Determine the Correct API Endpoint
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
      console.error("❌ Unsupported File Type:", file_type);
      return res.status(400).json({ error: "Unsupported file type" });
  }

  console.log(`📦 Sending ${file_type.toUpperCase()} to Wappi API:`, payload);

  try {
    // ✅ Send POST Request to Wappi API
    const response = await axios.post(apiUrl, payload, {
      headers: { Authorization: API_TOKEN },
      params: { profile_id: PROFILE_ID },
    });

    console.log("✅ File Sent Successfully:", response.data);
    return res.json(response.data);
  } catch (error) {
    console.error("❌ Error Sending File:", error.message);

    if (error.response) {
      console.warn("⚠️ Response Data:", error.response.data);
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      console.warn("⚠️ No Response Received:", error.request);
      return res
        .status(502)
        .json({ error: "Bad Gateway: No response from Wappi API" });
    } else {
      console.warn("⚠️ Request Setup Error:", error.message);
      return res
        .status(500)
        .json({ error: "Server error: Request setup failed" });
    }
  }
});

module.exports = router;