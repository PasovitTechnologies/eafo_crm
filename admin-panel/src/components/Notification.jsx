import React, { useState, useEffect, useRef } from "react";
import "./Notification.css";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
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
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [selectedOldUsers, setSelectedOldUsers] = useState([]);

  const editorRef = useRef(null);
  const baseUrl = import.meta.env.VITE_BASE_URL;
   


  useEffect(() => {
    // Fetch notifications when component mounts
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${baseUrl}/api/notifications/get`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(response.data.notifications); // Assuming the response contains an array of notifications
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications.");
      setIsLoading(false);
    }
  };

  // Function to safely render HTML content from messages
  const renderHtmlContent = (htmlString) => {
    return <span dangerouslySetInnerHTML={{ __html: htmlString }} />;
  };


  // Enhanced user filtering logic
  const filteredUsers = users
    .filter((user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((user) => {
      if (userFilter === "old") return user.isOld;
      if (userFilter === "paid") return user.hasPaid;
      return true;
    })
    .sort((a, b) => {
      // Sort selected users to the top
      const aSelected = selectedUsers.some((u) => u.uid === a.uid);
      const bSelected = selectedUsers.some((u) => u.uid === b.uid);
      return bSelected - aSelected || a.email.localeCompare(b.email);
    });


    

  useEffect(() => {
    if (notificationType === "user") {
      fetchUsers();
    }
  }, [notificationType, userFilter]);

  useEffect(() => {
    setSelectedUsers([]);
    setSelectedOldUsers([]);
  }, [filterType]);
  
  useEffect(() => {
    setSelectedUsers([]);
    setSelectedOldUsers([]);
  }, [notificationType]);

  useEffect(() => {
    // Update the editor's content when switching language
    if (editorRef.current) {
      editorRef.current.innerHTML = currentLanguage === "en" ? messageEn : messageRu;
    }
  }, [currentLanguage]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${baseUrl}/api/user/filtered`,
        { filter: userFilter },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const cleanedUsers = response.data.users.map((user) => ({
        ...user,
        uid: user._id.toString(),
        email: user.email.toLowerCase(),
        // Ensure these flags are properly set from backend
        isOld: user.isOld || false,
        hasPaid: user.hasPaid || false,
      }));

      setUsers(cleanedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditorInput = () => {
    const content = editorRef.current?.innerHTML || "";
    if (currentLanguage === "en") {
      setMessageEn(content);
    } else {
      setMessageRu(content);
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
      users:
        notificationType === "user"
          ? selectedUsers.map((u) => u._id || u.uid)
          : [],
      isHtml: true,
    };
  
    try {
      await axios.post(`${baseUrl}/api/notifications`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      toast.success("Notification sent successfully!"); // ✅ Success toast
  
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Failed to send notification:", error.response?.data || error);
  
      toast.error(
        error.response?.data?.message || "Failed to send notification." // ✅ Error toast
      );
    }
  };
  

  const resetForm = () => {
    setMessageEn("");
    setMessageRu("");
    setSelectedUsers([]);
    setNotificationType("common");
    setCurrentLanguage("en");
    setSearchQuery("");
    setUserFilter("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.uid === user.uid)
        ? prev.filter((u) => u.uid !== user.uid)
        : [...prev, user]
    );
  };

  const applyFormatting = (format) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    let formattedContent = range.extractContents();

    switch (format) {
      case "bold":
        setIsBold(!isBold);
        const strong = document.createElement("strong");
        strong.appendChild(formattedContent);
        range.insertNode(strong);
        break;
      case "italic":
        setIsItalic(!isItalic);
        const em = document.createElement("em");
        em.appendChild(formattedContent);
        range.insertNode(em);
        break;
      case "link":
        const url = prompt("Enter URL:", "https://");
        if (!url) return;
        setIsLink(true);
        setLinkUrl(url);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.appendChild(formattedContent);
        range.insertNode(a);
        break;
      default:
        range.insertNode(formattedContent);
        return;
    }

    selection.removeAllRanges();
    handleEditorInput();
  };

  return (
    <div className="notification-system">
      <ToastContainer position="top-right" autoClose={3000}/>
      <button
        className="add-notification-btn"
        onClick={() => setShowModal(true)}
      >
        Add Notification
      </button>

      <div className="notifications-container">
      {notifications.map((notification) => (
        <div key={notification._id} className="notification-card">
          <div className="notification-header">
            <span className="notification-type">{notification.type}</span>
            <span className="notification-date">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="notification-body">
            {notification.message.en && (
              <div className="notification-section">
                <p className="notification-label">English: <span>
                {renderHtmlContent(notification.message.en)}</span></p>
              </div>
            )}
            {notification.message.ru && (
              <div className="notification-section">
                <p className="notification-label">Russian: <span>
                {renderHtmlContent(notification.message.ru)}</span></p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
      

      {showModal && (
  <div className="modal-overlay">
    <div className="notification-modal">
      <div className="modal-header">
        <h2>Create New Notification</h2>
        <button 
          className="notification-close-button" 
          onClick={() => setShowModal(false)}
          aria-label="Close modal"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="modal-content">
        {/* Notification Type Selector */}
        <div className="section">
          <h3 className="section-title">Notification Type</h3>
          <div className="notification-type-selector">
            <div className="radio-group">
              <label className={`radio-option ${notificationType === "common" ? "active" : ""}`}>
                <input
                  type="radio"
                  value="common"
                  checked={notificationType === "common"}
                  onChange={() => setNotificationType("common")}
                />
                <span className="radio-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="check-icon"/>
                  </svg>
                  Common Notification
                </span>
              </label>
              <label className={`radio-option ${notificationType === "user" ? "active" : ""}`}>
                <input
                  type="radio"
                  value="user"
                  checked={notificationType === "user"}
                  onChange={() => setNotificationType("user")}
                />
                <span className="radio-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="check-icon"/>
                  </svg>
                  User Specific
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* User Selection (Conditional) */}
        {notificationType === "user" && (
          <div className="section">
            <h3 className="section-title">Select Users</h3>
            <div className="user-selection">
              <div className="filter-controls">
                <div className="filter-options">
                  <div className="filter-tabs">
                    <button 
                      className={`filter-tab ${userFilter === "" ? "active" : ""}`}
                      onClick={() => setUserFilter("")}
                    >
                      All Users
                    </button>
                    <button 
                      className={`filter-tab ${userFilter === "old" ? "active" : ""}`}
                      onClick={() => setUserFilter("old")}
                    >
                      Old Users
                    </button>
                    <button 
                      className={`filter-tab ${userFilter === "paid" ? "active" : ""}`}
                      onClick={() => setUserFilter("paid")}
                    >
                      Paid Users
                    </button>
                  </div>
                </div>
                
                <div className="search-container">
                  <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search users by email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {(userFilter === "old" || userFilter === "paid") && filteredUsers.length > 0 && (
      <div className="bulk-actions-dropdown">
        <select
          onChange={(e) => {
            if (e.target.value === "select_all") {
              const usersToSelect = filteredUsers.filter(
                (user) => !selectedUsers.some((u) => u.uid === user.uid)
              );
              setSelectedUsers((prev) => [...prev, ...usersToSelect]);
            } else if (e.target.value === "deselect_all") {
              setSelectedUsers((prev) =>
                prev.filter((user) => !filteredUsers.some((u) => u.uid === user.uid))
              );
            }
            e.target.value = ""; // Reset dropdown after selection
          }}
        >
          <option value="">Bulk Actions</option>
          <option value="select_all">Select All</option>
          <option value="deselect_all">Deselect All</option>
        </select>
      </div>
    )}

              <div className="users-container">
                {isLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <span>Loading users...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="users-grid">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.uid}
                        className={`user-card ${
                          selectedUsers.some((u) => u.uid === user.uid)
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="user-avatar">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                          <div className="user-email">{user.email}</div>
                          <div className="user-tags">
                            {user.isOld && <span className="tag old">Old</span>}
                            {user.hasPaid && <span className="tag paid">Paid</span>}
                          </div>
                        </div>
                        <div className="selection-indicator">
                          {selectedUsers.some((u) => u.uid === user.uid) ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <div className="empty-circle"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUsers.length > 0 && (
                <div className="selected-users-section">
                  <div className="selected-header">
                    <h4>Selected Users</h4>
                    <span className="badge">{selectedUsers.length}</span>
                  </div>
                  <div className="selected-users-list">
                    {selectedUsers.map((user) => (
                      <div key={user.uid} className="selected-user-item">
                        <div className="user-avatar small">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="user-email">{user.email}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserSelect(user);
                          }}
                          className="remove-btn"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Language Tabs */}
        <div className="section">
          <h3 className="section-title">Notification Content</h3>
          <div className="language-tabs">
            <button
              className={`language-tab ${currentLanguage === "en" ? "active" : ""}`}
              onClick={() => setCurrentLanguage("en")}
            >
              English
            </button>
            <button
              className={`language-tab ${currentLanguage === "ru" ? "active" : ""}`}
              onClick={() => setCurrentLanguage("ru")}
            >
            Russian
            </button>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="section">
          <div className="rich-text-editor">
            <div className="formatting-toolbar">
              <button
                onClick={() => applyFormatting("bold")}
                className={`format-button ${isBold ? "active" : ""}`}
                aria-label="Bold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 4H14C15.5913 4 17.1174 4.63214 18.2426 5.75736C19.3679 6.88258 20 8.4087 20 10C20 11.5913 19.3679 13.1174 18.2426 14.2426C17.1174 15.3679 15.5913 16 14 16H6V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 12H15C16.0609 12 17.0783 12.4214 17.8284 13.1716C18.5786 13.9217 19 14.9391 19 16C19 17.0609 18.5786 18.0783 17.8284 18.8284C17.0783 19.5786 16.0609 20 15 20H6V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => applyFormatting("italic")}
                className={`format-button ${isItalic ? "active" : ""}`}
                aria-label="Italic"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 4H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 20H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 4L9 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => applyFormatting("link")}
                className={`format-button ${isLink ? "active" : ""}`}
                aria-label="Link"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.53087C19.5521 2.60383 18.298 2.07799 16.987 2.0666C15.6761 2.05521 14.413 2.55916 13.47 3.46997L11.75 5.17997" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 11C13.5705 10.4259 13.0226 9.9508 12.3934 9.60705C11.7642 9.26329 11.0685 9.05886 10.3533 9.00766C9.63816 8.95646 8.92037 9.05963 8.24861 9.3102C7.57685 9.56077 6.96684 9.95296 6.45996 10.46L3.45996 13.46C2.54915 14.403 2.0452 15.666 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.4479 21.3962 5.70197 21.922 7.01295 21.9334C8.32393 21.9448 9.58694 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div
              ref={editorRef}
              className="message-editor"
              contentEditable
              onInput={handleEditorInput}
              placeholder={`Write your ${currentLanguage === "en" ? "English" : "Russian"} notification message here...`}
            />
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button 
          className="secondary-button"
          onClick={() => setShowModal(false)}
        >
          Cancel
        </button>
        <button
          className="primary-button"
          onClick={addNotification}
          disabled={
            (notificationType === "common" && !messageEn && !messageRu) ||
            (notificationType === "user" && selectedUsers.length === 0)
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
