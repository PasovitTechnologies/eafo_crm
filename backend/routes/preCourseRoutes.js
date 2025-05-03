const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Define schema
const preCourseSchema = new mongoose.Schema({
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true },
  phone: { type: String },
  country: { type: String },
  courseId: { type: String, required: true },
});

// Create unique compound index to prevent duplicate course registration
preCourseSchema.index({ email: 1, courseId: 1 }, { unique: true });

// Create model
const PreCourse = mongoose.model("PreCourse", preCourseSchema);

// POST /api/precourse/register
router.post("/register", async (req, res) => {
  const { firstName, middleName, lastName, email, phone, country, courseId } = req.body;

  if (!email || !courseId) {
    return res.status(400).json({ message: "Email and Course ID are required." });
  }

  try {
    const newEntry = new PreCourse({
      firstName,
      middleName,
      lastName,
      email,
      phone,
      country,
      courseId,
    });

    await newEntry.save();
    res.status(201).json({ message: "Pre-registration successful!" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "You've already registered for this course with this email.",
      });
    }
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

router.get("/users", async (req, res) => {
    const { courseId } = req.query; // Retrieving courseId from query parameters
  
    try {
      let query = {};
      if (courseId) {
        query.courseId = courseId;  // If courseId is provided, filter users by courseId
      }
  
      // Fetch users with email, courseId, and phone fields
      const users = await PreCourse.find(query, "email courseId phone"); 
  
      // Send the retrieved users as response
      res.json(users);
    } catch (err) {
      console.error("Failed to fetch users", err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  

module.exports = router;
