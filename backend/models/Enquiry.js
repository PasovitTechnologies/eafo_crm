const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    match: [/\S+@\S+\.\S+/, "Please enter a valid email address"],
  },
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    minlength: [10, "Message must be at least 10 characters long."],
  },
  status: {
    type: String,
    enum: ["Raised", "Under Review", "Solved"],
    default: "Raised",
  },
  file: {
    data: Buffer,
    contentType: String,
    filename: String,
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
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Automatically update 'updatedAt' field before saving
enquirySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Enquiry = mongoose.model("Enquiry", enquirySchema);
module.exports = Enquiry;
