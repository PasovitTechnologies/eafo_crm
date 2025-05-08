const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserNotification = require("../models/UserNotificationSchema");

// Get notifications by email
router.get("/", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userNotification = await UserNotification.findOne({ userId: user._id });
    if (!userNotification) {
      return res.json([]);
    }

    res.json(userNotification.notifications || []);
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ message: "Server error while fetching notifications." });
  }
});

// Mark a specific notification as read
router.patch("/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const email = req.query.email || req.user?.email;

    if (!email) {
      return res.status(400).json({ message: "Email is required to mark notification as read." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userNotification = await UserNotification.findOne({ userId: user._id });
    if (!userNotification) {
      return res.status(404).json({ message: "No notifications found for user" });
    }

    const notification = userNotification.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.isRead) {
      return res.status(200).json({ message: "Notification already marked as read." });
    }

    notification.isRead = true;
    await userNotification.save();

    res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ message: "Server error while marking notification as read." });
  }
});


// POST /api/notifications
router.post("/", async (req, res) => {
  const { message, type = "info", users = [] } = req.body;

  // Log the incoming request for debugging
  console.log("Received request payload:", req.body);

  // Validate that message contains both English and Russian fields
  if (!message?.en || !message?.ru) {
    return res.status(400).json({ error: "Message (en and ru) is required" });
  }

  try {
    if (users.length > 0) {
      // User-specific notification logic
      for (const userId of users) {
        // Find the existing record or create a new one
        let record = await UserNotification.findOne({ userId });

        const newNotification = {
          message,
          type,
          createdAt: new Date(),
          isRead: false, // Default value for 'isRead'
        };

        if (record) {
          // If the record exists, push the new notification
          record.notifications.push(newNotification);
          await record.save();  // Save the updated record
          console.log(`Notification added for user ${userId}`);
        } else {
          // If the record doesn't exist, create new UserNotification for the user
          await UserNotification.create({
            userId,
            notifications: [newNotification],
          });
          console.log(`Created new notification record for user ${userId}`);
        }
      }
    } else {
      // Broadcasting to all users (logic can be implemented here)
      console.log("Broadcast to all users is not implemented yet.");
    }

    // Send success response with a message and confirmation
    return res.status(200).json({
      success: true,
      message: "Notification(s) added successfully",
    });
  } catch (err) {
    // Log error for debugging
    console.error("Error saving notification:", err);

    // Send error response with more details
    return res.status(500).json({
      error: "Server error",
      details: err.message || "An unexpected error occurred",
    });
  }
});


module.exports = router;
