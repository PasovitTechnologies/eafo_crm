const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require('multer');
const User = require("../models/User"); // Import the User schema
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const axios = require("axios");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const crypto = require("crypto");
const { message } = require("telegram/client");
const moment = require("moment-timezone");
const Course = require("../models/Course");
const { Form, Question } = require("../models/Form");




const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const OPENAI_API_KEY =process.env.OPENAI_API_KEY


router.post('/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: message
      })
    });

    const data = await response.json();

    // Debug log
    console.log("OpenAI API response:", data);

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "Invalid response from OpenAI API", detail: data });
    }

    res.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("OpenAI fetch error:", error);
    res.status(500).json({ error: "Internal Server Error", detail: error.message });
  }
});




let gfs;
mongoose.connection.once('open', () => {
  gfs = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'fs'
  });
});

// Store Admin Credentials Securely (Passwords are Hashed)
const adminCredentials = [
  { email: "admin@eafo.info", passwordHash: bcrypt.hashSync("Sasikumar@2003", 10) },
  { email: "project@eafo.ru", passwordHash: bcrypt.hashSync("your_admin_password_2", 10) },
  { email: "tech.admin@eafo.info", passwordHash: bcrypt.hashSync("your_admin_password_3", 10) },
];

// Check if the User is an Admin
const isAdminLogin = (email, password) => {
  const admin = adminCredentials.find((admin) => admin.email === email);
  return admin && bcrypt.compareSync(password, admin.passwordHash);
};

const isAdminEmail = (email) => {
  return adminCredentials.some((admin) => admin.email === email);
};




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
    req.user = decoded; // Attach user data from token
    next();
  });
};


const RUSENDER_API = "https://api.beta.rusender.ru/api/v1/external-mails/send";

// Helper function to send emails using Rusender
const sendEmailRusender = async (recipient, mail) => {
    const emailData = {
        mail: {
            to: { email: recipient.email },
            from: { email: "eafo@e-registrar.org", name: "EAFO" },
            subject: mail.subject,
            previewTitle: mail.subject,  // Rusender requires previewTitle
            html: mail.html.replace("{name}", recipient.firstName || "User")
        }
    };

    try {
        const response = await axios.post(RUSENDER_API, emailData, {
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": process.env.RUSENDER_API_KEY
            }
        });

        console.log(`✅ Email sent to ${recipient.email}:`, response.data);
        return { email: recipient.email, status: "Success", data: response.data };
    } catch (error) {
        console.error(`❌ Failed to send email to ${recipient.email}:`, error.response?.data || error.message);
        return { email: recipient.email, status: "Failed", error: error.message };
    }
};

// Function to choose email template based on language
const getEmailTemplate = (lang, user) => {
    if (lang === "ru") {
        return {
            subject: "Личный кабинет EAFO",
            html: `
                <h2>${user.salutation}, ${user.firstName} ${user.middleName}!</h2>
                <p>Благодарим Вас за регистрацию в личном кабинете на платформе Евразийской Федерации Онкологии (EAFO)!.</p>

                <p>Для входа в личный кабинет, пожалуйста, перейдите по ссылке:
                <a href="${process.env.APP_URL}">Sign in</a>
                </p>

                <p>Используйте адрес Вашей электронной почты в качестве логина.</p>

                <p>В случае возникновения вопросов, пожалуйста, свяжитесь с нашей службой технической поддержки по адресу:
                <a href="mailto:support@eafo.info">support@eafo.info</a>
                </p>

                <footer>
                <p>С уважением,</p>
                <p>Команда EAFO</p>
                </footer>
            `
        };
    } else {
        return {
            subject: "Registration Confirmation – Personal Account",
            html: `
                <h2>${user.salutation}, ${user.firstName} ${user.middleName} ${user.lastName}!</h2>
                <p>Thank you for registering for a personal account on the Eurasian Federation of Oncology (EAFO).</p>

                <p>To log in to your personal account, please follow this link: 
                <a href="${process.env.APP_URL}">Sign in</a>
                </p>

                <p>Please use your email address as your login.</p>

                <p>If you have any questions, please contact our technical support team at: 
                <a href="mailto:support@eafo.info">support@eafo.info</a>
                </p>

                <footer>
                <p>Best regards,</p>
                <p>EAFO Team</p>
                </footer>
            `
        };
    }
};

// User Registration
router.post("/", async (req, res) => {
    try {
        const { email, password, role, personalDetails, professionalDetails, dashboardLang } = req.body;

        // Validate required fields
        if (
            !personalDetails ||
            !personalDetails.firstName ||
            !personalDetails.lastName ||
            !personalDetails.dob ||
            !personalDetails.phone ||
            !personalDetails.gender ||
            !personalDetails.country ||
            !personalDetails.acceptTerms ||
            !professionalDetails ||
            !professionalDetails.university ||
            !professionalDetails.department
            
        ) {
            return res.status(400).json({ message: "All required fields must be filled." });
        }

        // Convert email to lowercase
        const normalizedEmail = email.toLowerCase();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered." });
        }

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email: normalizedEmail,
            password: hashedPassword,
            role: role || "user",
            personalDetails,
            professionalDetails,
            registeredAt: new Date(),
            dashboardLang: dashboardLang || "en"  // Store language preference
        });

        await newUser.save();

        // Prepare email recipient details
        const recipient = {
            email: newUser.email,
            salutation:newUser.personalDetails.title,
            firstName: newUser.personalDetails.firstName,
            middleName: newUser.personalDetails.middleName,
            lastName: newUser.personalDetails.lastName,
            role: newUser.role
        };

        // Get the correct template
        const emailTemplate = getEmailTemplate(dashboardLang, recipient);

        // Send the email
        const emailResult = await sendEmailRusender(recipient, emailTemplate);

        res.status(201).json({
            message: "User registered successfully.",
            emailStatus: emailResult.status
        });

    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});


router.put(
  "/:email/documents",
  upload.fields([
    { name: "passport" },
    { name: "motivation" },
    { name: "resume" },
    { name: "academicCertificates" },
    { name: "certificatePdf" },
    { name :"institutionDocument"}
  ]),
  async (req, res) => {
    try {
      const email = req.params.email;
      const { certificateLink = "", referral = "" } = req.body;

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      const uploadFileToGridFS = async (fieldName) => {
        const file = req.files?.[fieldName]?.[0];
        if (!file) return null;

        const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
        const fileName = `${originalName}`;
        
        return new Promise((resolve, reject) => {
          const writeStream = gfs.openUploadStream(fileName, {
            contentType: file.mimetype,
            metadata: {
              fieldName,
              uploadedBy: email,
            },
          });

          writeStream.end(file.buffer);

          writeStream.on("finish", async () => {
            try {
              const uploadedFile = await mongoose.connection.db
                .collection("fs.files")
                .findOne({ filename: fileName });

              if (!uploadedFile) {
                return reject(new Error("Uploaded file not found in fs.files"));
              }

            

              resolve({
                fileId: uploadedFile._id,
                fileName: uploadedFile.filename,
                contentType: uploadedFile.contentType,
                size: uploadedFile.length,
                uploadDate: uploadedFile.uploadDate,
              });
            } catch (dbErr) {
              reject(dbErr);
            }
          });

          writeStream.on("error", reject);
        });
      };

      const fileFields = [
        "passport",
        "motivation",
        "resume",
        "academicCertificates",
        "certificatePdf",
        "institutionDocument"
      ];

      const updatedDocs = {
        ...user.documents,
        certificateLink,
        referral,
        uploadedAt: moment.tz("Europe/Moscow").toDate(),
      };

      for (const field of fileFields) {
        const uploaded = await uploadFileToGridFS(field);
        if (uploaded) {
          // Delete previous file from GridFS if it exists
          const previousFileId = user.documents?.[field]?.fileId;
          if (previousFileId) {
            try {
              await gfs.delete(new mongoose.Types.ObjectId(previousFileId));
            } catch (delErr) {
              console.warn(`Could not delete old ${field}:`, delErr.message);
            }
          }

          updatedDocs[field] = uploaded;
        }
      }

      user.documents = updatedDocs;
      await user.save();

      res.status(200).json({
        message: "Documents uploaded successfully.",
        documents: updatedDocs,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({
        message: "Failed to upload documents",
        error: err.message,
      });
    }
  }
);




router.get("/file/:fileId", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);

    const file = await mongoose.connection.db
      .collection("fs.files")
      .findOne({ _id: fileId });
      console.log("Trying to retrieve file with ID:", fileId.toString());


    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    res.set("Content-Type", file.contentType || "application/octet-stream");
    res.set("Content-Disposition", `inline; filename="${file.filename}"`);

    const downloadStream = new mongoose.mongo.GridFSBucket(
      mongoose.connection.db,
      { bucketName: "fs" }
    ).openDownloadStream(fileId);

    downloadStream.pipe(res);

    downloadStream.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).end();
    });
  } catch (err) {
    console.error("Retrieval error:", err);
    res.status(500).json({ message: "Error retrieving file", error: err.message });
  }
});


router.get('/:email/documents', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });

    if (!user || !user.documents) {
      return res.status(404).json({ message: 'No documents found' });
    }

    res.json({ documents: user.documents });
  } catch (error) {
    console.error("Error fetching user documents:", error);
    res.status(500).json({ message: error.message });
  }
});




router.post("/validate", async (req, res) => {
  const { email, dob } = req.body;

  if (!email || !dob) {
    return res.status(400).json({ message: "Email and DOB are required." });
  }

  try {
    // Check email and nested dob inside personalDetails
    const user = await User.findOne({ email, "personalDetails.dob": dob });

    if (!user) {
      return res.status(404).json({ message: "User not found or details do not match!" });
    }

    res.status(200).json({ success: true, message: "Details matched." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// Reset Password Route
router.put("/update-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error updating password.", error: error.message });
  }
});






router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase();

    // First, check if the user is an admin
    if (isAdminLogin(normalizedEmail, password)) {
      const token = jwt.sign({ email: normalizedEmail, role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
      return res.json({ token, email: normalizedEmail, role: "admin" });
    }

    // If not an admin, check the database for a regular user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password!" });
    }

    // Generate JWT Token
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({
      token,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});


router.post('/upload/:email', upload.single('profileImage'), async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('User not found');

    user.profileImage = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
    };

    await user.save();
    res.send('Image uploaded successfully');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Get image endpoint
router.get('/image/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });

    if (!user || !user.profileImage) {
      return res.status(404).send('No image found');
    }

    res.set('Content-Type', user.profileImage.contentType);
    res.send(user.profileImage.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});



// Get User Profile (Protected)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    if (!isAdminEmail(req.user.email)) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const users = await User.find({}, "-password"); // Exclude password field
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Fetch a Specific User (Admin OR User themselves)
router.get("/:email", authenticateJWT, async (req, res) => {
  const { email } = req.params;
  const normalizedEmail = email.toLowerCase();

  console.log("Decoded JWT User:", req.user); // Debugging log

  try {
    if (!isAdminEmail(req.user.email) && req.user.email !== normalizedEmail) {
      return res.status(403).json({
        message: "Access denied. You can only access your own data.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update User Profile (Only the user themselves)
router.put("/update/:email", authenticateJWT, async (req, res) => {
  const { email } = req.params;
  const normalizedEmail = email.toLowerCase();
  const updateData = req.body; // Only contains modified fields

  console.log("Decoded JWT User:", req.user); // Debugging log

  try {
    // Prevent unauthorized updates (Only user can update their own profile)
    if (req.user.email !== normalizedEmail) {
      return res.status(403).json({
        message: "Access denied. You can only update your own profile.",
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No changes detected" });
    }

    //  Update only the changed fields using `$set`
    const updatedUser = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: updateData },
      { new: true, runValidators: true } // Returns updated user & applies validation
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get('/:email/courses/:courseId/notes', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const course = user.courses.find(c => c.courseId.toString() === req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found for this user' });
    }

    res.json({ notes: course.notes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:email/courses/:courseId/notes', authenticateJWT, async (req, res) => {
  try {
    const { paymentId, text } = req.body;
    const user = await User.findOne({ email: req.params.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let course = user.courses.find(c => c.courseId.toString() === req.params.courseId);
    if (!course) {
      // If course doesn't exist for user, create it
      course = { courseId: req.params.courseId, notes: [] };
      user.courses.push(course);
    }

    const newNote = {
      text,
      createdAt: moment.tz("Europe/Moscow").toDate(), 
    };

    course.notes.push(newNote);
    await user.save();

    res.status(201).json({ note: newNote });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:email/courses/:courseId/notes/:noteId', authenticateJWT, async (req, res) => {
  try {
    const { text } = req.body;
    const user = await User.findOne({ email: req.params.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const course = user.courses.find(c => c.courseId.toString() === req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found for this user' });
    }

    const noteIndex = course.notes.findIndex(n => n._id.toString() === req.params.noteId);
    if (noteIndex === -1) {
      return res.status(404).json({ message: 'Note not found' });
    }

    course.notes[noteIndex].text = text;
    await user.save();

    res.json({ note: course.notes[noteIndex] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:email/courses/:courseId/notes/:noteId', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const course = user.courses.find(c => c.courseId.toString() === req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found for this user' });
    }

    const noteIndex = course.notes.findIndex(n => n._id.toString() === req.params.noteId);
    if (noteIndex === -1) {
      return res.status(404).json({ message: 'Note not found' });
    }

    course.notes.splice(noteIndex, 1);
    await user.save();

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// In your userRoutes.js file
router.post('/filtered', authenticateJWT, async (req, res) => {
  try {
    const { filter } = req.body;
    let query = {};

    if (filter === "old") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      query.registeredAt = { $lte: threeMonthsAgo };
    } else if (filter === "paid") {
      query["courses.payments.status"] = "Paid";
    }

    const users = await User.find(query)
      .select("email _id registeredAt courses.payments.status")
      .lean();

    const cleanedUsers = users.map(user => ({
      ...user,
      uid: user._id.toString(),
      isOld: filter === "old" ? true : undefined,
      hasPaid: filter === "paid" ? true : undefined
    }));

    res.json({ users: cleanedUsers });
  } catch (error) {
    console.error("Error filtering users", error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Assuming you're using Express and Mongoose

// Sample Express.js route
router.get("/getqrDetails/:userId", authenticateJWT, async (req, res) => {
  try {
    // Get the userId from the URL parameters
    const { userId } = req.params;

    // Find the user by matching userId with User._id
    const user = await User.findById(userId).populate('courses.payments');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send back the user data
    res.json(user);
  } catch (err) {
    console.error("Error fetching QR details:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.get('/fetch/all-users', authenticateJWT, async (req, res) => {
  try {
    // Fetch users with only email, firstName, and lastName fields
    const users = await User.find(
      {},
      {
        email: 1,
        'personalDetails.firstName': 1,
        'personalDetails.lastName': 1,
      }
    ).lean();

    console.log('Raw users from MongoDB:', users.length);

    const formattedUsers = users
      .filter(user => user.email && typeof user.email === 'string' && user.email.trim() !== '')
      .map(user => ({
        email: user.email.trim(),
        firstName: user.personalDetails?.firstName || 'Unknown',
        lastName: user.personalDetails?.lastName || '',
      }));

    console.log('Formatted users after filtering:', formattedUsers.length);

    // Deduplicate users by email (case-insensitive)
    const uniqueUsers = Array.from(
      new Map(formattedUsers.map(user => [user.email.toLowerCase(), user])).values()
    );

    console.log('Unique users after deduplication:', uniqueUsers.length);

    if (uniqueUsers.length !== 60) {
      console.warn(`Unexpected user count: ${uniqueUsers.length}. Expected 60.`);
    }

    res.json(uniqueUsers);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// PUT /api/user/:email/courses/:courseId/payments/:transactionId/mark-free

// PUT /api/user/:email/courses/:courseId/free
router.put("/:email/courses/:courseId/free", authenticateJWT, async (req, res) => {
  const { email, courseId } = req.params;
  const { transactionId } = req.body;

  console.log("📩 Received request to mark as free:", { email, courseId, transactionId });

  if (!transactionId) {
    console.warn("⚠️ Missing transactionId in request body");
    return res.status(400).json({ success: false, message: "transactionId is required" });
  }

  try {
    // Step 1: Update User Schema
    const user = await User.findOne({ email });
    if (!user) {
      console.warn("❌ User not found:", email);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const course = user.courses.find(c => String(c.courseId) === String(courseId));
    console.log("🧾 Full user course entries:", user.courses);

    if (!course) {
      console.warn("❌ Course not found for user:", courseId);
      return res.status(404).json({ success: false, message: "Course not found for user" });
    }

    const userPayment = course.payments.find(p => String(p.transactionId) === String(transactionId));
    if (!userPayment) {
      console.warn("❌ Payment not found for transactionId in user:", transactionId);
      return res.status(404).json({ success: false, message: "Payment not found in user data" });
    }

    if (userPayment.status === "free") {
      console.log("ℹ️ User payment already marked as free.");
    } else {
      userPayment.status = "free";
      await user.save();
      console.log("✅ User payment status marked as free.");
    }

    // Step 2: Update Course Schema
    const courseDoc = await Course.findOne({
      _id: courseId,
      "payments.transactionId": transactionId,
      "payments.email": email,
    });

    if (!courseDoc) {
      console.warn("❌ Course document with matching payment not found");
      return res.status(404).json({ success: false, message: "Matching course payment not found" });
    }

    const coursePayment = courseDoc.payments.find(p => p.transactionId === transactionId && p.email === email);
    if (coursePayment.status !== "free") {
      coursePayment.status = "free";
      await courseDoc.save();
      console.log("✅ Course payment status marked as free.");
    } else {
      console.log("ℹ️ Course payment already marked as free.");
    }

    return res.status(200).json({ success: true, message: "Payment marked as free in user and course data" });
  } catch (error) {
    console.error("❌ Error marking payment as free:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});



// Example using Express + Mongoose


const getUserRegistrationFormsByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ message: "Email is required." });

    // 1. Find user by email
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    const results = [];

    // 2. For each course, look for registered forms
    for (const course of user.courses || []) {
      for (const formRef of course.registeredForms || []) {
        if (!formRef.isUsedForRegistration) continue;

        // 3. Load form
        const form = await Form.findById(formRef.formId).lean();
        if (!form) continue;

        // 4. Find this user's submission in form
        const submission = form.submissions?.find(
          (sub) => sub.email.toLowerCase() === email.toLowerCase()
        );

        if (submission) {
          results.push({
            courseId: course.courseId,
            formId: form._id,
            formName: form.formName,
            questions: form.questions,
            submission,
          });
        }
      }
    }

    res.json({ registrationForms: results });
  } catch (err) {
    console.error("Error fetching registration forms:", err);
    res.status(500).json({ message: "Server error" });
  }
};

router.get("/registration-forms/:email", getUserRegistrationFormsByEmail);










module.exports = router;
