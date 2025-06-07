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
const { TelegramApi } = require("./TelegramApi");
const { GridFSBucket } = require("mongodb");
const UserNotification = require("../models/UserNotificationSchema");
const QRCode = require("qrcode");
const moment = require("moment-timezone");
const Queue = require("bull"); // ✔️ No destructuring
const CourseCoupons = require("../models/CourseCoupons"); // adjust the path as needed

const formSubmissionQueue = new Queue("form-submissions", {
  redis: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

// Initialize GridFS bucket
let gfs;
mongoose.connection.once("open", () => {
  gfs = new GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
});

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
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
      html: mail.html.replace("{name}", recipient.firstName || "User"),
    },
  };

  try {
    const response = await axios.post(RUSENDER_API, emailData, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.RUSENDER_API_KEY,
      },
    });

    return { email: recipient.email, status: "Success", data: response.data };
  } catch (error) {
    return { email: recipient.email, status: "Failed", error: error.message };
  }
};

// Function to choose email template with Registration Type & Category
const getEmailTemplate = (lang, user, courseName, package) => {
  if (lang === "ru") {
    return {
      subject: `${courseName}. Регистрация`,
      html: `
              <p>${user.personalDetails.title} ${
        user.personalDetails.lastName
      } ${user.personalDetails.firstName} ${
        user.personalDetails.middleName
      },</p>
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
          `,
    };
  } else {
    return {
      subject: `${courseName}. Registration`,
      html: `
              <p>${user.personalDetails.title} ${
        user.personalDetails.firstName
      } ${user.personalDetails.middleName} ${user.personalDetails.lastName},</p>
              <br>
              Thank you for registering for <strong>${courseName}</strong>, which will be held in Arkhangelsk from June 13 to 17, 2025.
              <p><strong>You have registered for the category:</strong> ${
                package || "N/A"
              }</p>

              <p>We look forward to your participation. Stay tuned for further details. If you have any questions, feel free to contact us at <a href="mailto:travel@eafo.info">travel@eafo.info</a>.</p>

              <p><strong>Important Information:</strong> If you have registered in any of the categories except competitive, we will send you the invoice within 48 hours. Please arrange the payment within 3 weekdays and send the bank confirmation of payment by email to <a href="mailto:travel@eafo.info">travel@eafo.info</a>.</p>

              <p>If you have not received an email, please check the Spam folder.</p>

              <p>To access the scheduled online events, please log in to your EAFO account:</p>
              <a href="https://testui.eafo.info">Go to Dashboard</a>

              <p>Best regards,</p>
              <p>Team EAFO</p>
          `,
    };
  }
};

const template1EmailTemplate = (lang, user) => {
  const {
    title = "",
    firstName = "",
    middleName = "",
    lastName = "",
    gender = "",
    package: packageName = "",
    price = "",
    submissionDate = "",
  } = user.personalDetails || {};

  const fullName =
    lang === "ru"
      ? `${title} ${lastName} ${firstName} ${middleName}`.trim()
      : `${title} ${firstName} ${lastName}`.trim();

  const salutation =
    gender?.toLowerCase() === "female" || gender?.toLowerCase() === "женский"
      ? "Уважаемая"
      : "Уважаемый";

  if (lang === "ru") {
    return {
      subject: `Заявка на Конкурсное участие`,
      html: `
        <p><strong>${salutation} ${firstName} ${middleName}!</strong></p>

        <p>Заявка на <strong>Конкурсное участие в XI EAFO Базовых медицинских курсах по онкологии и онкопатологии</strong> находится на рассмотрении!</p>

        <p>Вы выбрали следующую категорию и пакет участия:</p>
        <ul>
          <li>Категория участия:<strong>Конкурсное участие</strong></li>
          <li>Пакет участия:<strong>${packageName}</strong></li>
          <li>Дата подачи заявки:<strong>${submissionDate}</strong></li>
          <li>Стоимость участия:<strong>${price}</strong></li>
        </ul>

        <p><strong>После проверки заявки мы направим персональную ссылку для прохождения вступительного тестирования,</strong> необходимого для конкурсного отбора.</p>

        <p>Вы можете прикрепить дополнительные документы к заявке через <strong>личный кабинет <a href="https://www.eafo.info" target="_blank">EAFO</a></strong></p>

        <p> Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p> Техническая поддержка: basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p>С уважением,<br>команда EAFO</p>
      `,
    };
  }

  // English version (if needed, can be adjusted similarly)
  return {
    subject: `Confirmation of Registration Form Submission for the XI EAFO Basic Medical Course`,
    html: `<p><strong>Dear ${firstName} ${lastName},</strong></p>
      <p>Your application for Competitive participation in the XI EAFO Basic Medical Course is under review.</p>
      <p><strong>Participation details:</strong></p>
      <ul>
        <li><strong>Category:</strong> Competitive</li>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Submission Date:</strong> ${submissionDate}</li>
        <li><strong>Price:</strong> ${price}</li>
      </ul>
      <p>We’ll send you a testing link and instructions soon. Thank you for registering!</p>
      <p>Best regards,<br/>EAFO Organizing Committee</p>`,
  };
};


const template2EmailTemplate = (lang, user) => {
  const {
    title = "",
    firstName = "",
    middleName = "",
    lastName = "",
    gender = "",
    package: packageName = "",
    price = "",
    submissionDate = "",
  } = user.personalDetails || {};

  const fullName =
    lang === "ru"
      ? `${title} ${lastName} ${firstName} ${middleName}`.trim()
      : `${title} ${firstName} ${middleName} ${lastName}`.trim();

  const salutation =
    gender?.toLowerCase() === "female" || gender?.toLowerCase() === "женский"
      ? "Уважаемая"
      : "Уважаемый";

  if (lang === "ru") {
    return {
      subject: `Заявка на Льготное внеконкурсное участие`,
      html: `
        <p><strong>${salutation} ${firstName} ${middleName}!</strong></p>

        <p>Заявка на <strong>Льготное внеконкурсное участие в XI EAFO Базовых медицинских курсах по онкологии и онкопатологии</strong> находится на рассмотрении!</p>

        <p>Вы выбрали следующую категорию и пакет участия:</p>

        <ul>
          <li>Категория участия:<strong>Льготное Внеконкурсное участие</strong></li>
          <li>Пакет участия:<strong>${packageName}</strong></li>
          <li>Дата подачи заявки:<strong>${submissionDate}</strong></li>
          <li>Стоимость участия:<strong>${price}</strong></li>
        </ul>


        <p><strong>В течение 48 часов после обработки заявки мы направим  счёт для оплаты в отдельном письме.</strong></p>

        <p> Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p> Техническая поддержка: basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>
        
        <p>С уважением,<br>Организационный комитет EAFO</p>
      `,
    };
  }

  return {
    subject: `Confirmation of Registration Form Submission for the XI EAFO Basic Medical Course`,
    html: `
      <p><strong>Dear ${firstName} ${lastName},</strong></p>

      <p>Your application for the subsidized non-competitive participation has been received successfully.</p>

      <p><strong>Participation details:</strong></p>
      <ul>
        <li><strong>Category:</strong> Subsidized Non-competitive Participation</li>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Submission Date:</strong> ${submissionDate}</li>
        <li><strong>Price:</strong> ${price}</li>
      </ul>

      <p>Please upload proof of study/employment in a public or non-profit institution and your passport copy to the “Documents” section of your EAFO account. Submitting other documents (CV, letter, etc.) is optional but highly encouraged — we’d love to get to know your background!</p>

      <p style="color:#0000ff"><strong>Recommendations for Letter of Motivation and Resume:</strong></p>
      <p><strong style="text-decoration:underline">Letter of Motivation</strong><br>
      Explain why you want to join the course and how it can benefit your career. Share your values, skills, and interests. English or Russian language accepted.</p>
      <p><strong style="text-decoration:underline">Resume (CV)</strong><br>
      Include publications, conferences, work/study experience. Accepted in English, Russian, or both.</p>

      <p><strong style="color:#cc0000">Important:</strong> Payment must be completed <strong style="color:#cc0000">within 72 hours</strong> of this message. A separate email with payment link will arrive from <a href="mailto:eafo@e-registrar.org">eafo@e-registrar.org</a>. Check your spam folder.</p>

      <p>If you have questions, contact us at: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or +7 (931) 111-22-55</p>
      <p>Technical support: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

      <p><strong>We look forward to seeing you at the Courses!</strong></p>

      <p>Best regards,<br>Organizing Committee of the XI Basic Medical Courses – 2025</p>
    `,
  };
};


const template3EmailTemplate = (lang, user) => {
  const {
    title = "",
    firstName = "",
    middleName = "",
    lastName = "",
    gender = "",
    package: packageName = "",
    price = "",
    submissionDate = "",
  } = user.personalDetails || {};

  const fullName =
    lang === "ru"
      ? `${title} ${lastName} ${firstName} ${middleName}`.trim()
      : `${title} ${firstName} ${middleName} ${lastName}`.trim();

  const salutation =
    gender?.toLowerCase() === "female" || gender?.toLowerCase() === "женский"
      ? "Уважаемая"
      : "Уважаемый";

  if (lang === "ru") {
    return {
      subject: `Заявка на Льготное внеконкурсное участие`,
      html: `
        <p><strong>${salutation} ${firstName} ${middleName}!</strong></p>

        <p>Заявка на <strong>Льготное внеконкурсное участие в XI EAFO Базовых медицинских курсах по онкологии и онкопатологии</strong> находится на рассмотрении!</p>

        <p>Вы выбрали следующую категорию и пакет участия:</p>

        <ul>
          <li>Категория участия:<strong>Льготное Внеконкурсное участие</strong></li>
          <li>Пакет участия:<strong>${packageName}</strong></li>
          <li>Дата подачи заявки:<strong>${submissionDate}</strong></li>
          <li>Стоимость участия:<strong>${price}</strong></li>
        </ul>

        <p><strong>В течение 48 часов после обработки заявки c Вами свяжется наш сотрудник, чтобы уточнить детали по проживанию.</strong></p>

        <p> Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p> Техническая поддержка: basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p>С уважением,<br>Организационный комитет EAFO</p>
      `,
    };
  }

  return {
    subject: `Confirmation of Registration Form Submission for the XI EAFO Basic Medical Course`,
    html: `
      <p><strong>Dear ${firstName} ${lastName},</strong></p>

      <p>Your application for the subsidized non-competitive participation has been received successfully.</p>

      <p><strong>Participation details:</strong></p>
      <ul>
        <li><strong>Category:</strong> Subsidized Non-competitive Participation</li>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Submission Date:</strong> ${submissionDate}</li>
        <li><strong>Price:</strong> ${price}</li>
      </ul>

      <p>Please upload proof of study/employment in a public or non-profit institution and your passport copy to the “Documents” section of your EAFO account. Submitting other documents (CV, letter, etc.) is optional but highly encouraged — we’d love to get to know your background!</p>

      <p style="color:#0000ff"><strong>Recommendations for Letter of Motivation and Resume:</strong></p>
      <p><strong style="text-decoration:underline">Letter of Motivation</strong><br>
      Explain why you want to join the course and how it can benefit your career. Share your values, skills, and interests. English or Russian language accepted.</p>
      <p><strong style="text-decoration:underline">Resume (CV)</strong><br>
      Include publications, conferences, work/study experience. Accepted in English, Russian, or both.</p>

      <p><strong style="color:#cc0000">Important:</strong> Payment must be completed <strong style="color:#cc0000">within 72 hours</strong> of this message. A separate email with payment link will arrive from <a href="mailto:eafo@e-registrar.org">eafo@e-registrar.org</a>. Check your spam folder.</p>

      <p>If you have questions, contact us at: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or +7 (931) 111-22-55</p>
      <p>Technical support: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

      <p><strong>We look forward to seeing you at the Courses!</strong></p>

      <p>Best regards,<br>Organizing Committee of the XI Basic Medical Courses – 2025</p>
    `,
  };
};

const template4EmailTemplate = (lang, user) => {
  const {
    title = "",
    firstName = "",
    middleName = "",
    lastName = "",
    gender = "",
    package: packageName = "",
    price = "",
    submissionDate = "",
  } = user.personalDetails || {};

  const fullName =
    lang === "ru"
      ? `${title} ${lastName} ${firstName} ${middleName}`.trim()
      : `${title} ${firstName} ${middleName} ${lastName}`.trim();

  const salutation =
    gender?.toLowerCase() === "female" || gender?.toLowerCase() === "женский"
      ? "Уважаемая"
      : "Уважаемый";

  if (lang === "ru") {
    return {
      subject: `Заявка на Внеконкурсное участие (полная стоимость)`,
      html: `
        <p><strong>${salutation} ${firstName} ${middleName}!</strong></p>

        <p>Заявка на <strong>Внеконкурсное участие (полная стоимость) в XI EAFO Базовых медицинских курсах по онкологии и онкопатологии</strong> находится на рассмотрении!</p>

        <p>Вы выбрали следующую категорию и пакет участия:</p>

        <ul>
          <li>Категория участия:<strong>Льготное Внеконкурсное участие</strong></li>
          <li>Пакет участия:<strong>${packageName}</strong></li>
          <li>Дата подачи заявки:<strong>${submissionDate}</strong></li>
          <li>Стоимость участия:<strong>${price}</strong></li>
        </ul>

        <p><strong>В течение 48 часов после обработки заявки мы направим  счёт для оплаты в отдельном письме.</strong></p>

        <p> Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p> Техническая поддержка: basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p>С уважением,<br>Организационный комитет EAFO</p>
      `,
    };
  }

  return {
    subject: `Confirmation of Registration Form Submission for the XI EAFO Basic Medical Course`,
    html: `
      <p><strong>Dear ${firstName} ${lastName},</strong></p>

      <p>Your application for the subsidized non-competitive participation has been received successfully.</p>

      <p><strong>Participation details:</strong></p>
      <ul>
        <li><strong>Category:</strong> Subsidized Non-competitive Participation</li>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Submission Date:</strong> ${submissionDate}</li>
        <li><strong>Price:</strong> ${price}</li>
      </ul>

      <p>Please upload proof of study/employment in a public or non-profit institution and your passport copy to the “Documents” section of your EAFO account. Submitting other documents (CV, letter, etc.) is optional but highly encouraged — we’d love to get to know your background!</p>

      <p style="color:#0000ff"><strong>Recommendations for Letter of Motivation and Resume:</strong></p>
      <p><strong style="text-decoration:underline">Letter of Motivation</strong><br>
      Explain why you want to join the course and how it can benefit your career. Share your values, skills, and interests. English or Russian language accepted.</p>
      <p><strong style="text-decoration:underline">Resume (CV)</strong><br>
      Include publications, conferences, work/study experience. Accepted in English, Russian, or both.</p>

      <p><strong style="color:#cc0000">Important:</strong> Payment must be completed <strong style="color:#cc0000">within 72 hours</strong> of this message. A separate email with payment link will arrive from <a href="mailto:eafo@e-registrar.org">eafo@e-registrar.org</a>. Check your spam folder.</p>

      <p>If you have questions, contact us at: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or +7 (931) 111-22-55</p>
      <p>Technical support: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

      <p><strong>We look forward to seeing you at the Courses!</strong></p>

      <p>Best regards,<br>Organizing Committee of the XI Basic Medical Courses – 2025</p>
    `,
  };
};


const template5EmailTemplate = (lang, user) => {
  const {
    title = "",
    firstName = "",
    middleName = "",
    lastName = "",
    gender = "",
    package: packageName = "",
    price = "",
    submissionDate = "",
  } = user.personalDetails || {};

  const fullName =
    lang === "ru"
      ? `${title} ${lastName} ${firstName} ${middleName}`.trim()
      : `${title} ${firstName} ${middleName} ${lastName}`.trim();

  const salutation =
    gender?.toLowerCase() === "female" || gender?.toLowerCase() === "женский"
      ? "Уважаемая"
      : "Уважаемый";

  if (lang === "ru") {
    return {
      subject: `Заявка на Внеконкурсное участие (полная стоимость)`,
      html: `
        <p><strong>${salutation} ${firstName} ${middleName}!</strong></p>

        <p>Заявка на <strong>Внеконкурсное участие (полная стоимость) в XI EAFO Базовых медицинских курсах по онкологии и онкопатологии</strong> находится на рассмотрении!</p>

        <p>Вы выбрали следующую категорию и пакет участия:</p>

        <ul>
          <li>Категория участия:<strong>Льготное Внеконкурсное участие</strong></li>
          <li>Пакет участия:<strong>${packageName}</strong></li>
          <li>Дата подачи заявки:<strong>${submissionDate}</strong></li>
          <li>Стоимость участия:<strong>${price}</strong></li>
        </ul>
         
        <p><strong>В течение 48 часов после обработки заявки c Вами свяжется наш сотрудник, чтобы уточнить детали по проживанию.</strong></p>

        <p>Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p>Техническая поддержка: basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>
 
        <p>С уважением,<br>Организационный комитет EAFO</p>
      `,
    };
  }

  return {
    subject: `Confirmation of Registration Form Submission for the XI EAFO Basic Medical Course`,
    html: `
      <p><strong>Dear ${firstName} ${lastName},</strong></p>

      <p>Your application for the subsidized non-competitive participation has been received successfully.</p>

      <p><strong>Participation details:</strong></p>
      <ul>
        <li><strong>Category:</strong> Subsidized Non-competitive Participation</li>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Submission Date:</strong> ${submissionDate}</li>
        <li><strong>Price:</strong> ${price}</li>
      </ul>

      <p>Please upload proof of study/employment in a public or non-profit institution and your passport copy to the “Documents” section of your EAFO account. Submitting other documents (CV, letter, etc.) is optional but highly encouraged — we’d love to get to know your background!</p>

      <p style="color:#0000ff"><strong>Recommendations for Letter of Motivation and Resume:</strong></p>
      <p><strong style="text-decoration:underline">Letter of Motivation</strong><br>
      Explain why you want to join the course and how it can benefit your career. Share your values, skills, and interests. English or Russian language accepted.</p>
      <p><strong style="text-decoration:underline">Resume (CV)</strong><br>
      Include publications, conferences, work/study experience. Accepted in English, Russian, or both.</p>

      <p><strong style="color:#cc0000">Important:</strong> Payment must be completed <strong style="color:#cc0000">within 72 hours</strong> of this message. A separate email with payment link will arrive from <a href="mailto:eafo@e-registrar.org">eafo@e-registrar.org</a>. Check your spam folder.</p>

      <p>If you have questions, contact us at: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or +7 (931) 111-22-55</p>
      <p>Technical support: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

      <p><strong>We look forward to seeing you at the Courses!</strong></p>

      <p>Best regards,<br>Organizing Committee of the XI Basic Medical Courses – 2025</p>
    `,
  };
};

const template6EmailTemplate = (lang, user) => {
  const {
    title = "",
    firstName = "",
    middleName = "",
    lastName = "",
    gender = "",
    package: packageName = "",
    price = "",
    submissionDate = "",
    seminarAnswers = [], // array of selected seminars
  } = user.personalDetails || {};

  const fullName =
    lang === "ru"
      ? `${title} ${lastName} ${firstName} ${middleName}`.trim()
      : `${title} ${firstName} ${middleName} ${lastName}`.trim();

  const salutation =
    gender?.toLowerCase() === "female" || gender?.toLowerCase() === "женский"
      ? "Уважаемая"
      : "Уважаемый";

  const seminarCount = seminarAnswers.length;

  // Extract number from price string (e.g., "2000 RUB")
  const priceMatch = typeof price === "string" ? price.match(/([\d.]+)\s?(\w+)/) : null;
  let totalPrice = price;
  let pricePerSeminar = 0;
  let currency = "";

  if (priceMatch && seminarCount > 0) {
    pricePerSeminar = parseFloat(priceMatch[1]);
    currency = priceMatch[2];
    totalPrice = `${pricePerSeminar * seminarCount} ${currency}`;
  }

  const formattedSeminarAnswers =
    Array.isArray(seminarAnswers) && seminarAnswers.length
      ? `<p><strong>${lang === "ru" ? "Выбранные семинары:" : "Selected Seminar Topics:"}</strong></p><p>` +
        seminarAnswers
          .map((a) => `«${a}» (${lang === "ru" ? "1 день" : "1 day"})`)
          .join("<br/>") +
        `</p>`
      : "";

  if (lang === "ru") {
    return {
      subject: `Заявка на участие в тематических Семинарах`,
      html: `
        <p><strong>${salutation} ${firstName} ${middleName}!</strong></p>

        <p>Заявка на <strong>участие в тематических Семинарах в XI EAFO Базовых медицинских курсах по онкологии и онкопатологии</strong> находится на рассмотрении!</p>
        
        <p>Вы выбрали следующий/ие семинар/ы и пакет участия:</p>

        <p>Категория участия: Участие в тематическом Семинаре</p>
        <p>Выбранный(е) Семинар(ы):</p>

        ${formattedSeminarAnswers}
        
        <p>Пакет участия:<strong> ${packageName}</strong></p>
        <p>Дата подачи заявки:<strong> ${submissionDate}</strong></p>

        <p><strong>В течение 48 часов после обработки заявки мы направим  счёт для оплаты в отдельном письме.</strong></p>

        <p>Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p>Техническая поддержка: basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>
 
        <p>С уважением,<br>Организационный комитет EAFO</p>
      `,
    };
  }

  return {
    subject: `Confirmation of Registration Form Submission for the XI EAFO Basic Medical Course`,
    html: `
      <p><strong>Dear ${firstName} ${lastName},</strong></p>

      <p>Your application for the subsidized non-competitive participation has been received successfully.</p>

      ${formattedSeminarAnswers}

      <p><strong>Submission Date:</strong> ${submissionDate}</p>
      <p><strong>Total Price:</strong> ${totalPrice}</p>

      <p>Please upload proof of study/employment in a public or non-profit institution and your passport copy to the “Documents” section of your EAFO account. Submitting other documents (CV, letter, etc.) is optional but highly encouraged — we’d love to get to know your background!</p>

      <p style="color:#0000ff"><strong>Recommendations for Letter of Motivation and Resume:</strong></p>
      <p><strong style="text-decoration:underline">Letter of Motivation</strong><br>
      Explain why you want to join the course and how it can benefit your career. Share your values, skills, and interests. English or Russian language accepted.</p>
      <p><strong style="text-decoration:underline">Resume (CV)</strong><br>
      Include publications, conferences, work/study experience. Accepted in English, Russian, or both.</p>

      <p><strong style="color:#cc0000">Important:</strong> Payment must be completed <strong style="color:#cc0000">within 72 hours</strong> of this message. A separate email with payment link will arrive from <a href="mailto:eafo@e-registrar.org">eafo@e-registrar.org</a>. Check your spam folder.</p>

      <p>If you have questions, contact us at: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or +7 (931) 111-22-55</p>
      <p>Technical support: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

      <p><strong>We look forward to seeing you at the Courses!</strong></p>

      <p>Best regards,<br>Organizing Committee of the XI Basic Medical Courses – 2025</p>
    `,
  };
};

const template7EmailTemplate = (lang, user) => {
  const {
    title = "",
    firstName = "",
    middleName = "",
    lastName = "",
    gender = "",
    package: packageName = "",
    price = "",
    submissionDate = "",
    seminarAnswers = [], // expected as array
  } = user.personalDetails || {};

  const fullName =
    lang === "ru"
      ? `${title} ${lastName} ${firstName} ${middleName}`.trim()
      : `${title} ${firstName} ${middleName} ${lastName}`.trim();

  const salutation =
    gender?.toLowerCase() === "female" || gender?.toLowerCase() === "женский"
      ? "Уважаемая"
      : "Уважаемый";

  const formattedSeminarAnswers =
    Array.isArray(seminarAnswers) && seminarAnswers.length
      ? `<p><strong>${lang === "ru" ? "Выбранные семинары:" : "Selected Seminar Topics:"}</strong></p><p>` +
        seminarAnswers
          .map((a) => `«${a}»`)
          .join("<br/>") +
        `</p>`
      : "";

  if (lang === "ru") {
    return {
      subject: `Заявка на участие в тематических Семинарах`,
      html: `
        <p><strong>${salutation} ${firstName} ${middleName}!</strong></p>

        <p>Заявка на <strong>участие в тематических Семинарах в XI EAFO Базовых медицинских  курсах по онкологии и онкопатологии</strong> находится на рассмотрении!</p>
        
        <p>Вы выбрали следующий/ие семинар/ы и пакет участия:</p>

        <p>Категория участия: Участие в тематическом Семинаре</p>
        <p>Выбранный(е) Семинар(ы):</p>

        ${formattedSeminarAnswers}
        
        <p>Пакет участия:<strong> ${packageName}</strong></p>
        <p>Дата подачи заявки:<strong> ${submissionDate}</strong></p>

        <p><strong>В течение 48 часов после обработки заявки c Вами свяжется наш сотрудник, чтобы уточнить детали по проживанию.</strong></p>

        <p>Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

        <p>Техническая поддержка: support@eafo.info</p>
 
        <p>С уважением,<br>Организационный комитет EAFO</p>
      `,
    };
  }

  return {
    subject: `Confirmation of Registration Form Submission for the XI EAFO Basic Medical Course`,
    html: `
      <p><strong>Dear ${firstName} ${lastName},</strong></p>

      <p>Your application for the subsidized non-competitive participation has been received successfully.</p>

      <p><strong>Participation details:</strong></p>
      <ul>
        <li><strong>Category:</strong> Subsidized Non-competitive Participation</li>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Submission Date:</strong> ${submissionDate}</li>
        <li><strong>Price:</strong> ${price}</li>
      </ul>

      ${formattedSeminarAnswers}

      <p>Please upload proof of study/employment in a public or non-profit institution and your passport copy to the “Documents” section of your EAFO account. Submitting other documents (CV, letter, etc.) is optional but highly encouraged — we’d love to get to know your background!</p>

      <p style="color:#0000ff"><strong>Recommendations for Letter of Motivation and Resume:</strong></p>
      <p><strong style="text-decoration:underline">Letter of Motivation</strong><br>
      Explain why you want to join the course and how it can benefit your career. Share your values, skills, and interests. English or Russian language accepted.</p>
      <p><strong style="text-decoration:underline">Resume (CV)</strong><br>
      Include publications, conferences, work/study experience. Accepted in English, Russian, or both.</p>

      <p><strong style="color:#cc0000">Important:</strong> Payment must be completed <strong style="color:#cc0000">within 72 hours</strong> of this message. A separate email with payment link will arrive from <a href="mailto:eafo@e-registrar.org">eafo@e-registrar.org</a>. Check your spam folder.</p>

      <p>If you have questions, contact us at: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or +7 (931) 111-22-55</p>
      <p>Technical support: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

      <p><strong>We look forward to seeing you at the Courses!</strong></p>

      <p>Best regards,<br>Organizing Committee of the XI Basic Medical Courses – 2025</p>
    `,
  };
};

async function sendRegistrationEmail(user, form, linkedItemDetails, submission, extras = {}) {
  if (!submission || !submission.responses) {
    console.error(`Missing submission data for user ${user.email}`);
    console.debug("Submission object received:", submission);
    return;
  }

  const invoiceAnswerRaw = submission.responses
    .find((r) => r.isUsedForInvoice)
    ?.answer?.trim();

  if (!invoiceAnswerRaw) {
    console.warn(`No invoice-related answer found for user ${user.email}. Defaulting to sponsored email.`);
  } else {
    console.log(`Invoice answer: "${invoiceAnswerRaw}" for user ${user.email}`);
  }

  // ✅ Support array or object
  const firstPackageName =
    extras.package ||
    (Array.isArray(linkedItemDetails)
      ? linkedItemDetails[0]?.name
      : linkedItemDetails?.name) ||
    "Package 1";

  console.log(`Detected package: "${firstPackageName}"`);

  // 🎯 Package groups
  const template1Packages = [
    "Конкурсное участие Тариф 1 Пакет 1",
    "Конкурсное участие Тариф 1 Пакет 2",
    "Конкурсное участие Тариф 1 Пакет 3",
    "Конкурсное участие Тариф 1 Пакет 4",
    "Конкурсное участие Тариф 1 Пакет 5",
    "Конкурсное участие Тариф 1 Пакет 6",
  ];
  const template2Packages = [
    "Льготное внеконкурсное участие Тариф 1 Пакет 7",
    "Льготное внеконкурсное участие Тариф 1 Пакет 12",
  ];
  const template3Packages = [
    "Льготное внеконкурсное участие Тариф 1 Пакет 8",
    "Льготное внеконкурсное участие Тариф 1 Пакет 9",
    "Льготное внеконкурсное участие Тариф 1 Пакет 10",
    "Льготное внеконкурсное участие Тариф 1 Пакет 11",
  ];
  const template4Packages = [
    "Внеконкурсное участие (полная стоимость) Тариф 1 Пакет 13",
    "Внеконкурсное участие (полная стоимость) Тариф 1  Пакет 18",
  ];
  const template5Packages = [
    "Внеконкурсное участие (полная стоимость) Тариф 1 Пакет 14",
    "Внеконкурсное участие (полная стоимость) Тариф 1 Пакет 15",
    "Внеконкурсное участие (полная стоимость) Тариф 1  Пакет 16",
    "Внеконкурсное участие (полная стоимость) Тариф 1  Пакет 17",
  ];

  // 🎯 Detect template group
  const template1 = template1Packages.includes(firstPackageName);
  const template2 = template2Packages.includes(firstPackageName);
  const template3 = template3Packages.includes(firstPackageName);
  const template4 = template4Packages.includes(firstPackageName);
  const template5 = template5Packages.includes(firstPackageName);

  const lang = form.isUsedForRussian ? "ru" : "en";
  console.log(`🌐 Language selected: ${lang}`);

  const extendedUser = {
    ...user,
    personalDetails: {
      ...user.personalDetails,
      package: firstPackageName,
      price:
        extras.price ||
        (Array.isArray(linkedItemDetails)
          ? `${linkedItemDetails[0]?.amount || ""} ${linkedItemDetails[0]?.currency || ""}`
          : linkedItemDetails?.amount && linkedItemDetails?.currency
          ? `${linkedItemDetails.amount} ${linkedItemDetails.currency}`
          : ""),
      submissionDate:
        extras.submissionDate || new Date().toLocaleDateString("ru-RU"),
    },
  };

  let conditionalTemplateMatch = null;

  // 🧠 Conditional YES/NO template logic
  const conditionalTemplates = [
    {
      questionId: "683b4e5153716bcccf4bd2dd",
      conditions: [
        { answer: "Да", template: template6EmailTemplate, label: "template6 (yes)" },
        { answer: "Нет", template: template7EmailTemplate, label: "template7 (no)" },
      ],
    },
    {
      questionId: "683cba4d53716bcccf4db693",
      conditions: [
        { answer: "Yes", template: template6EmailTemplate, label: "template6 (yes)" },
        { answer: "No", template: template7EmailTemplate, label: "template7 (no)" },
      ],
    },
  ];

  for (const rule of conditionalTemplates) {
    const matchedResponse = submission.responses.find(
      (r) => r.questionId === rule.questionId
    );
    if (matchedResponse && matchedResponse.answer) {
      const normalized = matchedResponse.answer.trim().toLowerCase();
      const match = rule.conditions.find((c) => c.answer.toLowerCase() === normalized);
      if (match) {
        conditionalTemplateMatch = match;
        break;
      }
    }
  }

  // 🎓 Seminar logic
  if (
    firstPackageName === "Участие в тематических Семинарах Пакет 19" ||
    firstPackageName === "Участие в тематических Семинарах Пакет 20"
  ) {
    const seminarQuestionId =
      lang === "ru" ? "683b4dec53716bcccf4bc4ee" : "683cba0153716bcccf4da31e";

    const seminarResponse = submission.responses.find(
      (r) => r.questionId === seminarQuestionId
    );

    const answersArray = Array.isArray(seminarResponse?.answer)
      ? seminarResponse.answer
      : seminarResponse?.answer
      ? [seminarResponse.answer]
      : [];

    const normalizedAnswers = answersArray.map((a) => a.trim().toLowerCase());

    console.log(`📋 Seminar response for user ${user.email}:`);
    console.log(`🔸 Raw:`, seminarResponse?.answer);
    console.log(`🔸 Normalized:`, normalizedAnswers);

    if (firstPackageName === "Участие в тематических Семинарах Пакет 19") {
      if (normalizedAnswers.includes("да") || normalizedAnswers.includes("yes")) {
        conditionalTemplateMatch = {
          template: (lang, user) =>
            template6EmailTemplate(lang, {
              ...user,
              personalDetails: {
                ...user.personalDetails,
                seminarAnswers: answersArray,
              },
            }),
          label: "template6 (Seminar 19 - yes)",
        };
      } else if (normalizedAnswers.includes("нет") || normalizedAnswers.includes("no")) {
        conditionalTemplateMatch = {
          template: (lang, user) =>
            template7EmailTemplate(lang, {
              ...user,
              personalDetails: {
                ...user.personalDetails,
                seminarAnswers: answersArray,
              },
            }),
          label: "template7 (Seminar 19 - no)",
        };
      }
    } else if (firstPackageName === "Участие в тематических Семинарах Пакет 20") {
      conditionalTemplateMatch = {
        template: (lang, user) =>
          template6EmailTemplate(lang, {
            ...user,
            personalDetails: {
              ...user.personalDetails,
              seminarAnswers: answersArray,
            },
          }),
        label: "template6 (Seminar 20 - auto)",
      };
    }
  }

  // 📤 Select template
  let emailTemplate;

  if (template1) {
    console.log("📨 Using competitive email template");
    emailTemplate = template1EmailTemplate(lang, extendedUser);
  } else if (template2) {
    console.log("📨 Using subsidized email template");
    emailTemplate = template2EmailTemplate(lang, extendedUser);
  } else if (template3) {
    console.log("📨 Using non-competitive email template (template3)");
    emailTemplate = template3EmailTemplate(lang, extendedUser);
  } else if (template4) {
    console.log("📨 Using non-competitive email template (template4)");
    emailTemplate = template4EmailTemplate(lang, extendedUser);
  } else if (template5) {
    console.log("📨 Using non-competitive email template (template5)");
    emailTemplate = template5EmailTemplate(lang, extendedUser);
  } else if (conditionalTemplateMatch) {
    console.log(`📨 Using conditional email template: ${conditionalTemplateMatch.label}`);
    emailTemplate = conditionalTemplateMatch.template(lang, extendedUser);
  } else {
    console.warn(
      `⚠️ No template match for package "${firstPackageName}". Using sponsored fallback.`
    );
    emailTemplate = getSponsoredParticipationEmailTemplate(lang, extendedUser);
  }

  if (!emailTemplate) {
    console.error(`❌ No email template generated for user ${user.email}`);
    return;
  }

  try {
    await sendEmailRusender(
      { email: user.email, firstName: user.firstName },
      emailTemplate
    );
    console.log(`✅ Registration email sent to ${user.email}`);
  } catch (err) {
    console.error(`❌ Failed to send registration email to ${user.email}:`, err.message);
  }
}




// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error("Please upload an image (jpg, jpeg, or png)"));
    }
    cb(null, true);
  },
});

// Upload form logo
router.post(
  "/:id/upload",
  authenticateJWT,
  upload.single("image"),
  async (req, res) => {
    try {
      const form = await Form.findById(req.params.id);
      if (!form) {
        return res.status(404).send({ error: "Form not found" });
      }

      form.formLogo = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };

      await form.save();
      res.send({
        message: "Image uploaded successfully",
        imageData: form.formLogo.data.toString("base64"),
        contentType: form.formLogo.contentType,
      });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  }
);

// Get form logo image
router.get("/:id/image", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form || !form.formLogo) {
      return res.status(404).send();
    }

    res.set("Content-Type", form.formLogo.contentType);
    res.send(form.formLogo.data);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

//  Create a New Form or Duplicate an Existing Form
router.post("/", authenticateJWT, async (req, res) => {
  const { formName, duplicateFrom } = req.body;

  if (!formName || formName.trim() === "") {
    return res.status(400).json({ message: "Form name is required." });
  }

  try {
    let newForm = new Form({ formName, questions: [] });

    if (duplicateFrom) {
      const originalForm = await Form.findById(duplicateFrom).populate(
        "questions"
      );

      if (!originalForm) {
        return res.status(404).json({ message: "Original form not found." });
      }

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
          rules: question.rules
            ? JSON.parse(JSON.stringify(question.rules))
            : [], // Deep copy rules
        });

        // Save the cloned question
        const savedQuestion = await newQuestion.save();
        if (!savedQuestion) {
          return res
            .status(500)
            .json({ message: "Failed to clone some questions." });
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
                condition.triggerQuestionId =
                  idMapping[condition.triggerQuestionId]; // ✅ Update triggerQuestionId
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

    await newForm.save();

    res.status(201).json({ form: newForm });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while creating the form." });
  }
});

//  Get All Forms (Only Name & ID)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const forms = await Form.find(); // Fetch all forms
    res.json({ forms }); // Return as { forms: [...] }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🟢 Fetch Form by _id
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id).populate("questions");
    if (!form) return res.status(404).json({ message: "Form not found" });

    res.json(form);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Import Form model

// Update Form and Link to Course
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const updateData = {};

    //Update text fields only if provided
    if (req.body.formName) {
      updateData.formName = req.body.formName;
    }
    if (req.body.description) {
      updateData.description = req.body.description;
    }
    if (req.body.title) {
      updateData.title = req.body.title;
    }

    // Handle course assignment/removal
    if (req.body.courseId === "") {
      updateData.courseId = null; // Remove course assignment
    } else if (req.body.courseId) {
      updateData.courseId = req.body.courseId;
    }

    // Handle boolean fields explicitly
    if (typeof req.body.isUsedForRussian !== "undefined") {
      updateData.isUsedForRussian = req.body.isUsedForRussian;
    }
    if (typeof req.body.isUsedForRegistration !== "undefined") {
      updateData.isUsedForRegistration = req.body.isUsedForRegistration;
    }

    // Update the form in the database
    const updatedForm = await Form.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedForm) {
      console.log("Form not found");
      return res.status(404).json({ message: "Form not found" });
    }

    // Remove form from any previous course
    const removeResult = await Course.updateMany(
      { "forms.formId": updatedForm._id },
      { $pull: { forms: { formId: updatedForm._id } } }
    );

    // Link form to new course if provided
    if (req.body.courseId) {
      const course = await Course.findById(req.body.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const existingFormIndex = course.forms.findIndex(
        (f) => f.formId.toString() === updatedForm._id.toString()
      );

      const formData = {
        formId: updatedForm._id,
        formName: updatedForm.formName,
        isUsedForRussian: updatedForm.isUsedForRussian, // ✅ Added boolean field
        isUsedForRegistration: updatedForm.isUsedForRegistration, // ✅ Added boolean field
      };

      if (existingFormIndex === -1) {
        course.forms.push(formData);
      } else {
        // ✅ Update existing form data, including booleans
        course.forms[existingFormIndex] = formData;
      }

      await course.save();
    }

    // ✅ Return updated form
    res.json({ form: updatedForm });
  } catch (error) {
    console.error("Error updating form:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a Form (and its Questions)
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

router.post(
  "/:id/upload",
  authenticateJWT,
  upload.single("image"),
  async (req, res) => {
    try {
      const form = await Form.findById(req.params.id);
      if (!form) return res.status(404).json({ message: "Form not found" });

      // Save Image Path in Form
      const fileExt = path.extname(req.file.originalname);
      form.image = `/uploads/${form._id}_logo${fileExt}`;
      await form.save();

      res.json({
        message: "Image uploaded successfully",
        imageUrl: form.image,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Server error!" });
    }
  }
);

router.post("/:formId/questions", authenticateJWT, async (req, res) => {
  try {
    const { formId } = req.params;
    const { label, type, options, rules } = req.body;

    const updatedForm = await Form.findByIdAndUpdate(
      formId,
      { $push: { questions: { label, type, options, rules } } },
      { new: true, runValidators: true }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: "Form not found" });
    }

    res
      .status(201)
      .json({ message: "Question added successfully", form: updatedForm });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:formId/questions", authenticateJWT, async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId);

    if (!form) return res.status(404).json({ message: "Form not found" });

    res.status(200).json(form.questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put(
  "/:formId/questions/:questionId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { formId, questionId } = req.params;
      const updateData = req.body;

      const form = await Form.findById(formId);
      if (!form) return res.status(404).json({ message: "Form not found" });

      const question = form.questions.id(questionId);
      if (!question)
        return res.status(404).json({ message: "Question not found" });

      Object.assign(question, updateData);
      await form.save();

      res
        .status(200)
        .json({ message: "Question updated successfully", question });
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:formId/questions/:questionId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { formId, questionId } = req.params;

      const updatedForm = await Form.findByIdAndUpdate(
        formId,
        { $pull: { questions: { _id: questionId } } },
        { new: true }
      );

      if (!updatedForm) {
        return res.status(404).json({ message: "Form not found" });
      }

      res.status(200).json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:formId/questions/:questionId/options/:optionIndex",
  authenticateJWT,
  async (req, res) => {
    try {
      const { formId, questionId, optionIndex } = req.params;

      const form = await Form.findById(formId);
      if (!form) return res.status(404).json({ message: "Form not found" });

      const question = form.questions.id(questionId);
      if (!question)
        return res.status(404).json({ message: "Question not found" });

      if (optionIndex < 0 || optionIndex >= question.options.length) {
        return res.status(400).json({ message: "Invalid option index" });
      }

      question.options.splice(optionIndex, 1);
      await form.save();

      res
        .status(200)
        .json({ message: "Option removed successfully", question });
    } catch (error) {
      console.error("Error removing option:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post(
  "/:formId/questions/:questionId/rules",
  authenticateJWT,
  async (req, res) => {
    try {
      const { formId, questionId } = req.params;
      const newRule = req.body;

      const form = await Form.findById(formId);
      if (!form) return res.status(404).json({ message: "Form not found" });

      const question = form.questions.id(questionId);
      if (!question)
        return res.status(404).json({ message: "Question not found" });

      question.rules.push(newRule);
      await form.save();

      res.status(201).json({ message: "Rule added successfully", question });
    } catch (error) {
      console.error("Error adding rule:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.put(
  "/:formId/questions/:questionId/rules/:ruleId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { formId, questionId, ruleId } = req.params;
      const updatedRule = req.body;

      const form = await Form.findById(formId);
      if (!form) return res.status(404).json({ message: "Form not found" });

      const question = form.questions.id(questionId);
      if (!question)
        return res.status(404).json({ message: "Question not found" });

      const rule = question.rules.id(ruleId);
      if (!rule) return res.status(404).json({ message: "Rule not found" });

      Object.assign(rule, updatedRule);
      await form.save();

      res.status(200).json({ message: "Rule updated successfully", rule });
    } catch (error) {
      console.error("Error updating rule:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:formId/questions/:questionId/rules/:ruleId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { formId, questionId, ruleId } = req.params;

      const form = await Form.findById(formId);
      if (!form) return res.status(404).json({ message: "Form not found" });

      const question = form.questions.id(questionId);
      if (!question)
        return res.status(404).json({ message: "Question not found" });

      question.rules = question.rules.filter(
        (rule) => rule._id.toString() !== ruleId
      );
      await form.save();

      res.status(200).json({ message: "Rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting rule:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.put("/:formId/questions", authenticateJWT, async (req, res) => {
  const { formId } = req.params;
  const { questions } = req.body;

  try {
    // Validate input
    if (!Array.isArray(questions)) {
      return res
        .status(400)
        .json({ error: "Invalid request: questions should be an array" });
    }

    // Ensure each question has a valid ObjectId if `_id` exists, or create a new one
    const updatedQuestions = questions.map((q) => ({
      ...q,
      _id: q._id
        ? new mongoose.Types.ObjectId(q._id)
        : new mongoose.Types.ObjectId(),
    }));

    // Find and update the form
    const updatedForm = await Form.findByIdAndUpdate(
      formId,
      { $set: { questions: updatedQuestions } },
      { new: true, runValidators: true }
    );

    if (!updatedForm) {
      return res.status(404).json({ error: "Form not found" });
    }

    return res.status(200).json({
      message: "Questions updated successfully",
      questions: updatedForm.questions,
    });
  } catch (error) {
    console.error("Error updating questions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const findLinkedItems = async (invoiceFields, courseId, session) => {
  if (!invoiceFields?.length || !courseId) return [];

  try {
    const course = await Course.findById(courseId).session(session);
    if (!course?.rules?.length || !course?.items?.length) return [];

    const matchedItems = [];

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

        const userAnswerObj = invoiceFields.find(
          (f) => f.questionId.toString() === questionId.toString()
        );

        if (!userAnswerObj) {
          allMatched = false;
          break;
        }

        const userAnswer = (userAnswerObj.answer || "").trim();
        const expectedOption = (option || "").trim();

        const matched =
          operator === "AND"
            ? userAnswer === expectedOption
            : userAnswer !== expectedOption;

        if (!matched) {
          allMatched = false;
          break;
        }
      }

      if (allMatched) {
        for (const linkedItemId of linkedItems) {
          const item = course.items.find(
            (i) => i._id.toString() === linkedItemId.toString()
          );
          if (item) {
            matchedItems.push({
              name: item.name,
              amount: item.amount,
              currency: item.currency,
            });
          } else {
            console.warn("Linked item ID found, but not in course.items");
          }
        }
      }
    }

    return matchedItems;
  } catch (error) {
    console.error("Error in findLinkedItems:", error);
    throw error;
  }
};


// 2. Extract invoice fields (no change)
const extractInvoiceFields = (processedSubmissions) => {
  return processedSubmissions
    .filter((sub) => sub.isUsedForInvoice && sub.questionId && sub.answer)
    .map((sub) => ({
      questionId: sub.questionId.toString(),
      answer: sub.answer.toString(),
    }));
};

router.post("/:formId/submissions", authenticateJWT, async (req, res) => {
  try {
    const { formId } = req.params;
    const { submissions, email, discountInfo } = req.body;

    if (!formId || !mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({ message: "Invalid or missing form ID" });
    }

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({ message: "Submissions cannot be empty" });
    }

    const session = await mongoose.startSession();
    let criticalResult;

    try {
      await session.withTransaction(async () => {
        criticalResult = await processCriticalSubmission(
          req,
          session,
          discountInfo
        );
      });
    } finally {
      session.endSession();
    }

    const response = {
      message: "Form submitted successfully!",
      submission: criticalResult.submission,
      user: criticalResult.user || null,
      ...(criticalResult.linkedItemDetails && {
        linkedItemDetails: criticalResult.linkedItemDetails,
      }),
    };

    res.status(201).json(response);

    if (email && criticalResult.user) {
      (async () => {
        try {
          await processBackgroundTasks({
            email,
            formId,
            userId: criticalResult.user._id,
            courseId: criticalResult.courseId,
            isUsedForRegistration: criticalResult.isUsedForRegistration,
            linkedItemDetails: criticalResult.linkedItemDetails,
            submission: criticalResult.submission,
          });
        } catch (err) {
          console.error("Error in background task:", err);
        }
      })();
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

async function processBackgroundTasks({
  email,
  formId,
  userId,
  courseId,
  isUsedForRegistration,
  linkedItemDetails,
  submission,
}) {
  const [user, form] = await Promise.all([
    User.findById(userId),
    Form.findById(formId),
  ]);

  if (!user || !form) return;

  await processFileUploads(submission, formId, email);

  if (isUsedForRegistration) {
    await generateAndStoreQRCode(user, form, courseId);
    await sendRegistrationEmail(user, form, linkedItemDetails, submission);
    await sendTelegramNotification(user, form, linkedItemDetails);
  }

  await createUserNotification(userId, form);
}

async function processCriticalSubmission(req, session, discountInfo) {
  const { formId } = req.params;
  const { submissions, email } = req.body;
  const result = {};

  const form = await Form.findById(formId)
    .select("isUsedForRegistration isUsedForRussian formName description courseId")
    .session(session);

  if (!form) throw new Error("Form not found");
  if (!form.courseId) throw new Error("No course associated with this form");

  result.courseId = form.courseId;
  result.isUsedForRegistration = form.isUsedForRegistration;

  const processedSubmissions = await Promise.all(
    submissions.map(async (submission, idx) => {
      if (!submission.questionId) {
        throw new Error(`Missing questionId in submission index ${idx}`);
      }

      const response = {
        formId: formId,
        questionId: submission.questionId,
        isUsedForInvoice: submission.isUsedForInvoice || false,
      };

      if (submission.isFile && submission.fileData) {
        console.log(`📄 Uploading file(s) immediately for questionId: ${submission.questionId}`);
      
        const fileDataArray = Array.isArray(submission.fileData)
          ? submission.fileData
          : [submission.fileData];
      
        const uploadedFiles = await Promise.all(
          fileDataArray.map((fileData, i) => uploadFileToGridFS(fileData, formId, submission.questionId, email))
        );
      
        response.files = uploadedFiles;
      }
       else {
        if (!submission.answer) {
          throw new Error(`Missing answer for question ${submission.questionId}`);
        }
        response.answer = submission.answer;
      }

      return response;
    })
  );

  if (form.isUsedForRegistration) {
    const invoiceFields = extractInvoiceFields(processedSubmissions);
    result.linkedItemDetails = await findLinkedItems(invoiceFields, form.courseId, session);
  }

  const newSubmission = {
    email: email || "N/A",
    responses: processedSubmissions,
    submittedAt: moment.tz("Europe/Moscow").toDate(),
  };

  console.log("✅ Final processed submission:", JSON.stringify(newSubmission, null, 2));

  await Form.updateOne(
    { _id: formId },
    { $push: { submissions: newSubmission } },
    { session }
  );

  if (email) {
    const user = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: { email, createdAt: new Date() },
        $addToSet: {
          courses: {
            courseId: form.courseId,
            registeredForms: {
              formId,
              formName: form.formName,
              formDescription: form.description,
              isUsedForRegistration: form.isUsedForRegistration,
              isUsedForRussian: form.isUsedForRussian,
              submittedAt: moment.tz("Europe/Moscow").toDate(),
            },
            submittedAt: moment.tz("Europe/Moscow").toDate(),
          },
        },
      },
      { upsert: true, new: true, session }
    );

    result.user = user;


    if (discountInfo && result.linkedItemDetails) {
      const courseCouponEntry = await CourseCoupons.findOne({
        courseId: form.courseId,
      }).session(session);

      if (!courseCouponEntry) {
        console.log(`No CourseCoupons found for courseId: ${form.courseId}`);
      } else {
        for (const key in discountInfo) {
          const entry = discountInfo[key];
          const discountId = entry.id;

          const matchedCoupon = courseCouponEntry.coupons.find(
            (c) => c._id.toString() === discountId
          );

          if (!matchedCoupon) {
            console.log(
              `Coupon with id ${discountId} not found in CourseCoupons for courseId ${form.courseId}`
            );
            continue;
          }

          if (entry.code !== matchedCoupon.code) {
            console.log(
              `Coupon code mismatch: expected ${matchedCoupon.code}, got ${entry.code}`
            );
            continue;
          }

          // Check coupon expiration
          if (
            matchedCoupon.expiresAt &&
            new Date(matchedCoupon.expiresAt) < new Date()
          ) {
            console.log(`Coupon ${matchedCoupon.code} has expired`);
            continue;
          }

          // Common coupon handling
          if (matchedCoupon.type === "common") {
            if (matchedCoupon.currentLimit >= matchedCoupon.totalLimit) {
              console.log(`Coupon ${matchedCoupon.code} limit reached`);
              continue;
            }

            const existingUser = matchedCoupon.users?.find(
              (u) =>
                (u.user?.toString?.() || u?.toString?.()) ===
                user._id.toString()
            );

            if (!existingUser) {
              await CourseCoupons.updateOne(
                { courseId: form.courseId, "coupons._id": matchedCoupon._id },
                {
                  $addToSet: {
                    "coupons.$.users": {
                      user: user._id,
                      status: "used",
                      usedAt: new Date(),
                    },
                  },
                  $inc: { "coupons.$.currentLimit": 1 },
                },
                { session }
              );
            } else if (existingUser.status === "used") {
              console.log(
                `User ${user._id} already used coupon ${matchedCoupon.code}`
              );
              continue;
            }

            result.appliedCoupon = {
              code: matchedCoupon.code,
              percentage: matchedCoupon.percentage,
              type: matchedCoupon.type,
            };

            // User-specific coupon handling
          } else if (matchedCoupon.type === "user") {
            if (!matchedCoupon.users || matchedCoupon.users.length === 0) {
              console.log(
                `No users defined for user coupon ${matchedCoupon.code}`
              );
              continue;
            }

            const userCouponData = matchedCoupon.users.find(
              (u) =>
                (u.user?.toString?.() || u?.toString?.()) ===
                user._id.toString()
            );

            if (!userCouponData) {
              console.log(
                `User ${user._id} not allowed to use coupon ${matchedCoupon.code}`
              );
              continue;
            }

            if (userCouponData.status === "used") {
              console.log(
                `User ${user._id} has already used coupon ${matchedCoupon.code}`
              );
              continue;
            }

            // Check if coupon has usage limits
            if (
              matchedCoupon.usageLimit &&
              userCouponData.usageCount >= matchedCoupon.usageLimit
            ) {
              console.log(
                `User ${user._id} has reached usage limit for coupon ${matchedCoupon.code}`
              );
              continue;
            }

            // Update coupon status and usage count
            const updateObj = {
              $set: {
                "coupons.$.users.$[elem].status": "used",
                "coupons.$.users.$[elem].usedAt": new Date(),
              },
            };

            if (matchedCoupon.usageLimit) {
              updateObj.$inc = { "coupons.$.users.$[elem].usageCount": 1 };
            }

            await CourseCoupons.updateOne(
              {
                courseId: form.courseId,
                "coupons._id": matchedCoupon._id,
              },
              updateObj,
              {
                session,
                arrayFilters: [{ "elem.user": user._id }],
              }
            );

            result.appliedCoupon = {
              code: matchedCoupon.code,
              percentage: matchedCoupon.percentage,
              type: matchedCoupon.type,
            };
          }
        }
      }
    }

    let paymentData = null;


if (result.linkedItemDetails && Array.isArray(result.linkedItemDetails) && result.linkedItemDetails.length > 0) {
  const transactionId = Math.floor(100000 + Math.random() * 900000).toString();
  const submittedAt = moment.tz("Europe/Moscow").toDate();

  const packages = result.linkedItemDetails.map((item) => ({
    name: item.name,
    amount: item.amount,
    currency: item.currency,
    quantity: 1,

  }));

  const totalAmount = result.linkedItemDetails.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  paymentData = {
    transactionId,
    packages,
    totalAmount,
    payableAmount: totalAmount, // may change with discount
    currency: result.linkedItemDetails[0].currency,
    status: "Not created",
    submittedAt,
  };

  if (result.appliedCoupon) {
    const { code, percentage, type } = result.appliedCoupon;

    paymentData.discountCode = code;
    paymentData.discountPercentage = percentage;
    paymentData.discountType = type;
    paymentData.discountStatus = "used";

    if (percentage) {
      paymentData.payableAmount = Math.round(
        totalAmount * (1 - percentage / 100)
      );
    }
  }

  // Save to User
  await User.updateOne(
    { _id: user._id, "courses.courseId": form.courseId },
    {
      $push: {
        "courses.$.payments": paymentData,
      },
    },
    { session }
  );

  // Save to Course
  await Course.updateOne(
    { _id: form.courseId },
    {
      $push: {
        payments: {
          ...paymentData,
          email,
          userId: user._id,
        },
      },
    },
    { session }
  );
}


if (paymentData) {
  await sendRegistrationEmail(user, form, result.linkedItemDetails, submissions, {
    packages: paymentData.packages.map((p) => p.name).join(", "),
    price: `${paymentData.payableAmount} ${paymentData.currency}`,
  });
} else {
  console.warn(`⚠️ No payment data generated. Skipping email to ${user.email}`);
}

   

    // Apply coupon logic — unchanged, keep your existing coupon logic here

    // (Optional: log coupon handling success/failure)
  }

  result.submission = newSubmission;
  return result;
}


// Background job processor
formSubmissionQueue.process(async (job) => {
  const {
    email,
    formId,
    userId,
    courseId,
    isUsedForRegistration,
    linkedItemDetails,
    submission,
  } = job.data;

  try {
    // 1. Process file uploads if any
    await processFileUploads(submission, formId, email);

    // 2. Get updated user and form data
    const [user, form] = await Promise.all([
      User.findById(userId),
      Form.findById(formId),
    ]);

    if (!user || !form) return;

    // 3. QR Code Generation
    if (isUsedForRegistration) {
      await generateAndStoreQRCode(user, form, courseId);
    }

    // 4. Notifications
    await createUserNotification(userId, form);

    // 5. Registration Email
    if (isUsedForRegistration) {
      await sendRegistrationEmail(user, form, linkedItemDetails);
    }

    // 6. Telegram Notification
    if (isUsedForRegistration) {
      await sendTelegramNotification(user, form, linkedItemDetails);
    }
  } catch (error) {
    console.error("Error processing background tasks:", error);
    throw error;
  }
});

async function getOriginalFileData(questionId, formId) {
  const form = await Form.findById(formId).lean();
  const latestSubmission = form?.submissions?.slice(-1)[0];

  if (!latestSubmission) throw new Error("No submission found");

  const response = latestSubmission.responses.find(
    (res) => res.questionId.toString() === questionId.toString()
  );

  if (!response || !response.files) throw new Error("File data not found in responses");

  return response.files.filter(f => f.pending && f.preview);
}

// Helper functions for background tasks
async function processFileUploads(submission, formId, email) {
  const fileUpdates = [];

  for (const response of submission.responses) {
    if (response.files && response.files.some((f) => f.pending)) {
      const filesToProcess = await getOriginalFileData(
        response.questionId,
        formId
      );
      const processedFiles = await Promise.all(
        filesToProcess.map((fileData) =>
          uploadFileToGridFS(fileData, formId, response.questionId, email)
        )
      );
      fileUpdates.push({
        formId,
        "submissions._id": submission._id,
        "submissions.responses.questionId": response.questionId,
        $set: {
          "submissions.$.responses.$[res].files": processedFiles,
        },
      });
    }
  }

  if (fileUpdates.length > 0) {
    await Promise.all(
      fileUpdates.map((update) =>
        Form.updateOne(
          { _id: update.formId, "submissions._id": update["submissions._id"] },
          update.$set,
          {
            arrayFilters: [
              { "res.questionId": update["submissions.responses.questionId"] },
            ],
          }
        )
      )
    );
  }
}

async function uploadFileToGridFS(fileData, formId, questionId, email) {
  if (!fileData?.preview) {
    throw new Error(`Missing preview data for file: ${fileData?.name || "unknown file"}`);
  }

  const base64Data = fileData.preview.split(",")[1] || fileData.preview;
  const fileBuffer = Buffer.from(base64Data, "base64");
  const uniqueFileName = `${Date.now()}-${fileData.name || "file"}`;

  console.log(`📁 Uploading file to GridFS: ${fileData.name}`);

  const writeStream = gfs.openUploadStream(uniqueFileName, {
    contentType: fileData.type || "application/octet-stream",
    metadata: {
      questionId,
      formId,
      submittedBy: email || "anonymous",
      originalName: fileData.name,
      size: fileData.size,
    },
  });

  writeStream.write(fileBuffer);
  writeStream.end();

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  return {
    fileId: writeStream.id,
    fileName: fileData.name || uniqueFileName,
    contentType: fileData.type,
    size: fileData.size || fileBuffer.length,
    uploadDate: moment.tz("Europe/Moscow").toDate(),
  };
}



async function generateAndStoreQRCode(user, form, courseId) {
  const qrUrl = `https://qr.eafo.info/qrscanner/view/${user._id}/${courseId}/${form._id}`;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    errorCorrectionLevel: "H",
    type: "image/png",
    quality: 0.9,
    margin: 1,
    width: 300,
  });

  const qrFileName = `qr-${user._id}-${courseId}-${form._id}-${Date.now()}.png`;
  const qrWriteStream = gfs.openUploadStream(qrFileName, {
    contentType: "image/png",
    metadata: {
      userId: user._id,
      courseId,
      formId: form._id,
      purpose: "registration_qr_code",
      generatedAt: moment.tz("Europe/Moscow").toDate(),
    },
  });

  qrWriteStream.write(qrBuffer);
  qrWriteStream.end();

  const qrFile = await new Promise((resolve, reject) => {
    qrWriteStream.on("finish", () =>
      resolve({
        fileId: qrWriteStream.id,
        fileName: qrFileName,
        contentType: "image/png",
        size: qrBuffer.length,
        url: qrUrl,
        generatedAt: moment.tz("Europe/Moscow").toDate(),
      })
    );
    qrWriteStream.on("error", reject);
  });

  await User.updateOne(
    {
      _id: user._id,
      "courses.courseId": courseId,
    },
    {
      $push: {
        "courses.$.qrCodes": {
          qrFileId: qrFile.fileId,
          formId: form._id,
          courseId,
          url: qrUrl,
          generatedAt: moment.tz("Europe/Moscow").toDate(),
          isActive: true,
        },
      },
    }
  );
}

async function createUserNotification(userId, form) {
  const notification = {
    type: "form_submission",
    formId: form._id,
    formName: form.formName,
    courseId: form.courseId,
    message: {
      en: `Your submission for "${form.formName}" was received`,
      ru: `Ваша заявка на форму "${form.formName}" получена`,
    },
    read: false,
    createdAt: moment.tz("Europe/Moscow").toDate(),
  };

  await UserNotification.findOneAndUpdate(
    { userId },
    { $push: { notifications: notification } },
    { upsert: true, new: true }
  );
}

async function sendTelegramNotification(user, form, linkedItemDetails) {
  try {
    const telegram = new TelegramApi();
    telegram.chat_id = "-4614501397";

    const firstName = user.personalDetails?.firstName || "Н/Д";
    const lastName = user.personalDetails?.lastName || "";
    const email = user.email || "Н/Д";

    const packageName = Array.isArray(linkedItemDetails)
      ? linkedItemDetails.map((item) => item.name).join(", ")
      : linkedItemDetails?.name || "Н/Д";

    const submittedAt = new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
    });

    telegram.text = `
<b>📢 Новая заявка</b>
👤 <b>Имя:</b> ${firstName} ${lastName}
📧 <b>Почта:</b> ${email}
📦 <b>Пакет:</b> ${packageName}
🕒 <b>Дата:</b> ${submittedAt}
    `.trim();

    await telegram.sendMessage();
    console.log(`✅ Telegram notification sent for user ${email}`);
  } catch (err) {
    console.error(`❌ Failed to send Telegram notification:`, err.message);
  }
}





router.get("/files/:fileId", authenticateJWT, async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);

    const file = await mongoose.connection.db
      .collection("uploads.files")
      .findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Optionally check access via req.user here

    // Headers
    res.set("Content-Type", file.contentType);
    res.set("Content-Length", file.length);
    const encodedFileName = encodeURIComponent(file.filename);
    res.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodedFileName}`
    );

    // Create bucket and stream
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on("error", (error) => {
      console.error("Error streaming file:", error);
      res.status(500).end();
    });
  } catch (error) {
    console.error("Error retrieving file:", error);
    res.status(500).json({
      message: "Error retrieving file",
      error: error.message,
    });
  }
});

router.get("/:formId/submission", authenticateJWT, async (req, res) => {
  try {
    const { formId } = req.params;
    const email = req.user.email; // Get email from authenticated user

    if (!formId) {
      return res.status(400).json({
        success: false,
        message: "Form ID is required",
      });
    }

    const form = await Form.findOne({
      _id: formId,
      "submissions.email": email,
    }).select("submissions.$");

    if (!form?.submissions?.length) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this form and user",
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
      isUsedForRussian: submission.isUsedForRussian,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/:formId/info", authenticateJWT, async (req, res) => {
  const { formId } = req.params;

  try {
    const form = await Form.findById(formId);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    res.status(200).json({
      title: form.title,
      description: form.description,
      formLogo: form.formLogo || null, // Send null if no logo exists
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      isUsedForRussian: form.isUsedForRussian,
      formName:form.formName
    });
  } catch (error) {
    console.error("Error fetching form details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:formId/submitted", authenticateJWT, async (req, res) => {
  try {
    const { formId } = req.params;
    const email = req.user.email; // JWT authenticated user
    const { slug } = req.body;
    if (!formId || !email) {
      return res.status(400).json({
        success: false,
        message: "Form ID and email are required",
      });
    }

    // 🔍 Find the form where a submission by this user exists
    const form = await Form.findOne({
      _id: formId,
      "submissions.email": email.toLowerCase().trim(),
    }).select("_id submissions.$"); // Only return the matched submission

    if (!form || !form.submissions || form.submissions.length === 0) {
      return res.status(200).json({
        success: true,
        submitted: false,
      });
    }

    return res.status(200).json({
      success: true,
      submitted: true,
      submittedAt: form.submissions[0].submittedAt,
    });
  } catch (error) {
    console.error("Error checking submission:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});


module.exports = router;
