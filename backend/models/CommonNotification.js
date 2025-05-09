// models/CommonNotification.js
const mongoose = require("mongoose");

const commonNotificationSchema = new mongoose.Schema({
  message: {
    en: { type: String, required: true },
    ru: { type: String, required: true }
  },
  type: { type: String, default: "common" }, // explicitly mark it
  isReadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // optional
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CommonNotification", commonNotificationSchema);
