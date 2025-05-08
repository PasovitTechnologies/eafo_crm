import React, { useState, useEffect, useRef } from "react";
import "./Notification.css";
import axios from "axios";

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [notificationType, setNotificationType] = useState("common");
  const [messageEn, setMessageEn] = useState("");
  const [messageRu, setMessageRu] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [activeSelection, setActiveSelection] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const editorRef = useRef(null);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (notificationType === "user" && users.length === 0) {
      fetchUsers();
    }
  }, [notificationType]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${baseUrl}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const fetchedUsers = Array.isArray(response.data)
        ? response.data
        : response.data.users;

      const cleanedUsers = fetchedUsers
        .filter((u) => u.email) // Ensure email exists
        .map((u, index) => ({ ...u, uid: u.id || u.email || index })); // Create a fallback uid

      const sortedUsers = cleanedUsers.sort((a, b) =>
        a.email.localeCompare(b.email)
      );

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleEditorInput = (e) => {
    const content = editorRef.current?.innerHTML || "";
    setCurrentMessage(content);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      setSelectedText(selection.toString());
      setActiveSelection(selection);
    }
  };

  const addNotification = async () => {
    const token = localStorage.getItem("token");
  
    const message = {
      en: messageEn,
      ru: messageRu || messageEn,
    };
  
    const payload = {
      message,
      type: "info",
      users: notificationType === "user" ? selectedUsers.map((u) => u._id || u.uid) : [],
    };
  
    console.log("Sending notification payload:", payload); // ✅ Log before sending
  
    try {
      const response = await axios.post(
        `${baseUrl}/api/notifications`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      console.log("Notification sent successfully:", response.data);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Failed to send notification:", error.response?.data || error);
    }
  };
  
  
  

  const removeNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const resetForm = () => {
    setMessageEn("");
    setMessageRu("");
    setSelectedUsers([]);
    setNotificationType("common");
    setCurrentLanguage("en");
    setSearchQuery("");
  };

  const handleUserSelect = (user) => {
    if (selectedUsers.some((u) => u.uid === user.uid)) {
      setSelectedUsers(selectedUsers.filter((u) => u.uid !== user.uid));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const applyFormatting = (format) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
  
    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // No text selected
  
    let wrapper;
  
    switch (format) {
      case "bold":
        wrapper = document.createElement("strong");
        break;
      case "italic":
        wrapper = document.createElement("em");
        break;
      case "link":
        const url = prompt("Enter URL:", "https://");
        if (!url) return;
        wrapper = document.createElement("a");
        wrapper.href = url;
        wrapper.target = "_blank";
        break;
      default:
        return;
    }
  
    try {
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
  
      // Optional: Clear selection to improve UX
      selection.removeAllRanges();
    } catch (e) {
      console.error("Formatting error:", e);
    }
  
    handleEditorInput(); // Update state after formatting
  };
  

  const getCurrentMessage = () => {
    return currentLanguage === "en" ? messageEn : messageRu;
  };

  const setCurrentMessage = (value) => {
    if (currentLanguage === "en") {
      setMessageEn(value);
    } else {
      setMessageRu(value);
    }
  };

  return (
    <div className="notification-system">
      <button
        className="add-notification-btn"
        onClick={() => setShowModal(true)}
      >
        Add Notification
      </button>

      <div className="notifications-container">
        {notifications.map((notification) => (
          <div key={notification.id} className="notification">
            <div dangerouslySetInnerHTML={{ __html: notification.message }} />
            <button onClick={() => removeNotification(notification.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="notification-modal">
            <h2>Create New Notification</h2>
            <div className="notification-type-selector">
              <label>
                <input
                  type="radio"
                  value="common"
                  checked={notificationType === "common"}
                  onChange={() => setNotificationType("common")}
                />
                Common Notification
              </label>
              <label>
                <input
                  type="radio"
                  value="user"
                  checked={notificationType === "user"}
                  onChange={() => setNotificationType("user")}
                />
                User Specific Notification
              </label>
            </div>

            {notificationType === "user" && (
              <div className="user-selection">
                <h4>Select Users:</h4>
                {selectedUsers.length > 0 && (
                  <div className="selected-users">
                    {selectedUsers.map((user) => (
                      <span key={user.uid} className="selected-user-tag">
                        {user.email}
                        <button
                          onClick={() => handleUserSelect(user)}
                          className="remove-user-btn"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="dropdown-container">
                  <div
                    className="dropdown-header"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {selectedUsers.length > 0
                      ? `${selectedUsers.length} user(s) selected`
                      : "Select users"}
                    <span
                      className={`dropdown-arrow ${
                        isDropdownOpen ? "open" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </div>

                  {isDropdownOpen && (
                    <div className="users-dropdown">
                      <input
                        type="text"
                        placeholder="Search users by email"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                      {filteredUsers.length === 0 ? (
                        <div>No users found</div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div key={user.uid} className="user-option">
                            <input
                              type="checkbox"
                              id={`user-${user.uid}`}
                              checked={selectedUsers.some(
                                (u) => u.uid === user.uid
                              )}
                              onChange={() => handleUserSelect(user)}
                            />
                            <label htmlFor={`user-${user.uid}`}>
                              {user.email}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="language-tabs">
              <button
                className={currentLanguage === "en" ? "active" : ""}
                onClick={() => setCurrentLanguage("en")}
              >
                English
              </button>
              <button
                className={currentLanguage === "ru" ? "active" : ""}
                onClick={() => setCurrentLanguage("ru")}
              >
                Russian
              </button>
            </div>

            <div className="rich-text-editor">
              <div className="formatting-toolbar">
                <button
                  onClick={() => applyFormatting("bold")}
                  className={isBold ? "active" : ""}
                >
                  <b>B</b>
                </button>
                <button
                  onClick={() => applyFormatting("italic")}
                  className={isItalic ? "active" : ""}
                >
                  <i>I</i>
                </button>
                <button
                  onClick={() => applyFormatting("link")}
                  className={isLink ? "active" : ""}
                >
                  🔗
                </button>
              </div>
              <div
  ref={editorRef}
  className="message-editor"
  contentEditable
  onInput={handleEditorInput}
  onMouseUp={handleTextSelection}
  onKeyUp={handleTextSelection}
/>

            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button
                onClick={addNotification}
                disabled={
                  (notificationType === "common" && !messageEn && !messageRu) ||
                  (notificationType === "user" &&
                    (selectedUsers.length === 0 || !messageEn))
                }
              >
                Add Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
