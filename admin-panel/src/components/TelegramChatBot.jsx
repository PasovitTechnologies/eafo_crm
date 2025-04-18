import React, { useState, useEffect } from "react";
import axios from "axios";
import { FiSend, FiX } from "react-icons/fi";
import { FaTelegramPlane } from "react-icons/fa"; // Telegram icon
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./TelegramChatBot.css"; // Updated CSS file
import TelegramMessagesContainer from "./TelegramMessagesContainer"; // Reuse existing component

const TelegramChatBot = ({ isOpen, onClose, phoneNumber }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { VITE_WAPPI_BASE_URL, VITE_WAPPI_API_TOKEN } = import.meta.env;

  // ✅ Fetch messages when the component opens
  useEffect(() => {
    if (isOpen && phoneNumber) {
      fetchMessages();
    }
  }, [isOpen, phoneNumber]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${VITE_WAPPI_BASE_URL}/api/telegram/chat/messages`, {
        params: { chat_id: phoneNumber },
        headers: { Authorization: VITE_WAPPI_API_TOKEN },
      });
  
      const fetchedMessages = Array.isArray(response.data.messages)
        ? response.data.messages.reverse()
        : [];
  
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error.response?.data || error.message);
      toast.error("❌ Failed to load messages!");
    } finally {
      setLoading(false);
    }
  };
  

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      await axios.post(
        `${VITE_WAPPI_BASE_URL}/api/telegram/send`,
        {
          chat_id: phoneNumber,
          message,
        },
        {
          headers: { Authorization: VITE_WAPPI_API_TOKEN },
        }
      );

      setMessages((prev) => [
        ...prev,
        { body: message, fromMe: true, type: "chat", time: Math.floor(Date.now() / 1000) },
      ]);

      toast.success("✅ Message sent successfully!");
      setMessage("");
      fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error.message);
      toast.error("❌ Failed to send message!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="telegram-chatbot">
       <AnimatePresence>
      {isOpen && (
        <motion.div
          className="chatbot-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* ✅ Toast Notifications */}
          <ToastContainer position="top-right" autoClose={3000} />

          {/* ✅ Fixed Header */}
          <motion.div
            className="chatbot-header"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span>Chat with {phoneNumber}</span>
            {/* ✅ Close Icon */}
            <FiX className="chat-close-icon" onClick={onClose} />
          </motion.div>

          {/* ✅ Messages Container */}
          <div className="chatbot-messages-container">
            <TelegramMessagesContainer messages={messages} loading={loading} />
          </div>

          {/* ✅ Fixed Footer */}
          <div className="chatbot-footer">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>
              <FaTelegramPlane /> {/* Telegram icon */}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
   
  );
};

export default TelegramChatBot;