const express = require("express");
const Course = require("../models/Course");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const UserNotification = require("../models/UserNotificationSchema");
const CommonNotification = require("../models/CommonNotification");
const CourseCoupons = require('../models/CourseCoupons'); // adjust the path as needed
const User = require("../models/User"); // Import the User schema
const { body, validationResult } = require('express-validator');


const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";


// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }
    req.user = decoded;
    next();
  });
};

// Get all courses
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Error fetching courses", error: err.message });
  }
});

router.get("/:courseId/getName", authenticateJWT, async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).select("name nameRussian");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ name: course.name, nameRussian: course.nameRussian });
  } catch (err) {
    res.status(500).json({ message: "Error fetching course name", error: err.message });
  }
});



// Add a new course
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      date,
      invoiceNumber
    } = req.body;


    // Ensure required fields are present
    if (!name || !date || !invoiceNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Convert date to a valid Date object
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // Generate slug from the English course name
    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

    // Check for duplicate course slug
    const existingCourse = await Course.findOne({ slug });
    if (existingCourse) {
      return res.status(400).json({ message: "A course with this name already exists" });
    }

    // Create new course using all fields from req.body
    const course = new Course({
      ...req.body,          // Spread all fields into the course object
      slug,
      currentInvoiceNumber: req.body.invoiceNumber,
      date: parsedDate,     // Ensure the date is saved as a valid Date object
      items: [],
      forms: [],
      rules: [],
    });

  
    // Save to DB
    await course.save();
    res.status(201).json(course);

  } catch (err) {
    console.error("Error creating course:", err);
    res.status(500).json({ message: "Error creating course", error: err.message });
  }
});

// Delete a course
router.delete("/:courseId", authenticateJWT, async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.courseId);

    if (!deletedCourse) return res.status(404).json({ message: "Course not found" });

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting course", error: err.message });
  }
});

router.put("/:courseId", authenticateJWT, async (req, res) => {
  try {
    const courseId = req.params.courseId;

    //Fetch the current course data
    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) return res.status(404).json({ message: "Course not found" });

    //  Check if the name is changing
    const newName = req.body.name;
    let newSlug = existingCourse.slug;

    if (newName && newName !== existingCourse.name) {
      // 🆕 Generate a new slug based on the updated course name
      newSlug = newName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")   // Remove special characters
        .replace(/\s+/g, "-");           // Replace spaces with hyphens
    }

    // ✅ Update the course with the new data and new slug
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { ...req.body, slug: newSlug },   // Add the new slug
      { new: true, runValidators: true }
    );

    res.json({
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (err) {
    console.error("🚨 Error updating course:", err);
    res.status(500).json({
      message: "Error updating course",
      error: err.message,
    });
  }
});


// Add an item to a course
router.post("/:courseId/items", authenticateJWT, async (req, res) => {
  const { name, amount, currency } = req.body;

  if (!name || amount === undefined || !currency) {
    return res.status(400).json({ message: "Item name, amount, and currency are required" });
  }

  if (!["INR", "RUB"].includes(currency.toUpperCase())) {
    return res.status(400).json({ message: "Invalid currency type. Allowed: INR, RUB" });
  }

  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.items.push({ name, amount, currency: currency.toUpperCase() });
    await course.save();

    res.status(201).json({ message: "Item added successfully", items: course.items });
  } catch (err) {
    res.status(500).json({ message: "Error adding item", error: err.message });
  }
});

// Get all items for a course
router.get("/:courseId/items", authenticateJWT, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json({ items: course.items });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Edit an item in a course
router.put("/:courseId/items/:itemId", authenticateJWT, async (req, res) => {
  try {
    const { name, amount, currency } = req.body;
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const item = course.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Update fields only if provided
    if (name) item.name = name;
    if (amount !== undefined) item.amount = amount;
    if (currency && ["INR", "RUB"].includes(currency.toUpperCase())) {
      item.currency = currency.toUpperCase();
    }

    await course.save();
    res.json({ message: "Item updated successfully", items: course.items });
  } catch (err) {
    res.status(500).json({ message: "Error updating item", error: err.message });
  }
});

//  Delete an item from a course
router.delete("/:courseId/items/:itemId", authenticateJWT,async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const itemIndex = course.items.findIndex((item) => item._id.toString() === req.params.itemId);
    if (itemIndex === -1) return res.status(404).json({ message: "Item not found" });

    course.items.splice(itemIndex, 1);
    await course.save();

    res.json({ message: "Item deleted successfully", items: course.items });
  } catch (err) {
    res.status(500).json({ message: "Error deleting item", error: err.message });
  }
});





router.get("/:identifier", authenticateJWT, async (req, res) => {
  try {
    const { identifier } = req.params;

    let course;

    // Check if the identifier is a valid MongoDB ObjectId
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(identifier);

    if (isMongoId) {
      // Fetch by _id if valid MongoDB ObjectId
      course = await Course.findById(identifier);
    } else {
      // Fetch by slug if it's not a MongoDB ObjectId
      course = await Course.findOne({ slug: identifier });
    }

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: "Error fetching course", error: err.message });
  }
});







// Get all rules for a course
router.get("/:courseId/rules", authenticateJWT, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    res.status(200).json(course.rules);
  } catch (error) {
    res.status(500).json({ message: "Error fetching rules", error: error.message });
  }
});

// Add a new rule to a course
router.post("/:courseId/rules", authenticateJWT, async (req, res) => {
  const { formId, conditions, linkedItems } = req.body;

  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const newRule = { formId, conditions, linkedItems };

    course.rules.push(newRule);
    await course.save();

    res.status(201).json({ message: "Rule added successfully", rule: newRule });
  } catch (error) {
    res.status(500).json({ message: "Error adding rule", error: error.message });
  }
});

// Update an existing rule
router.put("/:courseId/rules/:ruleId", authenticateJWT,async (req, res) => {
  const { formId, conditions, linkedItems } = req.body;

  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const rule = course.rules.id(req.params.ruleId);
    if (!rule) return res.status(404).json({ message: "Rule not found" });

    rule.formId = formId;
    rule.conditions = conditions;
    rule.linkedItems = linkedItems;

    await course.save();

    res.status(200).json({ message: "Rule updated successfully", rule });
  } catch (error) {
    res.status(500).json({ message: "Error updating rule", error: error.message });
  }
});

// Delete a rule
router.delete("/:courseId/rules/:ruleId", authenticateJWT, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const ruleIndex = course.rules.findIndex((r) => r._id.toString() === req.params.ruleId);
    if (ruleIndex === -1) return res.status(404).json({ message: "Rule not found" });

    course.rules.splice(ruleIndex, 1);
    await course.save();

    res.status(200).json({ message: "Rule deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting rule", error: error.message });
  }
});



router.post('/:courseId/coupons', async (req, res) => {
  try {
    const { courseId } = req.params;
    const couponData = req.body;

    console.log('Incoming coupon data:', couponData);

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Handle CourseCoupons (coupons array in a separate collection)
    let courseCoupons = await CourseCoupons.findOne({ courseId });

    if (courseCoupons) {
      const exists = courseCoupons.coupons.some(c => c.code === couponData.code);
      if (exists) {
        return res.status(400).json({ message: 'Coupon code already exists for this course' });
      }

      courseCoupons.coupons.push(couponData);
      await courseCoupons.save();
    } else {
      courseCoupons = await CourseCoupons.create({
        courseId,
        coupons: [couponData]
      });
    }

    // ✅ Handle optional notifications
    if (couponData.notification) {
      const { message, type = "info", users = [], isHtml = false } = couponData.notification;

      if (!message?.en || !message?.ru) {
        return res.status(400).json({ message: "Notification message (en and ru) is required" });
      }

      const newNotification = {
        message,
        type,
        isHtml,
        createdAt: moment.tz("Europe/Moscow").toDate(),
        isRead: false,
      };

      if (users.length > 0) {
        // User-specific notifications
        for (const userId of users) {
          let record = await UserNotification.findOne({ userId });

          if (record) {
            record.notifications.push(newNotification);
            await record.save();
          } else {
            await UserNotification.create({
              userId,
              notifications: [newNotification],
            });
          }
        }
      } else {
        // Common notification
        await CommonNotification.create({
          message,
          type: "common",
          isHtml,
          createdAt: moment.tz("Europe/Moscow").toDate(),
        });
      }
    }

    return res.status(201).json({
      message: "Coupon (and notification if any) added successfully",
      courseCoupons,
    });

  } catch (err) {
    console.error('Error adding coupon:', err);
    res.status(400).json({ message: err.message });
  }
});


// Get all coupons for a course
router.get('/:courseId/coupons', async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    res.json(course.coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a coupon in a course
router.put('/:courseId/coupons/:couponId', async (req, res) => {
  try {
    const { courseId, couponId } = req.params;
    const updateData = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const coupon = course.coupons.id(couponId);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    Object.assign(coupon, updateData);
    await course.save();

    res.json(coupon);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a coupon from a course
router.delete('/:courseId/coupons/:couponId', async (req, res) => {
  try {
    const { courseId, couponId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const coupon = course.coupons.id(couponId);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    coupon.remove();
    await course.save();

    res.json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});




router.post('/fetch/filter-courses', async (req, res) => {
  try {
    const { courseName, packageName, paymentStatus } = req.body;

    if (!courseName || !packageName) {
      return res.status(400).json({ message: 'courseName and packageName are required' });
    }

    const currentDate = new Date();

    // Find the active course by name and check endDate
    const course = await Course.findOne({ name: courseName, endDate: { $gt: currentDate } }).select('_id endDate');

    if (!course) {
      return res.status(404).json({ message: 'Active course not found' });
    }

    // Build payments filter for Mongoose query
    const paymentFilter = { package: packageName };
    if (paymentStatus === 'paid') {
      paymentFilter.status = 'Paid';
    }

    // Query users who have this course and matching payments
    const users = await User.find({
      courses: {
        $elemMatch: {
          courseId: course._id,
          payments: { $elemMatch: paymentFilter },
        },
      },
    }).select('email personalDetails.firstName personalDetails.lastName -_id');

    // Format response users
    const formattedUsers = users.map(user => ({
      email: user.email,
      firstName: user.personalDetails?.firstName,
      lastName: user.personalDetails?.lastName,
    }));

    // Remove duplicates by email (if any)
    const uniqueUsers = Array.from(new Map(formattedUsers.map(u => [u.email, u])).values());

    res.status(200).json({
      message: 'Users retrieved successfully',
      users: uniqueUsers,
    });
  } catch (error) {
    console.error('Error filtering users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.post('/coupons/validate', [
  body('code').notEmpty().withMessage('Promo code is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('slug').notEmpty().withMessage('Course slug is required')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, email, slug } = req.body;
    const normalizedCode = code.toUpperCase().trim();

    // 1. Get User
    const user = await User.findOne({ email }).select('_id');
    if (!user) {
      return res.status(404).json({ valid: false, message: 'User not found' });
    }

    // 2. Get Course
    const course = await Course.findOne({ slug }).select('_id');
    if (!course) {
      return res.status(404).json({ valid: false, message: 'Course not found' });
    }

    // 3. Find Course Coupons
    const courseCoupons = await CourseCoupons.findOne({ courseId: course._id });
    if (!courseCoupons?.coupons?.length) {
      return res.json({ valid: false, message: 'No coupons available for this course' });
    }

    // 4. Coupon Validation
    let matchedCoupon = null;
    let couponType = null;

    // First check common coupons (no user restriction)
    const commonCoupon = courseCoupons.coupons.find(c => 
      c.type === 'common' && c.code.toUpperCase() === normalizedCode
    );

    if (commonCoupon) {
      matchedCoupon = commonCoupon;
      couponType = 'common';
    } else {
      // Check user-specific coupons
      const userCoupon = courseCoupons.coupons.find(c => {
        return (
          c.type === 'user' && 
          c.code.toUpperCase() === normalizedCode &&
          c.users.some(u => u.user.equals(user._id) && u.status === 'not_used')
        );
      });

      if (userCoupon) {
        matchedCoupon = userCoupon;
        couponType = 'user';
      }
    }

    if (!matchedCoupon) {
      return res.json({ 
        valid: false, 
        message: 'Invalid coupon code or not available for this user'
      });
    }

    // 5. Check usage limits
    if (matchedCoupon.totalLimit !== null && 
        matchedCoupon.currentLimit >= matchedCoupon.totalLimit) {
      return res.json({ valid: false, message: 'Coupon usage limit reached' });
    }

    // Prepare complete coupon data (excluding sensitive fields)
   
    const couponData = {
      _id: matchedCoupon._id,
      code: matchedCoupon.code,
      type: matchedCoupon.type,
      percentage: matchedCoupon.percentage,
      totalLimit: matchedCoupon.totalLimit,
      currentLimit: matchedCoupon.currentLimit,
    };

    // Success response with complete data
    res.json({
      success: true,
      valid: true,
      coupon: couponData,
      userSpecific: couponType === 'user',
      message: 'Coupon validated successfully'
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});








module.exports = router;



