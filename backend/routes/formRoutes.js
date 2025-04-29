const express = require("express");
const mongoose = require("mongoose");
const { Form, Question } = require("../models/Form");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const Course = require("../models/Course"); // Import Course model
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const User = require("../models/User");
const axios = require("axios");
const { TelegramApi } = require('./TelegramApi');
const { GridFSBucket } = require("mongodb");
const UserNotification = require("../models/UserNotificationSchema");

// ✅ Initialize GridFS bucket
let gfs;
mongoose.connection.once('open', () => {
  gfs = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
});


// ✅ JWT Authentication Middleware
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


const RUSENDER_API = "https://api.beta.rusender.ru/api/v1/external-mails/send";

// ✅ Helper function to send emails using Rusender
const sendEmailRusender = async (recipient, mail) => {
    const emailData = {
        mail: {
            to: { email: recipient.email },
            from: { email: "eafo@e-registrar.org", name: "EAFO" },
            subject: mail.subject,
            previewTitle: mail.subject,  
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

// ✅ Function to choose email template with Registration Type & Category
const getEmailTemplate = (lang, user, courseName, package) => {
  if (lang === "ru") {
      return {
          subject: `${courseName}. Регистрация`,
          html: `
              <p>${user.personalDetails.title} ${user.personalDetails.lastName} ${user.personalDetails.firstName} ${user.personalDetails.middleName},</p>
              <br>
              Благодарим Вас за регистрацию на <strong>${courseName}</strong>, который пройдет в Архангельске с 13 по 17 июня 2025г.
              <p><strong>Вы подали заявку на:</strong> ${package || "N/A"}</p>

              <p>Мы с нетерпением ждем Вашего участия. Оставайтесь с нами для получения более подробной информации. Если у Вас есть какие-либо вопросы, пожалуйста, свяжитесь с нами по адресу <a href="mailto:travel@eafo.info">travel@eafo.info</a></p>

              <p><strong>Важно:</strong> Для всех видов регистраций (кроме льготной конкурсной) Оргкомитет вышлет счет на оплату в течение 48 часов. Просим Вас прислать подтверждение платежа в течение 72 часов на <a href="mailto:travel@eafo.info">travel@eafo.info</a> (также указав Ваши ФИО).</p>

              <p>Если Вы не получили письмо, пожалуйста, проверьте папку "Спам".</p>

              <p>Для доступа к запланированным онлайн мероприятиям, пожалуйста, войдите в личный кабинет EAFO:</p>
              <a href="https://testui.eafo.info">Войти в личный кабинет</a>

              <p>С наилучшими пожеланиями,</p>
              <p>Команда EAFO</p>
          `
      };
  } else {
      return {
          subject: `${courseName}. Registration`,
          html: `
              <p>${user.personalDetails.title} ${user.personalDetails.firstName} ${user.personalDetails.middleName} ${user.personalDetails.lastName},</p>
              <br>
              Thank you for registering for <strong>${courseName}</strong>, which will be held in Arkhangelsk from June 13 to 17, 2025.
              <p><strong>You have registered for the category:</strong> ${package || "N/A"}</p>

              <p>We look forward to your participation. Stay tuned for further details. If you have any questions, feel free to contact us at <a href="mailto:travel@eafo.info">travel@eafo.info</a>.</p>

              <p><strong>Important Information:</strong> If you have registered in any of the categories except competitive, we will send you the invoice within 48 hours. Please arrange the payment within 3 weekdays and send the bank confirmation of payment by email to <a href="mailto:travel@eafo.info">travel@eafo.info</a>.</p>

              <p>If you have not received an email, please check the Spam folder.</p>

              <p>To access the scheduled online events, please log in to your EAFO account:</p>
              <a href="https://testui.eafo.info">Go to Dashboard</a>

              <p>Best regards,</p>
              <p>Team EAFO</p>
          `
      };
  }
};






// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Please upload an image (jpg, jpeg, or png)'));
    }
    cb(null, true);
  }
});

// Upload form logo
router.post('/:id/upload', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).send({ error: 'Form not found' });
    }

    form.formLogo = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };

    await form.save();
    res.send({ 
      message: 'Image uploaded successfully',
      imageData: form.formLogo.data.toString('base64'),
      contentType: form.formLogo.contentType
    });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get form logo image
router.get('/:id/image', async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form || !form.formLogo) {
      return res.status(404).send();
    }

    res.set('Content-Type', form.formLogo.contentType);
    res.send(form.formLogo.data);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});



// 🟢 Create a New Form or Duplicate an Existing Form
router.post("/", authenticateJWT, async (req, res) => {
  const { formName, duplicateFrom } = req.body;

  if (!formName || formName.trim() === "") {
    return res.status(400).json({ message: "Form name is required." });
  }

  try {
    let newForm = new Form({ formName, questions: [] });

    if (duplicateFrom) {
      const originalForm = await Form.findById(duplicateFrom).populate("questions");

      if (!originalForm) {
        return res.status(404).json({ message: "Original form not found." });
      }

      console.log("🚀 Original Form:", originalForm);

      const clonedQuestions = [];
      const idMapping = {}; // Stores old question ID -> new question ID mapping

      // Step 1: Clone questions and create new ID mappings
      for (const question of originalForm.questions) {
        const newQuestion = new Question({
          label: question.label,
          type: question.type,
          description: question.description || "",
          options: [...question.options],
          isConditional: question.isConditional || false,
          isRequired: question.isRequired || false,
          rules: question.rules ? JSON.parse(JSON.stringify(question.rules)) : [], // Deep copy rules
        });

        // Save the cloned question
        const savedQuestion = await newQuestion.save();
        if (!savedQuestion) {
          console.error("❌ Failed to save question:", newQuestion);
          return res.status(500).json({ message: "Failed to clone some questions." });
        }

        idMapping[question._id.toString()] = savedQuestion._id.toString(); // Store old -> new ID mapping
        clonedQuestions.push(savedQuestion);
      }

      // Step 2: Update rules with new question IDs
      for (const question of clonedQuestions) {
        if (question.rules && question.rules.length > 0) {
          question.rules.forEach((rule) => {
            rule.conditions.forEach((condition) => {
              if (idMapping[condition.triggerQuestionId]) {
                condition.triggerQuestionId = idMapping[condition.triggerQuestionId]; // ✅ Update triggerQuestionId
              }
            });
            rule.targetQuestionIds = rule.targetQuestionIds.map(
              (targetId) => idMapping[targetId] || targetId // ✅ Update targetQuestionIds
            );
          });

          // Save updated question with new rules
          await question.save();
        }
      }

      newForm.questions = clonedQuestions;
    }

    console.log("📄 New Form to Save:", newForm);
    await newForm.save();

    res.status(201).json({ form: newForm });
  } catch (error) {
    console.error("🚨 Error creating form:", error);
    res.status(500).json({ message: "An error occurred while creating the form." });
  }
});



// 🟢 Get All Forms (Only Name & ID)
router.get("/", authenticateJWT,async (req, res) => {
  try {
    const forms = await Form.find(); // Fetch all forms
    res.json({ forms }); // Return as { forms: [...] }
  } catch (error) {
    console.error("Error fetching forms:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// 🟢 Fetch Form by _id
router.get("/:id", authenticateJWT,async (req, res) => {
  try {
    const form = await Form.findById(req.params.id).populate("questions");
    if (!form) return res.status(404).json({ message: "Form not found" });

    res.json(form);
  } catch (error) {
    console.error("Error fetching form:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Import Form model

// Update Form and Link to Course
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const updateData = {};
    console.log("👉 Initial updateData:", updateData);

    // ✅ Log the incoming request body
    console.log("📥 Request Body:", req.body);

    // ✅ Update text fields only if provided
    if (req.body.formName) {
      updateData.formName = req.body.formName;
      console.log("📝 Updated formName:", req.body.formName);
    }
    if (req.body.description) {
      updateData.description = req.body.description;
      console.log("📝 Updated description:", req.body.description);
    }
    if (req.body.title) {
      updateData.title = req.body.title;
      console.log("📝 Updated title:", req.body.title);
    }

    // ✅ Handle course assignment/removal
    if (req.body.courseId === "") {
      updateData.courseId = null; // Remove course assignment
      console.log("🚫 Removed course assignment.");
    } else if (req.body.courseId) {
      updateData.courseId = req.body.courseId;
      console.log("🔗 Assigned new course ID:", req.body.courseId);
    }

    // ✅ Handle boolean fields explicitly
    if (typeof req.body.isUsedForRussian !== "undefined") {
      updateData.isUsedForRussian = req.body.isUsedForRussian;
      console.log("🔘 isUsedForRussian:", req.body.isUsedForRussian);
    }
    if (typeof req.body.isUsedForRegistration !== "undefined") {
      updateData.isUsedForRegistration = req.body.isUsedForRegistration;
      console.log("🔘 isUsedForRegistration:", req.body.isUsedForRegistration);
    }

    // 📝 Log the final `updateData` before updating the form
    console.log("🚀 Final updateData:", updateData);

    // 📝 Update the form in the database
    const updatedForm = await Form.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    // ✅ Log the updated form
    console.log("✅ Updated Form:", updatedForm);

    if (!updatedForm) {
      console.log("❌ Form not found");
      return res.status(404).json({ message: "Form not found" });
    }

    // 🛑 Remove form from any previous course
    const removeResult = await Course.updateMany(
      { "forms.formId": updatedForm._id },
      { $pull: { forms: { formId: updatedForm._id } } }
    );
    console.log("🛑 Removed form from previous courses:", removeResult);

    // ✅ Link form to new course if provided
    if (req.body.courseId) {
      const course = await Course.findById(req.body.courseId);
      if (!course) {
        console.log("❌ Course not found with ID:", req.body.courseId);
        return res.status(404).json({ message: "Course not found" });
      }

      console.log("📚 Found Course:", course);

      const existingFormIndex = course.forms.findIndex(
        (f) => f.formId.toString() === updatedForm._id.toString()
      );
      console.log("🔎 Existing Form Index:", existingFormIndex);

      const formData = {
        formId: updatedForm._id,
        formName: updatedForm.formName,
        isUsedForRussian: updatedForm.isUsedForRussian,          // ✅ Added boolean field
        isUsedForRegistration: updatedForm.isUsedForRegistration // ✅ Added boolean field
      };

      if (existingFormIndex === -1) {
        // 🛠️ Push the form with booleans to the course
        course.forms.push(formData);
        console.log("➕ Added form to course with booleans.");
      } else {
        // ✅ Update existing form data, including booleans
        course.forms[existingFormIndex] = formData;
        console.log("🔧 Updated existing form in course with booleans.");
      }

      await course.save();
      console.log("✅ Course saved successfully with boolean fields.");
    }

    // ✅ Return updated form
    res.json({ form: updatedForm });
    console.log("🚀 Response Sent Successfully.");

  } catch (error) {
    console.error("❗ Error updating form:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});






// 🟢 Delete a Form (and its Questions)
router.delete("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    // Find the form to get its formId
    const deletedForm = await Form.findByIdAndDelete(id);

    if (!deletedForm) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Find and update all courses that contain the formId in their forms array
    const updatedCourses = await Course.updateMany(
      { "forms.formId": id }, // Find courses where forms array contains the formId
      { $pull: { forms: { formId: id } } } // Remove the form entry from the array
    );

    res.status(200).json({
      message: "Form deleted successfully",
      coursesUpdated: updatedCourses.modifiedCount,
    });
  } catch (error) {
    console.error("Error deleting form:", error);
    res.status(500).json({ error: "Server error deleting form" });
  }
});


router.delete("/:formId/image", async (req, res) => {
  try {
    const formId = req.params.formId;
    await Form.findByIdAndUpdate(formId, { formLogo: null }); // Remove image from DB
    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting image" });
  }
});



router.post("/:id/upload", authenticateJWT,upload.single("image"), async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    // ✅ Save Image Path in Form
    const fileExt = path.extname(req.file.originalname);
    form.image = `/uploads/${form._id}_logo${fileExt}`;
    await form.save();

    res.json({ message: "Image uploaded successfully", imageUrl: form.image });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Server error!" });
  }
});


router.post('/:formId/questions',authenticateJWT, async (req, res) => {
  try {
    const { formId } = req.params;
    const { label, type, options, rules } = req.body;

    const updatedForm = await Form.findByIdAndUpdate(
      formId,
      { $push: { questions: { label, type, options, rules } } },
      { new: true, runValidators: true }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.status(201).json({ message: 'Question added successfully', form: updatedForm });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:formId/questions', authenticateJWT,async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId);

    if (!form) return res.status(404).json({ message: 'Form not found' });

    res.status(200).json(form.questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:formId/questions/:questionId', authenticateJWT,async (req, res) => {
  try {
    const { formId, questionId } = req.params;
    const updateData = req.body;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: 'Form not found' });

    const question = form.questions.id(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    Object.assign(question, updateData);
    await form.save();

    res.status(200).json({ message: 'Question updated successfully', question });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:formId/questions/:questionId',authenticateJWT, async (req, res) => {
  try {
    const { formId, questionId } = req.params;

    const updatedForm = await Form.findByIdAndUpdate(
      formId,
      { $pull: { questions: { _id: questionId } } },
      { new: true }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:formId/questions/:questionId/options/:optionIndex', authenticateJWT, async (req, res) => {
  try {
    const { formId, questionId, optionIndex } = req.params;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });

    const question = form.questions.id(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (optionIndex < 0 || optionIndex >= question.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    question.options.splice(optionIndex, 1);
    await form.save();

    res.status(200).json({ message: "Option removed successfully", question });
  } catch (error) {
    console.error("Error removing option:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/:formId/questions/:questionId/rules', authenticateJWT,async (req, res) => {
  try {
    const { formId, questionId } = req.params;
    const newRule = req.body;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });

    const question = form.questions.id(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    question.rules.push(newRule);
    await form.save();

    res.status(201).json({ message: "Rule added successfully", question });
  } catch (error) {
    console.error("Error adding rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put('/:formId/questions/:questionId/rules/:ruleId',authenticateJWT, async (req, res) => {
  try {
    const { formId, questionId, ruleId } = req.params;
    const updatedRule = req.body;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });

    const question = form.questions.id(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const rule = question.rules.id(ruleId);
    if (!rule) return res.status(404).json({ message: "Rule not found" });

    Object.assign(rule, updatedRule);
    await form.save();

    res.status(200).json({ message: "Rule updated successfully", rule });
  } catch (error) {
    console.error("Error updating rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete('/:formId/questions/:questionId/rules/:ruleId',authenticateJWT, async (req, res) => {
  try {
    const { formId, questionId, ruleId } = req.params;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });

    const question = form.questions.id(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    question.rules = question.rules.filter(rule => rule._id.toString() !== ruleId);
    await form.save();

    res.status(200).json({ message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:formId/questions", authenticateJWT, async (req, res) => {
  const { formId } = req.params;
  const { questions } = req.body;

  console.log("📋 Form ID:", formId);
  console.log("🆕 Received Questions:", questions);

  try {
    // Validate input
    if (!Array.isArray(questions)) {
      console.warn("⚠️ Invalid request: questions should be an array");
      return res.status(400).json({ error: "Invalid request: questions should be an array" });
    }

    // Ensure each question has a valid ObjectId if `_id` exists, or create a new one
    const updatedQuestions = questions.map(q => ({
      ...q,
      _id: q._id ? new mongoose.Types.ObjectId(q._id) : new mongoose.Types.ObjectId(),
    }));

    console.log("🆔 Processed Questions:", updatedQuestions);

    // Find and update the form
    const updatedForm = await Form.findByIdAndUpdate(
      formId,
      { $set: { questions: updatedQuestions } },
      { new: true, runValidators: true }
    );

    if (!updatedForm) {
      console.warn("⚠️ Form not found");
      return res.status(404).json({ error: "Form not found" });
    }

    console.log("✅ Questions updated successfully");
    return res.status(200).json({ message: "Questions updated successfully", questions: updatedForm.questions });

  } catch (error) {
    console.error("🚨 Error updating questions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});




const findLinkedItems = async (invoiceFields, courseId, session) => {
  if (!invoiceFields?.length || !courseId) return null;

  try {
    const course = await Course.findById(courseId).session(session);
    if (!course?.rules?.length || !course?.items?.length) return null;

    console.log(`🔎 Matching invoice fields against ${course.rules.length} course rules...`);

    for (const rule of course.rules) {
      const { conditions = [], linkedItems = [] } = rule;

      if (!conditions.length || !linkedItems.length) continue;

      let allMatched = true;

      for (const condition of conditions) {
        const { questionId, option, operator } = condition;
        if (!questionId) {
          allMatched = false;
          break;
        }

        const userAnswerObj = invoiceFields.find(f =>
          f.questionId.toString() === questionId.toString()
        );

        if (!userAnswerObj) {
          allMatched = false;
          break;
        }

        const userAnswer = (userAnswerObj.answer || "").trim();
        const expectedOption = (option || "").trim();

        const matched = operator === "AND"
          ? userAnswer === expectedOption
          : userAnswer !== expectedOption;

        if (!matched) {
          allMatched = false;
          break;
        }
      }

      if (allMatched) {
        const linkedItemId = linkedItems[0]?.toString();
        const item = course.items.find(i => i._id.toString() === linkedItemId);
        if (item) {
          console.log("🎯 Rule matched! Linked item details:", item);
          return item;
        } else {
          console.warn("⚠️ Linked item ID found, but item not present in course.items");
        }
      }
    }

  } catch (error) {
    console.error("❌ Error in findLinkedItems:", error);
    throw error;
  }

  return null;
};


// 2. Extract invoice fields (no change)
const extractInvoiceFields = (processedSubmissions) => {
  return processedSubmissions
    .filter(sub => sub.isUsedForInvoice && sub.questionId && sub.answer)
    .map(sub => ({
      questionId: sub.questionId.toString(),
      answer: sub.answer.toString()
    }));
};

// 3. Updated route handler
router.post("/:formId/submissions", authenticateJWT, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🔥 Incoming request to submit form:");
    console.log("📌 Request params:", req.params);
    console.log("📌 Request body:", JSON.stringify(req.body, null, 2));

    const { formId } = req.params;
    const { submissions, email } = req.body;

    if (!formId || !mongoose.Types.ObjectId.isValid(formId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid or missing form ID" });
    }

    if (!Array.isArray(submissions) || submissions.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Submissions cannot be empty" });
    }

    const form = await Form.findById(formId).session(session);
    if (!form) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Form not found" });
    }

    console.log("✅ Form found:", form.formName);

    const { isUsedForRegistration, isUsedForRussian, formName, description, courseId } = form;

    if (!courseId) {
      await session.abortTransaction();
      console.log("⚠️ No courseId found in form.");
      return res.status(404).json({ message: "No course associated with this form." });
    }

    console.log("✅ Form linked to courseId:", courseId);

    const processedSubmissions = [];

    for (const submission of submissions) {
      if (!submission.questionId) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Each submission must include a questionId."
        });
      }

      const response = {
        formId: formId,
        questionId: submission.questionId,
        isUsedForInvoice: submission.isUsedForInvoice || false
      };

      if (submission.isFile && submission.fileData) {
        console.log(`📁 Processing file for question ${submission.questionId}`);

        const { base64, contentType, fileName, size } = submission.fileData;

        if (!base64 || !contentType) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Missing base64 data or contentType for file in question ${submission.questionId}`
          });
        }

        const fileBuffer = Buffer.from(base64, 'base64');
        const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${fileName}`;

        const writeStream = gfs.openUploadStream(uniqueFileName, {
          contentType: contentType || 'application/octet-stream',
          metadata: {
            questionId: submission.questionId,
            formId: formId,
            submittedBy: email || 'anonymous'
          }
        });

        writeStream.write(fileBuffer);
        writeStream.end();

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        response.file = {
          fileId: writeStream.id,
          fileName: fileName,
          contentType: contentType,
          size: size || fileBuffer.length,
          uploadDate: new Date()
        };

        console.log(`✅ File stored: ${response.file.fileName}`);
      } else {
        if (!submission.answer) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Missing answer for question ${submission.questionId}`
          });
        }
        response.answer = submission.answer;
      }

      processedSubmissions.push(response);
    }

    console.log("✅ All submissions processed.");

    let linkedItemDetails = null;
    let invoiceFields = [];

    if (isUsedForRegistration) {
      invoiceFields = extractInvoiceFields(processedSubmissions);
      console.log("🧾 Extracted invoice fields:", invoiceFields);

      linkedItemDetails = await findLinkedItems(invoiceFields, courseId, session);
    }

    const newSubmission = {
      email: email || "N/A",
      responses: processedSubmissions,
      submittedAt: new Date()
    };

    form.submissions.push(newSubmission);
    await form.save({ session });
    console.log("✅ Submission saved!");

    let updatedUser = null;

    if (email) {
      console.log("✅ Email provided, checking for existing user...");

      const user = await User.findOne({ email }).session(session);

      if (!user) {
        console.log("🚫 User not found. Skipping user creation as requested.");
      } else {
        console.log("✅ User found, updating user data...");

        let userCourse = user.courses.find(
          (course) => course.courseId.toString() === courseId.toString()
        );

        if (!userCourse) {
          // Create and push the new course
          user.courses.push({
            courseId,
            registeredForms: [],
            payments: [],
            submittedAt: new Date()
          });
          console.log("📚 Added new course to user.courses[]");

          // 🔥 Re-fetch course properly after push
          userCourse = user.courses.find(
            (course) => course.courseId.toString() === courseId.toString()
          );
        }

        const existingForm = userCourse.registeredForms.find(
          (form) => form.formId.toString() === formId.toString()
        );

        if (!existingForm) {
          userCourse.registeredForms.push({
            formId,
            formName,
            formDescription: description,
            isUsedForRegistration,
            isUsedForRussian,
            submittedAt: new Date()
          });
          console.log("📝 Registered form added to user.courses[].registeredForms");
        } else {
          console.log("🚫 Form already exists in registeredForms, skipping...");
        }

        if (linkedItemDetails) {
          if (!Array.isArray(userCourse.payments)) {
            userCourse.payments = [];
            console.log("🆕 userCourse.payments array initialized.");
          }
        
          // Generate 6-digit orderId
          const generateOrderId = () => {
            return Math.floor(100000 + Math.random() * 900000).toString();
          };
          
          const transactionId = generateOrderId();
          console.log(`🆔 Generated Order ID: ${transactionId}`);
        
          // Push payment to user's course
          userCourse.payments.push({
            transactionId,
            package: linkedItemDetails.name,
            amount: linkedItemDetails.amount,
            currency: linkedItemDetails.currency,
            status: "Not created",
            submittedAt: new Date()
          });
        
          console.log("💳 New payment added to userCourse.payments:", {
            transactionId,
            package: linkedItemDetails.name,
            amount: linkedItemDetails.amount,
            currency: linkedItemDetails.currency
          });
        
          // Save updated USER
          await user.save({ session });
          console.log("✅ User saved successfully with new payment.");
        
          // Fetch and update Course
          const course = await Course.findById(courseId).session(session);
        
          if (!course.payments) {
            course.payments = [];
            console.log("🆕 course.payments array initialized.");
          }
        
          course.payments.push({
            email: email,
            transactionId,
            package: linkedItemDetails.name,
            amount: linkedItemDetails.amount,
            currency: linkedItemDetails.currency,
            status: "Not created",
            submittedAt: new Date()
          });
        
          console.log("🏛️ New payment added to course.payments:", {
            email,
            transactionId,
            package: linkedItemDetails.name,
            amount: linkedItemDetails.amount,
            currency: linkedItemDetails.currency
          });
        
          await course.save({ session });
          console.log("✅ Course saved successfully with new payment.");


          // === Add notification after form submission ===
const notification = {
  type: "form_submission",
  formId: formId,
  formName: formName,
  courseId: courseId,
  message: {
    en: `Your submission for "${formName}" was received`,
    ru: `Ваша заявка на форму "${formName}" получена`,
  },
  read: false,
  createdAt: new Date()
};

let userNotification = await UserNotification.findOne({ userId: user._id }).session(session);

if (!userNotification) {
  userNotification = new UserNotification({
    userId: user._id,
    notifications: [notification]
  });
  console.log("📬 Created new UserNotification doc for user.");
} else {
  userNotification.notifications.push(notification);
  console.log("📬 Appended new notification to existing UserNotification.");
}

await userNotification.save({ session });
console.log("🔔 Notification saved for user:", user.email);

// === Optional: registration-specific logic ===
// === Optional: registration-specific logic ===
if (isUsedForRegistration && linkedItemDetails) {
  try {
    const emailTemplate = getEmailTemplate(
      isUsedForRussian ? "ru" : "en",
      user,
      formName,
      linkedItemDetails?.name || "Package"
    );

    await sendEmailRusender(
      { email: user.email, firstName: user.firstName },
      emailTemplate
    );
    console.log("✅ Registration email sent using package info!");

    const telegram = new TelegramApi();
    telegram.chat_id = '-4740453782';  // Replace with your group chat ID
    telegram.text = `
      📢 <b>Новая заявка</b>
      👤 <b>Name:</b> ${user.personalDetails?.firstName || "N/A"} ${user.personalDetails?.lastName || ""}
      📧 <b>Email:</b> ${user.email}
      📦 <b>Package:</b> ${linkedItemDetails?.name || "N/A"}
      🕒 <b>Registered At:</b> ${new Date().toLocaleString()}
    `;

    await telegram.sendMessage();
    console.log("✅ Notification sent to Telegram group!");

  } catch (error) {
    console.error("⚠️ Failed to send email or Telegram message (non-critical):", error.message);
  }
}


        }
        
        
        
        

        await user.save({ session });
        updatedUser = user;
      }
    }

    await session.commitTransaction();
    console.log("✅ Transaction committed.");

    const responsePayload = {
      message: "Form submitted successfully!",
      submission: newSubmission,
      user: updatedUser || null,
      ...(isUsedForRegistration && { linkedItemDetails })
    };

    res.status(201).json(responsePayload);

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error submitting form:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    session.endSession();
  }
});






router.get('/files/:fileId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    // Verify token (optional, depending on your auth setup)
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      const fileId = new mongoose.Types.ObjectId(req.params.fileId);
      
      // First check if file exists
      const file = await mongoose.connection.db.collection('uploads.files').findOne({ _id: fileId });
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Verify user has access to this file (optional)
      // You might want to check if the user submitted this file
      // This depends on your application logic

      // Set proper headers
      res.set('Content-Type', file.contentType);
      res.set('Content-Length', file.length);
      res.set('Content-Disposition', `attachment; filename="${file.filename}"`);

      // Stream the file
      const downloadStream = gfs.openDownloadStream(fileId);
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        res.status(500).end();
      });
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({ message: 'Error retrieving file', error: error.message });
  }
});


router.get('/:formId/submission', authenticateJWT, async (req, res) => {
  try {
    const { formId } = req.params;
    const email = req.user.email; // Get email from authenticated user

    if (!formId) {
      return res.status(400).json({ 
        success: false,
        message: "Form ID is required" 
      });
    }

    const form = await Form.findOne({
      _id: formId,
      'submissions.email': email
    }).select('submissions.$');

    if (!form?.submissions?.length) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this form and user"
      });
    }

    const submission = form.submissions[0];
    
    res.json({
      success: true,
      formId: form._id,
      email: submission.email,
      responses: submission.responses,
      submittedAt: submission.submittedAt,
      isUsedForRegistration: submission.isUsedForRegistration,
      isUsedForRussian: submission.isUsedForRussian
    });

  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});


router.get('/:formId/info', authenticateJWT, async (req, res) => {
  const { formId } = req.params;

  try {
    const form = await Form.findById(formId);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.status(200).json({
      title: form.title,
      description: form.description,
      formLogo: form.formLogo || null,  // Send null if no logo exists
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      isUsedForRussian:form.isUsedForRussian
    });

  } catch (error) {
    console.error('Error fetching form details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});









module.exports = router;
