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

module.exports = router;
