const express = require("express");
const jwt = require("jsonwebtoken");
const Webinar = require("../models/Webinars");
const User = require("../models/User");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const { TelegramApi } = require('./TelegramApi');


const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Admin credentials (for authentication)
const adminCredentials = [{ email: "admin@example.com", password: "admin123" }];


const RUSENDER_API = "https://api.beta.rusender.ru/api/v1/external-mails/send";

// ✅ Helper function to send emails using Rusender
const sendEmailRusender = async (recipient, mail) => {
  const emailData = {
    mail: {
      to: { email: recipient.email },
      from: { email: "eafo@e-registrar.org", name: "EAFO" },
      subject: mail.subject,
      previewTitle: mail.subject,
      html: mail.html // no `.replace` needed
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


// ✅ Function to select email template
const getWebinarEmailTemplate = (lang, user, webinar) => {
  const date = new Date(webinar.date);

  const webinarDate = date.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const webinarTime = webinar.time || date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dayOfWeek = lang === "ru" ? webinar.dayOfWeekRussian : webinar.dayOfWeek;
  const webinarTitle = lang === "ru" ? webinar.titleRussian : webinar.title;

  const chiefGuest = lang === "ru"
    ? webinar.chiefGuestNameRussian || "Эксперт"
    : webinar.chiefGuestName || "Guest Speaker";

  const regalia = lang === "ru"
    ? webinar.regaliaRussian || ""
    : webinar.regalia || "";

  const personal = user.personalDetails || {};
  const firstName = personal.firstName || (lang === "ru" ? "Участник" : "Participant");
  const middleName = personal.middleName || "";
  const lastName = personal.lastName || "";
  const title = personal.title || (lang === "ru" ? "Уважаемый(ая)" : "Dear");

  if (lang === "ru") {
    return {
      subject: `Подтверждение регистрации на вебинар: ${webinarTitle}`,
      html: `
        <h2>Подтверждение регистрации на вебинар</h2>
        <p>${title} <b>${firstName} ${middleName}</b>,</p>

        <p>Вы успешно зарегистрированы на <strong>"${webinarTitle}"</strong> от Евразийской федерации онкологии (EAFO)!</p>

        <p>Дата проведения вебинара: <strong>${webinarDate}, ${webinarTime} (время московское, GMT+3) [${dayOfWeek}]</strong></p>
        <p>Эксперт вебинара: <strong>${chiefGuest}</strong>,<br> ${regalia}</p>

        <p>Для доступа к запланированным онлайн мероприятиям, пожалуйста, войдите в личный кабинет EAFO:</p>
        <p><a href="${process.env.APP_URL}">Войти в личный кабинет</a></p>

        <p>Если возникли вопросы, напишите в поддержку: <a href="mailto:support@eafo.info">info@eafo.info</a></p>

        <footer>
          <p>С уважением,</p>
          <p>Команда EAFO</p>
        </footer>
      `
    };
  } else {
    return {
      subject: `Webinar Registration Confirmation: ${webinarTitle}`,
      html: `
        <h2>Webinar Registration Confirmation</h2>
        <p>${title} <b>${firstName} ${middleName} ${lastName}</b>,</p>

        <p>You have successfully registered for <strong>"${webinarTitle}"</strong> hosted by the Eurasian Federation of Oncology (EAFO)!</p>

        <p>Webinar Date: <strong>${webinarDate}, ${webinarTime} (Timezone: Moscow, Russia (GMT+3)) [${dayOfWeek}]</strong></p>
        <p>Chief Guest: <strong>${chiefGuest}</strong>,<br> ${regalia}</p>

        <p>To access the scheduled online events, please log in to your EAFO account:</p>
        <p><a href="${process.env.APP_URL}">Go to Dashboard</a></p>

        <p>If you have any questions, please contact our support team at:
          <a href="mailto:support@eafo.info">info@eafo.info</a>
        </p>

        <footer>
          <p>Best regards,</p>
          <p>EAFO Team</p>
        </footer>
      `
    };
  }
};



// **Authentication Middleware**
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

// **Admin Login Route (Generates JWT)**
router.post("/admin", (req, res) => {
  const { email, password } = req.body;

  if (adminCredentials.some((admin) => admin.email === email && admin.password === password)) {
    const token = jwt.sign({ email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    return res.status(200).json({ message: "Admin authenticated", token });
  }

  return res.status(403).json({ message: "Invalid admin credentials" });
});

// **Get All Webinars**
router.get("/", async (req, res) => {
  try {
    const webinars = await Webinar.find();
    res.json(webinars);
  } catch (error) {
    console.error("Error fetching webinars:", error);
    res.status(500).json({ message: "Error fetching webinars." });
  }
});

// **Get Single Webinar by ID**
router.get("/:id", async (req, res) => {
  try {
    const webinar = await Webinar.findById(req.params.id);
    if (!webinar) return res.status(404).json({ message: "Webinar not found" });

    res.json(webinar);
  } catch (error) {
    console.error("Error fetching webinar:", error);
    res.status(500).json({ message: "Error fetching webinar." });
  }
});

// **Create New Webinar**
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const newWebinar = new Webinar({ ...req.body });
    await newWebinar.save();

    res.status(201).json({ message: "Webinar added successfully!", webinar: newWebinar });
  } catch (error) {
    console.error("Error adding webinar:", error);
    res.status(500).json({ message: "Error adding webinar." });
  }
});

// **Update Webinar by ID**
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid webinar ID" });
  }

  try {
    const updatedWebinar = await Webinar.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedWebinar) return res.status(404).json({ message: "Webinar not found" });

    res.status(200).json(updatedWebinar);
  } catch (error) {
    res.status(500).json({ message: "Error updating webinar", error });
  }
});


// **Delete Webinar by ID**
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const deletedWebinar = await Webinar.findByIdAndDelete(req.params.id);

    if (!deletedWebinar) return res.status(404).json({ message: "Webinar not found" });

    res.status(200).json({ message: "Webinar deleted successfully!" });
  } catch (error) {
    console.error("Error deleting webinar:", error);
    res.status(500).json({ message: "Error deleting webinar." });
  }
});

router.post("/:id/register", authenticateJWT, async (req, res) => {
  try {
    const { email } = req.body;
    const webinarId = req.params.id;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const webinar = await Webinar.findById(webinarId);
    if (!webinar) return res.status(404).json({ message: "Webinar not found" });

    // ✅ Find User and Check if Already Registered
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isAlreadyRegistered = user.webinars.some((w) => w.webinarId.equals(webinarId));
    if (isAlreadyRegistered) {
      return res.status(400).json({ message: "User already registered for this webinar" });
    }

    // ✅ Add webinar to User's webinars list
    user.webinars.push({ webinarId, registeredAt: new Date() });
    await user.save();

    // ✅ Ensure `participants` array exists in Webinar model
    if (!webinar.participants) webinar.participants = [];

    // ✅ Add participant to Webinar's participants list
    const newParticipant = {
      email,
      registeredAt: new Date(),
      status: "Registered",
    };

    webinar.participants.push(newParticipant);
    await webinar.save();

    // Send success response
    res.status(201).json({ message: "Successfully registered!", participant: newParticipant });

    // Send Email (Existing Logic)
    const lang = user.dashboardLang || "en";
    const emailTemplate = getWebinarEmailTemplate(lang, user, webinar);
    await sendEmailRusender({ email: user.email, firstName: user.personalDetails?.firstName || "User" }, emailTemplate);
    
    console.log("✅ Webinar registration email sent!");

    // Now, send the message to the Telegram group
    const telegram = new TelegramApi();
    telegram.chat_id = '-4740453782';  // Replace with your group chat ID
    telegram.text = `
      📢 <b>New Webinar Registration</b>
      👤 <b>Name:</b> ${user.personalDetails.firstName} ${user.personalDetails.lastName}
      📧 <b>Email:</b> ${user.email}
      📝 <b>Webinar:</b> ${webinar.title}
      🕒 <b>Registered At:</b> ${new Date().toLocaleString()}
    `;
    await telegram.sendMessage();  // Send message to group

    console.log("✅ Notification sent to Telegram group!");

  } catch (error) {
    console.error("Error registering participant:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.post("/:id/cancel", authenticateJWT, async (req, res) => {
  try {
    const { email } = req.body; // Get user email from request body
    const webinarId = req.params.id;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const webinar = await Webinar.findById(webinarId);
    if (!webinar) return res.status(404).json({ message: "Webinar not found" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Remove user from the webinar's `participants` list
    webinar.participants = webinar.participants.filter((p) => p.email !== email);
    await webinar.save();

    // ✅ Remove webinar from the user's `webinars` list
    user.webinars = user.webinars.filter((w) => !w.webinarId.equals(webinarId));
    await user.save();

    res.status(200).json({ message: "Registration cancelled successfully!" });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

router.get("/:id/status", authenticateJWT, async (req, res) => {
  try {
    const { email } = req.query; // Get email from query params
    const webinarId = req.params.id;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const webinar = await Webinar.findById(webinarId);
    if (!webinar) return res.status(404).json({ message: "Webinar not found" });

    // ✅ Check if the user is in the participants list
    const isRegistered = webinar.participants.some((p) => p.email === email);

    res.status(200).json({ registered: isRegistered });
  } catch (error) {
    console.error("Error checking registration status:", error);
    res.status(500).json({ message: "Server error", error });
  }
});




module.exports = router;
