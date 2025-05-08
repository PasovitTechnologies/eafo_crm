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
    setCurrentMessage(e.target.innerHTML);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      setSelectedText(selection.toString());
      setActiveSelection(selection);
    }
  };

  const addNotification = () => {
    if (notificationType === "common") {
      const newNotification = {
        id: Date.now(),
        message: currentLanguage === "en" ? messageEn : messageRu,
        type: "info",
        richText: true,
      };
      setNotifications([...notifications, newNotification]);
    } else if (selectedUsers.length > 0) {
      selectedUsers.forEach((user) => {
        const newNotification = {
          id: Date.now() + Math.random(),
          message: `To ${user.email}: ${messageEn}`,
          type: "user",
          richText: true,
        };
        setNotifications((prev) => [...prev, newNotification]);
      });
    }
    setShowModal(false);
    resetForm();
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
    if (!activeSelection || selectedText.length === 0) return;

    const range = activeSelection.getRangeAt(0);
    const span = document.createElement("span");

    switch (format) {
      case "bold":
        span.style.fontWeight = isBold ? "normal" : "bold";
        setIsBold(!isBold);
        break;
      case "italic":
        span.style.fontStyle = isItalic ? "normal" : "italic";
        setIsItalic(!isItalic);
        break;
      case "link":
        if (isLink) {
          const parent = range.startContainer.parentNode;
          if (parent.tagName === "A") {
            const text = document.createTextNode(parent.innerText);
            parent.parentNode.replaceChild(text, parent);
          }
          setIsLink(false);
          return;
        } else {
          const url = prompt("Enter URL:", "https://");
          if (!url) return;
          setLinkUrl(url);
          const a = document.createElement("a");
          a.href = url;
          a.textContent = selectedText;
          range.deleteContents();
          range.insertNode(a);
          setIsLink(true);
          return;
        }
      default:
        break;
    }

    span.textContent = selectedText;
    range.deleteContents();
    range.insertNode(span);
    activeSelection.removeAllRanges();
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
      <button className="add-notification-btn" onClick={() => setShowModal(true)}>
        Add Notification
      </button>

      <div className="notifications-container">
        {notifications.map((notification) => (
          <div key={notification.id} className="notification">
            <div dangerouslySetInnerHTML={{ __html: notification.message }} />
            <button onClick={() => removeNotification(notification.id)}>×</button>
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
                <div className="dropdown-container">
                  <div
                    className="dropdown-header"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {selectedUsers.length > 0
                      ? `${selectedUsers.length} user(s) selected`
                      : "Select users"}
                    <span className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`}>▼</span>
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
                              checked={selectedUsers.some((u) => u.uid === user.uid)}
                              onChange={() => handleUserSelect(user)}
                            />
                            <label htmlFor={`user-${user.uid}`}>{user.email}</label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

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
                dangerouslySetInnerHTML={{ __html: getCurrentMessage() }}
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
