// routes/notifications.js
const express = require("express");
const router = express.Router();
const UserNotification = require("../models/UserNotificationSchema");

router.get("/", async (req, res) => {
    try {
      const email = req.query.email; // or req.body.email if using POST
      if (!email) return res.status(400).json({ message: "Email is required" });
  
      const userNotification = await UserNotification.findOne({ userId: email });
  
      if (!userNotification) {
        return res.json([]);
      }
  
      res.json(userNotification.notifications || []);
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      res.status(500).json({ message: "Server error while fetching notifications." });
    }
  });
  

module.exports = router;
