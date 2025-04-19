const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },  
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Raised", "Under Review", "Solved"],
    default: "Raised",
  },

  file: {
    data: Buffer,         // File data stored as binary
    contentType: String,  // File type (e.g., image/png, application/pdf)
    filename: String,     // File name
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null, // Rating can be null initially
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Enquiry = mongoose.model("Enquiry", enquirySchema);
module.exports = Enquiry;
