import React, { useRef, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiArrowDownCircle, FiDownload, FiX } from "react-icons/fi";
import {
  FaFileImage,
  FaFileVideo,
  FaFilePdf,
  FaFileWord,
  FaFile,
  FaDownload,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "../index.css";

const TelegramMessagesContainer = ({ messages = [], selectedChat, loading: initialLoading }) => {
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [mediaUrls, setMediaUrls] = useState({});
  const [loadingMedia, setLoadingMedia] = useState({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [previewMedia, setPreviewMedia] = useState(null);
  const { VITE_WAPPI_BASE_URL, VITE_WAPPI_API_TOKEN, VITE_WAPPI_PROFILE_ID } = import.meta.env;

  const fetchMedia = async (messageId) => {
    try {
      console.log(`Fetching media for message_id: ${messageId}`);
      const response = await axios.get(`${VITE_WAPPI_BASE_URL}/api/telegram/media`, {
        params: { profile_id: VITE_WAPPI_PROFILE_ID, message_id: messageId },
        headers: { Authorization: VITE_WAPPI_API_TOKEN, Accept: "application/json" },
      });
      console.log("Media Response:", response.data);
      if (response.status === 200 && response.data?.status === "success" && response.data?.file_link) {
        return response.data.file_link;
      } else {
        throw new Error("No file_link found in response");
      }
    } catch (error) {
      const errorId = `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.error(`❌ Error fetching media for ${messageId}:`, error.message, error.response?.data);
      toast.error(
        <>
          <strong>Error Loading Media</strong>
          <p>Failed to fetch media for message ID: {messageId}. Details: {error.message}</p>
          <p>Error ID: {errorId} - Please report this with the ID for support.</p>
        </>,
        { position: "top-right", autoClose: 5000 }
      );
      return null;
    }
  };

  const handleMediaLoad = useCallback(async (msg) => {
    if (msg && !mediaUrls[msg.id] && !loadingMedia[msg.id] && (msg.type === "image" || msg.type === "video" || msg.type === "document")) {
      setLoadingMedia((prev) => ({ ...prev, [msg.id]: true }));
      let mediaUrl = msg.s3Info?.url; // Try s3Info.url first
      if (!mediaUrl || mediaUrl === "") {
        mediaUrl = await fetchMedia(msg.id); // Fetch if s3Info.url is missing or empty
      }
      if (mediaUrl) {
        setMediaUrls((prev) => ({ ...prev, [msg.id]: mediaUrl }));
      }
      setLoadingMedia((prev) => ({ ...prev, [msg.id]: false }));
    }
  }, [mediaUrls, loadingMedia]);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      Object.values(mediaUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mediaUrls]);

  useEffect(() => {
    setIsLoading(initialLoading);
    if (!messages || messages.length === 0) return;
    messages.forEach((msg) => {
      if (msg && (msg.type === "image" || msg.type === "video" || msg.type === "document")) {
        handleMediaLoad(msg);
      }
    });
  }, [messages, initialLoading, handleMediaLoad]);

  const getDeliveryStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return "📤";
      case "delivered":
        return "✅";
      case "read":
        return "👁️";
      default:
        return "⏳";
    }
  };

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 300;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
    }
  };

  const getDateLabel = (timestamp) => {
    if (!timestamp) return "Unknown";
    const messageDate = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (messageDate.toDateString() === today.toDateString()) return "Today";
    else if (messageDate.toDateString() === yesterday.toDateString()) return "Yesterday";
    else return messageDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    if (!msg) return acc;
    const dateLabel = getDateLabel(msg.time);
    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(msg);
    return acc;
  }, {});

  const sortedDateLabels = Object.keys(groupedMessages).sort((a, b) => {
    const getDate = (label) => {
      if (label === "Today") return new Date();
      if (label === "Yesterday") return new Date().setDate(new Date().getDate() - 1);
      return new Date(label.split(" ").reverse().join("-"));
    };
    return getDate(a) - getDate(b); // Ascending: older to newer
  });

  const downloadAllAttachments = () => {
    const attachments = messages.filter((msg) => (msg.type === "image" || msg.type === "video" || msg.type === "document") && mediaUrls[msg.id]);
    attachments.forEach((msg) => {
      const link = document.createElement("a");
      link.href = mediaUrls[msg.id];
      link.download = msg.file_name || `attachment_${msg.id}${msg.mimetype ? `.${msg.mimetype.split("/")[1]}` : ""}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    toast.success(`${attachments.length} attachment(s) downloaded!`, { position: "top-right", autoClose: 3000 });
  };

  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith("image/")) return <FaFileImage />;
    if (mimetype.startsWith("video/")) return <FaFileVideo />;
    if (mimetype === "application/pdf") return <FaFilePdf />;
    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimetype === "application/msword") return <FaFileWord />;
    return <FaFile />;
  };

  const LoadingAnimation = () => (
    <div className="loading-animation">
      <div className="spinner">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <p>Loading messages...</p>
    </div>
  );

  const handlePreview = (msgId, url) => {
    setPreviewMedia({ id: msgId, url });
  };

  const handleDownload = (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || `attachment_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
      {isLoading && <LoadingAnimation />}
      {sortedDateLabels.map((dateLabel) => (
        <div key={dateLabel} className="date-group">
          <div className="date-label">{dateLabel}</div>
          {groupedMessages[dateLabel].map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.fromMe ? "sent" : "received"}`}
              style={{ marginBottom: "10px" }}
            >
              {!msg.fromMe && (
                <div className="sender-name">{msg.senderName || msg.contact_name || "Unknown"}</div>
              )}
              {msg && (msg.type === "image" || msg.type === "video" || msg.type === "document") ? (
                <>
                  {!mediaUrls[msg.id] && loadingMedia[msg.id] && (
                    <div className="media-loading">
                      <div className="spinner-small"></div>
                      <span>Loading media...</span>
                    </div>
                  )}
                  {mediaUrls[msg.id] && (
                    <div className="media-wrapper" onClick={() => (msg.mimetype?.startsWith("image/") || msg.mimetype?.startsWith("video/")) && handlePreview(msg.id, mediaUrls[msg.id])}>
                      {msg.mimetype?.startsWith("image/") && (
                        <img
                          src={mediaUrls[msg.id]}
                          alt={msg.file_name || `Image_${msg.id}`}
                          className="media-image"
                          loading="lazy"
                        />
                      )}
                      {msg.mimetype?.startsWith("video/") && (
                        <video
                          controls
                          className="media-video"
                          style={{ maxWidth: "100%", height: "auto" }}
                        >
                          <source src={mediaUrls[msg.id]} type={msg.mimetype} />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {msg.type === "document" && (
                        <div className="media-file-container" onClick={(e) => { e.stopPropagation(); handleDownload(mediaUrls[msg.id], msg.file_name); }}>
                          <div className="file-icon">{getFileIcon(msg.mimetype)}</div>
                          <span className="media-file-link">{msg.file_name || `Unnamed File_${msg.id}`}</span>
                        </div>
                      )}
                      {msg.caption && (
                        <p className="media-caption">{msg.caption}</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                msg.body ? (
                  <p className="message-text">
                    {typeof msg.body === "string" ? (
                      msg.body.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                        /^https?:\/\//.test(part) ? (
                          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="chat-link">
                            {part}
                          </a>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )
                    ) : (
                      <span>Unsupported message type</span>
                    )}
                  </p>
                ) : (
                  <p>No message content</p>
                )
              )}
              <div className="message-meta">
                <span className="chat-timestamp">
                  {msg && new Date(msg.time * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </span>
                <span className="delivery-status">{msg && getDeliveryStatusIcon(msg.delivery_status)}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      {messages.some((msg) => (msg.type === "image" || msg.type === "video" || msg.type === "document") && mediaUrls[msg.id]) && (
        <button className="download-all-button" onClick={downloadAllAttachments}>
          <FaDownload /> Download All Attachments
        </button>
      )}
      {previewMedia && (
        <div className="media-preview-overlay" onClick={() => setPreviewMedia(null)}>
          <div className="media-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewMedia(null)}>
              <FiX />
            </button>
            {previewMedia.url && (
              <>
                {previewMedia.url.includes(".jpg") || previewMedia.url.includes(".jpeg") ? (
                  <img src={previewMedia.url} alt="Preview" className="preview-image" />
                ) : (
                  <video controls className="preview-video">
                    <source src={previewMedia.url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
                <button
                  className="preview-download"
                  onClick={() => handleDownload(previewMedia.url, messages.find(msg => msg.id === previewMedia.id)?.file_name)}
                >
                  <FaDownload /> Download
                </button>
                {messages.find(msg => msg.id === previewMedia.id)?.caption && (
                  <p className="media-caption">{messages.find(msg => msg.id === previewMedia.id).caption}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
      {showScrollButton && (
        <button className="scroll-to-bottom-button" onClick={scrollToBottom}>
          <FiArrowDownCircle size={35} />
        </button>
      )}
    </div>
  );
};

export default TelegramMessagesContainer;