const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    message: {
        en: { type: String, required: true },
        ru: { type: String, required: true }
      },
  type: { type: String }, // e.g., 'success', 'info', 'error'
  relatedFormId: mongoose.Types.ObjectId,
  relatedCourseId: mongoose.Types.ObjectId,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  notifications: [notificationSchema]
});

module.exports = mongoose.model("UserNotification", userNotificationSchema);
