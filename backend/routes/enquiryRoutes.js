const express = require("express");
const mongoose = require("mongoose");
const Enquiry = require("../models/Enquiry");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const dotenv = require("dotenv");

dotenv.config();
const router = express.Router();

// ✅ Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ JWT Authentication Middleware
const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};

// ✅ Create Enquiry with Embedded File
router.post("/", authenticate, upload.single("file"), async (req, res) => {
  const { email, message, status } = req.body;

  if (!email || !message) {
    return res.status(400).json({ message: "Email and message are required." });
  }

  try {
    const newEnquiry = new Enquiry({
      email,
      message,
      status: status || "Raised",
    });

    // ✅ Add file if it exists
    if (req.file) {
      newEnquiry.file = {
        data: req.file.buffer,           // Store file as Buffer
        contentType: req.file.mimetype,  // Store content type
        filename: req.file.originalname, // Store filename
      };
    }

    await newEnquiry.save();
    res.status(201).json({ message: "Enquiry created successfully.", newEnquiry });
  } catch (error) {
    console.error("🚨 Error creating enquiry:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get Enquiries by Email
router.get("/:email", authenticate, async (req, res) => {
  const { email } = req.params;

  try {
    const enquiries = await Enquiry.find({ email });

    res.status(200).json(enquiries);
  } catch (error) {
    console.error("🚨 Error fetching enquiries:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get All Enquiries (For Admin or General Listing)
router.get("/", authenticate, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }); // Sorting by most recent first
    res.status(200).json(enquiries);
  } catch (error) {
    console.error("🚨 Error fetching enquiries:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Download File from Enquiry
router.get("/file/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const enquiry = await Enquiry.findById(id);

    if (!enquiry || !enquiry.file) {
      return res.status(404).json({ message: "File not found" });
    }

    res.set("Content-Type", enquiry.file.contentType);
    res.set("Content-Disposition", `attachment; filename="${enquiry.file.filename}"`);
    res.send(enquiry.file.data);
  } catch (error) {
    console.error("🚨 Error downloading file:", error);
    res.status(500).json({ message: "Failed to download file" });
  }
});




  // Update Enquiry (Message, Subject, Optional File)
router.put("/:id", authenticate, upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const { subject, message } = req.body;

  // Validate input
  if (!subject || !message) {
    return res.status(400).json({ message: "Subject and message are required." });
  }

  try {
    // Build update object
    const update = {
      subject,
      message,
    };

    if (req.file) {
      update.file = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
      };
    }

    // Update the enquiry
    const updatedEnquiry = await Enquiry.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!updatedEnquiry) {
      return res.status(404).json({ message: "Enquiry not found." });
    }

    res.status(200).json({ message: "Enquiry updated successfully.", enquiry: updatedEnquiry });
  } catch (error) {
    console.error("🚨 Error updating enquiry:", error);
    res.status(500).json({ message: "Server error" });
  }
});


  // routes/enquiries.js

// ✅ Submit Rating for Solved Enquiry
router.post("/:id/rating", authenticate, async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body; // Rating from the request body
  
    // Ensure rating is between 1 and 5
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
  
    try {
      // Find the enquiry by ID
      const enquiry = await Enquiry.findById(id);
  
      // Check if enquiry exists and if it's solved
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found." });
      }
  
      if (enquiry.status !== "Solved") {
        return res.status(400).json({ message: "Only solved enquiries can be rated." });
      }
  
      // Check if the user has already rated this enquiry
      if (enquiry.rating !== null) {
        return res.status(400).json({ message: "This enquiry has already been rated." });
      }
  
      // Update the rating
      enquiry.rating = rating;
      await enquiry.save();
  
      res.status(200).json({ message: "Rating submitted successfully!", enquiry });
    } catch (error) {
      console.error("🚨 Error submitting rating:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  

module.exports = router;
