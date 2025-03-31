const mongoose = require("mongoose");

const WebinarSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleRussian: { type: String },
  date: { type: String, required: true },
  dayOfWeek: { type: String },
  dayOfWeekRussian: { type: String },
  time: { type: String, required: true },
  liveEmbed: { type: String, required: true },
  eventSiteURL: { type: String },
  chatEmbed: { type: String },
  bannerUrl: { type: String },
  bannerRussianURL: { type: String },
  chiefGuestName: { type: String },
  chiefGuestNameRussian: { type: String },
  photoUrl: { type: String },
  regalia: { type: String },
  regaliaRussian: { type: String },

  // ✅ Add participants array
  participants: [
    {
      email: { type: String, required: true },
      registeredAt: { type: Date, default: Date.now },
      status: { type: String, default: "Not Registered" }, // Default to "Not Registered"
    },
  ],
});

module.exports = mongoose.model("Webinar", WebinarSchema);
