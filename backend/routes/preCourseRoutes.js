const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");

// PreCourse Schema
const preCourseSchema = new mongoose.Schema({
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true },
  phone: { type: String },
  country: { type: String },
  courseId: { type: String, required: true },
});

// Prevent duplicate registrations for same course/email
preCourseSchema.index({ email: 1, courseId: 1 }, { unique: true });
const PreCourse = mongoose.model("PreCourse", preCourseSchema);

// Email API
const RUSENDER_API = "https://api.beta.rusender.ru/api/v1/external-mails/send";

// Email templates (used only for email, not stored)
const emailTemplates = {
  russian: {
    subject: 'Регистрация на XI EAFO Базовые медицинские курсы',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Уважаемый(ая) {name}!</h2>
        <p>Благодарим вас за интерес к участию в XI EAFO Базовых медицинских курсах.</p>
        <p>Для завершения регистрации вам необходимо создать личный кабинет на нашем сайте, перейдя по ссылке: <a href="https://ui.eafo.info">ui.eafo.info</a></p>
        <p>После входа в личный кабинет вы сможете:</p>
        <ul>
          <li>Заполнить профиль участника</li>
          <li>Загрузить необходимые документы</li>
          <li>Пройти вступительное тестирование</li>
          <li>Ознакомиться с программой курсов</li>
          <li>Получить информацию о месте и времени проведения</li>
        </ul>
        <p>Если у вас возникнут вопросы, вы можете связаться с нами по адресу: <a href="mailto:basic@eafo.info">basic@eafo.info</a> или по телефону: +7 (931) 111-22-55</p>
        <p>В случае возникновения любых вопросов, пожалуйста, свяжитесь с нашей службой технической поддержки по адресу: <a href="mailto:support@eafo.info">support@eafo.info</a></p>
        <p>Пожалуйста, зарегистрируйтесь в системе не позднее 15 июня 2025 г.</p>
        <p>С уважением,<br>Команда EAFO</p>
      </div>
    `
  },
  english: {
    subject: 'Registration for the XI EAFO Basic Medical Courses',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Dear {name},</h2>
        <p>Thank you for your interest in participating in the XI EAFO Basic Medical Courses.</p>
        <p>To complete your registration, you need to create a personal account on our website by following this link: <a href="https://ui.eafo.info">ui.eafo.info</a></p>
        <p>Once logged into your personal account, you will be able to:</p>
        <ul>
          <li>Fill out your participant profile</li>
          <li>Upload the required documents</li>
          <li>Take the entrance test</li>
          <li>Review the course program</li>
          <li>Receive information about the time and location of the courses</li>
        </ul>
        <p>If you have any questions, you can contact us at: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or by phone at: +7 (931) 111-22-55</p>
        <p>For any technical issues, please contact our support team at: <a href="mailto:support@eafo.info">support@eafo.info</a></p>
        <p>Please complete your registration no later than June 15, 2025.</p>
        <p>Sincerely,<br>Team EAFO</p>
      </div>
    `
  }
};

// Email sender helper
const sendEmailRusender = async (recipient, mail) => {
  const emailData = {
    mail: {
      to: { email: recipient.email },
      from: { email: "eafo@e-registrar.org", name: "EAFO" },
      subject: mail.subject,
      previewTitle: mail.subject,
      html: mail.html.replace("{name}", recipient.name || "User")
    }
  };

  try {
    console.log("📤 Sending email to:", recipient.email);
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
    return { 
      email: recipient.email, 
      status: "Failed", 
      error: error.response?.data || error.message 
    };
  }
};

// POST /api/precourse/register
router.post("/register", async (req, res) => {
  const { firstName, middleName, lastName, email, phone, country, courseId, language } = req.body;

  if (!email || !courseId) {
    return res.status(400).json({ message: "Email and Course ID are required." });
  }

  const supportedLanguages = { ru: "russian", en: "english" };
  const selectedLanguage = supportedLanguages[language?.toLowerCase()] || "english";

  try {
    // Save to DB (language is not stored)
    const newEntry = new PreCourse({ firstName, middleName, lastName, email, phone, country, courseId });
    await newEntry.save();

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const recipient = { email, name: fullName };

    await sendEmailRusender(recipient, emailTemplates[selectedLanguage]);

    const message = selectedLanguage === "russian"
      ? "Предварительная регистрация успешна! Проверьте вашу почту."
      : "Pre-registration successful! Check your email.";

    return res.status(201).json({ message });
  } catch (err) {
    if (err.code === 11000) {
      const message = selectedLanguage === "russian"
        ? "Вы уже зарегистрированы на этот курс с этим email."
        : "You've already registered for this course with this email.";
      return res.status(409).json({ message });
    }

    console.error("Registration error:", err);
    const message = selectedLanguage === "russian"
      ? "Ошибка сервера. Пожалуйста, попробуйте позже."
      : "Server error. Please try again later.";

    return res.status(500).json({ message });
  }
});

// GET /api/precourse/users
router.get("/users", async (req, res) => {
  const { courseId } = req.query;

  try {
    const query = courseId ? { courseId } : {};
    const users = await PreCourse.find(query, "email courseId phone firstName middleName lastName");
    res.json(users);
  } catch (err) {
    console.error("Failed to fetch users", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

module.exports = router;
