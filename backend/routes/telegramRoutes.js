require("dotenv").config();

const express = require("express");
const axios = require("axios");
const router = express.Router();

// Hardcode the Wappi API base URL
const WAPPI_BASE_URL = "https://wappi.pro";
const API_TOKEN = process.env.VITE_WAPPI_API_TOKEN || "f25d8ff6573b44915f8b1b5410dd508b252addbf";
const PROFILE_ID = process.env.VITE_WAPPI_PROFILE_ID || "82e121fb-e779";

// Middleware to validate API token and profile ID
const validateCredentials = (req, res, next) => {
  if (!API_TOKEN || !PROFILE_ID) {
    return res.status(500).json({ error: "API token or profile ID not configured" });
  }
  req.apiToken = API_TOKEN;
  req.profileId = PROFILE_ID;
  next();
};

// Fetch All Telegram Chats (GET /tapi/sync/chats/get)
router.get("/chats", validateCredentials, async (req, res) => {
  try {
    const response = await axios.get(`${WAPPI_BASE_URL}/tapi/sync/chats/get`, {
      headers: { Authorization: req.apiToken },
      params: { profile_id: req.profileId },
    });
    console.log("✅ Response from Wappi:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching chats:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Server error" });
  }
});

// Filter Telegram Chats (GET /tapi/sync/chats/filter)
router.get("/chats/filter", validateCredentials, async (req, res) => {
  const { client_name } = req.query;
  try {

    const response = await axios.get(`${WAPPI_BASE_URL}/tapi/sync/chats/filter`, {
      headers: { Authorization: req.apiToken },
      params: { profile_id: req.profileId, client_name: client_name || "" },

    });
    res.json(response.data);
  } catch (error) {
    console.error("Error filtering chats:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Server error" });
  }
});

// Send Text Message (POST /tapi/sync/message/send)
router.post("/send", validateCredentials, async (req, res) => {
  const { chat_id, message } = req.body;
  if (!chat_id || !message) {
    return res.status(400).json({ error: "'chat_id' and 'message' are required" });
  }
  try {
    const response = await axios.post(
      `${WAPPI_BASE_URL}/tapi/sync/message/send`,
      { body: message, recipient: chat_id }, // Maps chat_id to recipient
      {
        headers: { Authorization: req.apiToken },
        params: { profile_id: req.profileId },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error sending message:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Server error" });
  }
});

// Fetch All Messages of a Chat (GET /tapi/sync/messages/get)
router.get("/chat/messages", validateCredentials, async (req, res) => {
  const { chat_id } = req.query;
  if (!chat_id) {
    return res.status(400).json({ error: "chat_id is required" });
  }
  try {
    const response = await axios.get(`${WAPPI_BASE_URL}/tapi/sync/messages/get`, {
      headers: { Authorization: req.apiToken },
      params: { profile_id: req.profileId, chat_id },
    });

    const messages = response.data.messages || [];
    const uniqueMessages = Array.from(new Map(messages.map((msg) => [msg.id, msg])).values());
    res.json(uniqueMessages);
  } catch (error) {
    console.error("Error fetching messages:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(error.response?.status || 500).json({
      error: "Server error while fetching messages",
      details: error.response?.data || error.message,
    });
  }
});

// Fetch Media Data by Message ID (GET /tapi/sync/message/media/download)
router.get("/media", validateCredentials, async (req, res) => {
  const { message_id } = req.query;
  if (!message_id) {
    return res.status(400).json({ error: "message_id is required" });
  }
  try {

    const response = await axios.get(`${WAPPI_BASE_URL}/tapi/sync/message/media/download`, {
      headers: { Authorization: req.apiToken, Accept: "application/json" },
      params: { profile_id: req.profileId, message_id },
    
    });
    if (response.status !== 200 || !response.data.file_link) {
      return res.status(404).json({ error: "Media not found or no download link provided" });
    }
    const { file_link, file_name, mimetype } = response.data;
    res.json({ status: "success", file_name, mime_type: mimetype, file_link });
  } catch (error) {
    console.error("Error fetching media data:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(error.response?.status || 500).json({
      error: "Server error while fetching media data",
      details: error.response?.data || error.message,
    });
  }
});

// Send Telegram Document/Image/Video (POST /tapi/async/message/<type>/send)
router.post("/document/send", validateCredentials, async (req, res) => {
  const { chat_id, file_name, b64_file, caption } = req.body;


  if (!chat_id || !file_name || !b64_file) {
    console.error("Validation Failed: Missing required fields");
    return res.status(400).json({
      error: "'chat_id', 'file_name', and 'b64_file' are required",
    });
  }


  let apiUrl;
  // Determine file type based on base64 data (simplified detection)
  const fileType = b64_file.startsWith("/9j/") ? "img" : b64_file.startsWith("iVBOR") ? "img" : "document";
  switch (fileType) {
    case "img":
      apiUrl = `${WAPPI_BASE_URL}/tapi/async/message/img/send`;
      break;
    case "video":
      apiUrl = `${WAPPI_BASE_URL}/tapi/async/message/video/send`;
      break;
    case "document":
    default:
      apiUrl = `${WAPPI_BASE_URL}/tapi/async/message/document/send`;
      break;
  }

  const payload = {
    recipient: chat_id, // Map chat_id to recipient as per API example
    file_name: file_name,
    b64_file: b64_file,
    caption: caption || "", // Optional caption
    timeout_from: 1, // Default delay range (optional)
    timeout_to: 3,
  };

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: { Authorization: req.apiToken },
      params: { profile_id: req.profileId },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error Sending File to Wappi:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Server error while sending file" });
  }
});

module.exports = router;