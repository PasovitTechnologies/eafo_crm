import React, { useState, useEffect } from "react";
import axios from "axios";
import MessagesContainer from "./MessagesContainer";
import { FaTelegramPlane, FaSearch, FaPlus, FaImage, FaVideo, FaFile, FaTimes } from "react-icons/fa";
import defaultUserPfp from "../assets/default-user.jpg";
import defaultGroupPfp from "../assets/default-group.jpg";
import "./Telegram.css";

const Telegram = () => {
  const { VITE_WAPPI_API_TOKEN, VITE_WAPPI_PROFILE_ID, VITE_WAPPI_BASE_URL } = import.meta.env;
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [base64File, setBase64File] = useState("");
  const [fileType, setFileType] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingAttachment, setSendingAttachment] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const baseUrl =import.meta.env.VITE_BASE_URL;

  const fetchChats = async () => {
    console.log("Attempting to fetch chats from:", `${baseUrl}/api/telegram/chats`);
    try {
      const response = await axios.get(`${baseUrl}/api/telegram/chats`);
      const dialogs = response.data.dialogs || [];
      console.log("Chats fetched successfully:", dialogs);
      setChats(dialogs);
      setFilteredChats(dialogs);
      if (selectedChat) {
        await fetchMessages(selectedChat.id);
      }
    } catch (error) {
      console.error("Error fetching chats:", error.message, error.response?.data);
    }
  };

  const fetchMessages = async (chatId) => {
    setLoadingMessages(true);
    setMessages([]); // Clear messages immediately to avoid showing previous chat
    try {
      const response = await axios.get(`${baseUrl}/api/telegram/chat/messages`, {
        params: { chat_id: chatId },
      });
      setMessages([...response.data].sort((a, b) => a.time - b.time));
    } catch (error) {
      console.error("Error fetching messages:", error.message);
      setMessages([]); // Ensure messages stay empty on error
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (message.trim() && selectedChat) {
      setSendingMessage(true);
      try {
        await axios.post(
          `${baseUrl}/api/telegram/send`,
          {
            chat_id: selectedChat.id,
            message: message,
          },
          {
            headers: { Authorization: VITE_WAPPI_API_TOKEN },
          }
        );
        setMessage("");
        await fetchMessages(selectedChat.id);
        await fetchChats(); // Refresh chats after sending
      } catch (error) {
        console.error("Error sending message:", error.message, error.response?.data);
      } finally {
        setSendingMessage(false);
      }
    }
  };

  const handleFileSelect = (type) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "photo" ? "image/*" : type === "video" ? "video/*" : "*/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setSelectedFile(file);
        setFileType(type);
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(",")[1]?.trim() || "";
          setBase64File(base64String);
          setShowPreview(true);
          console.log("Base64 File Data (first 50 chars):", base64String.slice(0, 50) + "...");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const sendDocument = async () => {
    if (!base64File || !selectedFile || !selectedChat) return;

    setSendingAttachment(true);
    const payload = {
      chat_id: selectedChat.id,
      file_name: selectedFile.name,
      b64_file: base64File,
      caption: previewMessage.trim() || "", // Send preview message as caption
    };
    console.log("Sending Payload to backend:", payload);

    try {
      const response = await axios.post(`${baseUrl}/api/telegram/document/send`, payload, {
        headers: {
          Authorization: VITE_WAPPI_API_TOKEN,
          "Content-Type": "application/json",
        },
      });
      console.log("Response from server:", response.data);
      setSelectedFile(null);
      setBase64File("");
      setFileType(null);
      setShowPreview(false);
      setPreviewMessage("");
      await fetchMessages(selectedChat.id);
      await fetchChats(); // Refresh chats after sending
    } catch (error) {
      console.error("Error sending document:", error.message, error.response?.data);
    } finally {
      setSendingAttachment(false);
    }
  };

  // Restore initial fetchChats on mount
  useEffect(() => {
    console.log("useEffect triggered, fetching chats on mount...");
    fetchChats();
  }, []);

  // Keep fetchMessages on selectedChat change to handle switching
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  const handleFilterChange = (e) => {
    const value = e.target.value.replace(/[\\/]/g, "");
    setFilter(value);
    if (value) {
      const filtered = chats.filter((chat) =>
        chat.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setFilter("");
    // fetchMessages(chat.id); // Handled by useEffect now
  };

  const getDefaultPfp = (chat) => {
    return chat.type === "group" ? defaultGroupPfp : defaultUserPfp;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="telegram-container">
      <div className="chat-list-column">
        <h2 className="telegram-header">
          <FaTelegramPlane style={{ marginRight: "10px", verticalAlign: "middle" }} /> Telegram
        </h2>
        <div className="search-bar-container">
          <div className="search-bar-chat">
            <FaSearch />
            <input
              type="text"
              placeholder="Search chats"
              value={filter}
              onChange={handleFilterChange}
            />
          </div>
          {/* Removed refresh button */}
        </div>
        <div className="chats-list">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat?.id === chat.id ? "active" : ""}`}
              onClick={() => handleChatSelect(chat)}
            >
              <div className="chat-item-content">
                <img
                  src={chat.picture || getDefaultPfp(chat)}
                  alt={chat.name}
                  className="chat-thumbnail"
                  onError={(e) => {
                    e.target.src = getDefaultPfp(chat);
                  }}
                />
                <div>
                  <strong>{chat.name}</strong>
                  <p>{chat.last_message_data || "No messages"}</p>
                </div>
              </div>
              {chat.unread_count > 0 && (
                <div className="unread-count">{chat.unread_count}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="chat-window-column">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <img
                src={selectedChat.picture || getDefaultPfp(selectedChat)}
                alt={selectedChat.name}
                className="profile-photo"
                onError={(e) => {
                  e.target.src = getDefaultPfp(selectedChat);
                }}
              />
              <div className="chat-header-info">
                <h3>{selectedChat.name}</h3>
              </div>
            </div>
            <MessagesContainer
              key={selectedChat.id}
              messages={messages}
              selectedChat={selectedChat}
              loading={loadingMessages}
            />
            <div className="message-input-container">
              <button
                className="attach-button"
                onClick={() => setShowAttachmentOptions(!showAttachmentOptions)}
                disabled={sendingAttachment}
              >
                <FaPlus />
              </button>
              {showAttachmentOptions && (
                <div className="attachment-tooltip">
                  <button onClick={() => handleFileSelect("photo")} className="tooltip-option">
                    <FaImage /> Photo
                  </button>
                  <button onClick={() => handleFileSelect("video")} className="tooltip-option">
                    <FaVideo /> Video
                  </button>
                  <button onClick={() => handleFileSelect("file")} className="tooltip-option">
                    <FaFile /> File
                  </button>
                </div>
              )}
              <input
                type="text"
                placeholder="Type a message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendingMessage}
              />
              <button
                className="send-button"
                onClick={sendMessage}
                disabled={sendingMessage || !message.trim()}
              >
                {sendingMessage ? "Sending..." : <FaTelegramPlane />}
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">Select a chat to start messaging</div>
        )}
        {showPreview && selectedFile && (
          <div className="preview-modal">
            <div className="preview-content">
              <button
                className="close-preview"
                onClick={() => {
                  setShowPreview(false);
                  setSelectedFile(null);
                  setBase64File("");
                  setFileType(null);
                  setPreviewMessage("");
                }}
              >
                <FaTimes />
              </button>
              {selectedFile.type.startsWith("image/") && (
                <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="preview-image" />
              )}
              {selectedFile.type.startsWith("video/") && (
                <video controls className="preview-video">
                  <source src={URL.createObjectURL(selectedFile)} type={selectedFile.type} />
                  Your browser does not support the video tag.
                </video>
              )}
              {!selectedFile.type.startsWith("image/") && !selectedFile.type.startsWith("video/") && (
                <div className="preview-file">{selectedFile.name}</div>
              )}
              <input
                type="text"
                placeholder="Add a caption..."
                value={previewMessage}
                onChange={(e) => setPreviewMessage(e.target.value)}
                className="preview-input"
              />
              <button
                className="send-preview-button"
                onClick={sendDocument}
                disabled={sendingAttachment}
              >
                {sendingAttachment ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Telegram;