const express = require("express");
const axios = require("axios");  // Use Axios for API calls
require("dotenv").config();
const User = require("../models/User"); 
const Course = require("../models/Course"); 
const UserNotification = require("../models/UserNotificationSchema");
const multer = require("multer");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const nodemailer = require("nodemailer");
const { GridFSBucket } = require("mongodb");
const conn = mongoose.connection;



// Endpoint to send emails and save payments


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const RUSENDER_API = "https://api.beta.rusender.ru/api/v1/external-mails/send";

async function runWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      if (err.codeName !== "WriteConflict" || attempt === maxRetries) {
        throw err;
      }
      console.warn(`⚠️ Write conflict, retrying (${attempt}/${maxRetries})...`);
    }
  }
}





const russianEmailTemplate = (fullName, invoiceNumber, paymentUrl, packageName, amount, currency, courseName) => {
  const date = new Date();
  const formattedDate = date.toLocaleDateString('ru-RU'); // "02.06.2025"
  const year = date.getFullYear();

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Счет от EAFO</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    
    <p><strong>${fullName},</strong></p>
    <p>Для ознакомления с деталями платежа и оплаты, перейдите по ссылке ниже. Вы также можете оплатить заявку по счету, прикрепленному к этому письму.</p>

    <p>
      Ссылка для оплаты для участников:
    </p>

    <p style="margin-bottom: 20px;">
      <a href="${paymentUrl}" style="color: #007bff; text-decoration: none;">
        Заплатить сейчас
      </a>
    </p>

    <p><strong>
      Участник должен оплатить сумму, указанную в счете, в течение 3 дней. Заявка будет считаться завершенной после подтверждения оплаты.
      </strong>
    </p>

    <p>После совершения платежа, пожалуйста, отправьте подтверждение банковского перевода и свое ФИО на адрес: basic@eafo.info</p>

    <p> Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

    <p> Техническая поддержка: basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

    <p>С уважением,<br>команда EAFO</p>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999;">
      © ${year} EAFO. Все права защищены.
    </p>
  </div>
</body>
</html>
`;
};



const englishEmailTemplate = (fullName, invoiceNumber, paymentUrl, packageName, amount, currency, courseName) => {
  const date = new Date();
  const formattedDate = date.toLocaleDateString('en-GB'); // e.g., 02/06/2025
  const year = date.getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice from EAFO</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    
    <p><strong>${fullName},</strong></p>
    <p>Thank you for registering for the XI EAFO Basic Medical Courses, which will take place from July 23 to August 8, 2025 in Magas, Republic of Ingushetia.</p>

    <p style="margin-bottom: 10px;">
      <strong>Invoice Number:</strong> ${invoiceNumber}<br />
      <strong>Package:</strong> ${packageName}<br />
      <strong>Amount:</strong> ${amount} ${currency}<br />
      <strong>Date:</strong> ${formattedDate}
    </p>

    <p>
      You can access the payment details by clicking the link below. Please complete your registration by making the payment.
    </p>

    <p>
      <strong>Payment link for international participants:</strong>
    </p>

    <p style="margin-bottom: 20px;">
      <a href="${paymentUrl}" style="color: #007bff; text-decoration: none;">
        Pay Now
      </a>
    </p>

    <p>
      *Participants must pay the amount specified in the invoice within 3 days.
    </p>

    <p>
      After making the payment, please send the bank transfer confirmation and your full name to:
      <a href="mailto:travel@eafo.info">travel@eafo.info</a>
    </p>

    <p>
      If you have any questions, please contact the EAFO team at:
      <a href="mailto:info@eafo.info">info@eafo.info</a>
    </p>

    <p style="margin-bottom: 0;">
      Best regards,<br/>
      <strong>EAFO Team</strong>
    </p>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999;">
      © ${year} EAFO. All rights reserved.
    </p>
  </div>
</body>
</html>
`;
};




const sendEmailSMTP = async (recipient, mail) => {
  // Configure SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,           // e.g., smtp.gmail.com
    port: parseInt(process.env.SMTP_PORT), // 465 for SSL
    secure: true,                          // true for port 465
    auth: {
      user: process.env.EMAIL_USER,        // eafo@e-registrar.org
      pass: process.env.EMAIL_PASS,        // your app password
    },
  });

  // Compose email
  const mailOptions = {
    from: `"EAFO" <${process.env.EMAIL_USER}>`,
    to: recipient.email,
    subject: mail.subject,
    html: mail.html.replace("{name}", recipient.firstName || "User"),
    attachments: [],
  };

  // Handle attachments (if any)
  if (mail.attachments?.length > 0) {
    const attachment = mail.attachments[0];
    mailOptions.attachments.push({
      filename: attachment.filename,
      content: attachment.content, // Should be a Buffer
      contentType: attachment.contentType || "application/pdf",
    });
  }

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    return {
      email: recipient.email,
      status: "Success",
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("❌ SMTP Email error:", error);
    return {
      email: recipient.email,
      status: "Failed",
      error: error.message,
    };
  }
};




const sendEmailRusender = async (recipient, mail) => {
  const emailData = {
    mail: {
      to: { email: recipient.email },
      from: { email: "eafo@e-registrar.org", name: "EAFO" },
      subject: mail.subject,
      previewTitle: mail.subject,
      html: mail.html.replace("{name}", recipient.name || "User"),
    },
  };

  if (mail.attachments?.length) {
    const attachment = mail.attachments[0];
    emailData.mail.attachments = [
      {
        name: attachment.filename,
        content: Buffer.from(attachment.content).toString("base64"),
        type: "application/pdf",
        disposition: "attachment",
      },
    ];
  }

  try {
    const response = await axios.post(RUSENDER_API, emailData, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.RUSENDER_API_KEY,
      },
    });
    return { email: recipient.email, status: "Success", data: response.data };
  } catch (error) {
    return {
      email: recipient.email,
      status: "Failed",
      error: error.response?.data || error.message,
    };
  }
};

// POST /api/email/send
router.post("/send", upload.single("contract"), async (req, res) => {
  let {
    email,
    courseId,
    paymentUrl,
    packages,
    payableAmount,
    discountPercentage,
    code,
    invoiceNumber,
  } = req.body;

  const contractPdfBuffer = req.file?.buffer;

  console.log("📥 Email send request received:");
  console.log("📧 Email:", email);
  console.log("📘 Course ID:", courseId);
  console.log("📄 Invoice Number:", invoiceNumber);
  console.log("📄 PDF attached:", !!contractPdfBuffer);

  try {
    packages = JSON.parse(packages);
    payableAmount = parseFloat(payableAmount);
    discountPercentage = parseFloat(discountPercentage || "0");
  } catch (err) {
    console.error("❌ JSON parsing error:", err);
    return res.status(400).json({ success: false, message: "Invalid input format." });
  }

  if (!email || !courseId  || !packages?.length || !invoiceNumber) {
    return res.status(400).json({
      success: false,
      message: "Missing required data.",
      missingFields: {
        email,
        courseId,
        paymentUrl,
        packagesLength: packages?.length,
        invoiceNumber,
      },
    });
  }

  try {
    const user = await User.findOne({ email });
    const course = await Course.findById(courseId);
    if (!user || !course) throw new Error("User or course not found");

    const { title, firstName, middleName, lastName } = user.personalDetails || {};
    const fullName = `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();
    const currency = packages[0].currency;
    const courseName = currency === "RUB" ? course.nameRussian : course.name;

    const subject = currency === "RUB"
      ? `Счет за XI EAFO Базовые медицинские курсы по онкологии и онкопатологии - Номер счета от EAFO`
      : `Invoice for ${courseName} - ${invoiceNumber}`;

    const emailHtml = currency === "RUB"
      ? russianEmailTemplate(fullName, invoiceNumber, paymentUrl, packages[0].name, payableAmount, currency, courseName)
      : englishEmailTemplate(fullName, invoiceNumber, paymentUrl, packages[0].name, payableAmount, currency, courseName);

    const emailOptions = {
      subject,
      html: emailHtml,
      attachments: [],
    };

    let fileId = null;

    // Save contract to GridFS and attach it
    if (contractPdfBuffer) {
      const bucket = new GridFSBucket(conn.db, { bucketName: "contracts" });
      const uploadStream = bucket.openUploadStream(`Contract_${invoiceNumber}.pdf`, {
        contentType: "application/pdf",
        metadata: { email, courseId, invoiceNumber },
      });

      uploadStream.end(contractPdfBuffer);

      await new Promise((resolve, reject) => {
        uploadStream.on("finish", () => {
          fileId = uploadStream.id;
          emailOptions.attachments.push({
            filename: `Contract_${invoiceNumber}.pdf`,
            content: contractPdfBuffer,
            contentType: "application/pdf",
          });
          resolve();
        });
        uploadStream.on("error", reject);
      });
    } else {
      console.warn("⚠️ No contract PDF attached.");
    }

    // Send email
    const emailResult = await sendEmailSMTP({ email, name: fullName }, emailOptions);

    // 🔐 Save contractFileId to user and course payment entry
    if (fileId) {
      const transactionId = course.payments.find(p => p.invoiceNumber === invoiceNumber)?.transactionId;

      if (transactionId) {
        await User.updateOne(
          {
            email,
            "courses.courseId": courseId,
            "courses.payments.invoiceNumber": invoiceNumber,
          },
          {
            $set: {
              "courses.$[].payments.$[p].contractFileId": fileId,
            },
          },
          {
            arrayFilters: [
              { "p.invoiceNumber": invoiceNumber },
            ],
          }
        );
        

        await Course.updateOne(
          { _id: courseId, "payments.invoiceNumber": invoiceNumber },
          {
            $set: {
              "payments.$.contractFileId": fileId,
            },
          }
        );
        
        console.log("📥 Contract fileId saved to User & Course payment.");
      } else {
        console.warn("⚠️ Transaction not found for invoice:", invoiceNumber);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Email with invoice sent successfully.",
      invoiceNumber,
      emailResult,
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/contract-file/:fileId", async (req, res) => {
  const { fileId } = req.params;

  try {
    const bucket = new GridFSBucket(conn.db, { bucketName: "contracts" });
    const _id = new mongoose.Types.ObjectId(fileId);

    const files = await bucket.find({ _id }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = files[0];
    let filename = file.filename || `Счет_${fileId}.pdf`;

    // 🧼 Sanitize filename to avoid slashes
    filename = filename.replace(/[\/\\]/g, "_");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    });

    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.pipe(res);

    downloadStream.on("error", (err) => {
      console.error("GridFS stream error:", err);
      res.status(404).json({ message: "File not found" });
    });
  } catch (err) {
    console.error("Failed to fetch contract PDF:", err);
    res.status(500).json({ message: "Error fetching file" });
  }
});






router.post("/send-email", async (req, res) => {
  const { 
    email, 
    courseId, 
    transactionId, 
    orderId, 
    paymentUrl, 
    currency, 
    packages,  // Changed from 'package' to 'packages' (array of items)
    totalAmount, // Changed from originalAmount
    discountPercentage, 
    code 
  } = req.body;

  // Validate required fields
  const requiredFields = ['email', 'courseId', 'transactionId', 'orderId', 'paymentUrl'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `❌ Missing required fields: ${missingFields.join(', ')}` 
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find user and validate
    const user = await User.findOne({ email }).session(session);
    if (!user) throw new Error("User not found");

    const userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) throw new Error("User is not enrolled in this course");

    const course = await Course.findById(courseId).session(session);
    if (!course) throw new Error("Course not found");

    // Generate Invoice Number with better error handling
    let nextInvoiceNumber;
    try {
      const currentInvoiceNumber = course.currentInvoiceNumber || "EAFO-003/25/0100";
      const match = currentInvoiceNumber.match(/(\d{4})$/);
      
      if (match) {
        const currentNumber = parseInt(match[0], 10);
        const incremented = (currentNumber + 1).toString().padStart(4, "0");
        nextInvoiceNumber = currentInvoiceNumber.replace(/\d{4}$/, incremented);
      } else {
        nextInvoiceNumber = "EAFO-003/25/0101"; // Fallback with incremented number
      }
    } catch (err) {
      console.error("Error generating invoice number:", err);
      nextInvoiceNumber = `EAFO-${Date.now().toString().slice(-4)}`; // Emergency fallback
    }

    course.currentInvoiceNumber = nextInvoiceNumber;

    // Create New Payment Entry with enhanced data
    const newPayment = {
      paymentLink: paymentUrl,
      packages: Array.isArray(packages) ? packages : [{ name: "Standard", amount: payableAmount }],
      currency,
      paymentId: orderId,
      orderId,
      transactionId,
      invoiceNumber: nextInvoiceNumber,
      time: moment.tz("Europe/Moscow").toDate(),
      status: "Pending",
      totalAmount: totalAmount,
      ...(discountPercentage && { discountPercentage }),
      ...(code && { discountCode: code })
    };

    // Update user and course records
    userCourse.payments.push(newPayment);
    course.payments.push({
      email,
      ...newPayment,
      user: user._id,
      userName: user.personalDetails ? 
        `${user.personalDetails.firstName} ${user.personalDetails.lastName}` : 
        user.email
    });

    // Save changes
    await user.save({ session });
    await course.save({ session });

    // Prepare email content
    const { title, firstName, middleName, lastName } = user.personalDetails || {};
    const isRussian = currency === "RUB";
    const courseName = isRussian ? course.nameRussian : course.name;

    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

    const emailSubject = isRussian
      ? `Счет за XI EAFO Базовые медицинские курсы по онкологии и онкопатологии - Номер счета от EAFO`
      : `Invoice for ${courseName} - ${nextInvoiceNumber}`;

    const emailBody = isRussian
      ? russianEmailTemplate(
          fullName, 
          nextInvoiceNumber, 
          paymentUrl, 
          packages, 
          totalAmount, 
          currency, 
          courseName
        )
      : englishEmailTemplate(
          fullName, 
          nextInvoiceNumber, 
          paymentUrl, 
          packages, 
          totalAmount, 
          currency, 
          courseName
        );

    // Send email
    const emailResult = await sendEmailRusender(
      { email, name: fullName }, 
      { subject: emailSubject, html: emailBody }
    );

    // Commit transaction
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Payment created and email sent successfully",
      invoiceNumber: nextInvoiceNumber,
      emailResult,
      paymentDetails: {
        amount: totalAmount,
        currency,
        packages
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction aborted due to error:", error);
    
    // More detailed error response
    return res.status(500).json({ 
      success: false, 
      message: "Failed to process payment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorType: error.name
    });
  } finally {
    session.endSession();
  }
});



router.post("/resend", async (req, res) => {
  const { email, invoiceNumber } = req.body;

  if (!email || !invoiceNumber) {
    return res.status(400).json({
      success: false,
      message: "Missing email or invoice number.",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");

    const course = await Course.findOne({ "payments.invoiceNumber": invoiceNumber });
    if (!course) throw new Error("Course with this invoice not found");

    const coursePayment = course.payments.find(p => p.invoiceNumber === invoiceNumber);
    const userCourse = user.courses.find(c => c.payments.some(p => p.invoiceNumber === invoiceNumber));
    const userPayment = userCourse?.payments.find(p => p.invoiceNumber === invoiceNumber);

    const payment = coursePayment || userPayment;
    if (!payment) throw new Error("Payment not found");

    const { title, firstName, middleName, lastName } = user.personalDetails || {};
    const currency = payment.packages?.[0]?.currency || payment.currency || "RUB";
    const isRussian = currency === "RUB";

    const fullName = isRussian
      ? `${title || ""} ${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();

    const courseName = isRussian ? course.nameRussian : course.name;

    const packageDetails = payment.packages && Array.isArray(payment.packages)
      ? payment.packages.map(pkg => `${pkg.name} — ${pkg.amount} ${pkg.currency}`).join("<br>")
      : (payment.package || "");

    const emailSubject = isRussian
      ? `Счет за XI EAFO Базовые медицинские курсы по онкологии и онкопатологии - Номер счета от EAFO`
      : `Invoice for the course ${courseName} - ${invoiceNumber} from EAFO`;

    const emailBody = isRussian
      ? russianEmailTemplate(fullName, invoiceNumber, payment.paymentLink, packageDetails, payment.payableAmount, currency, courseName)
      : englishEmailTemplate(fullName, invoiceNumber, payment.paymentLink, packageDetails, payment.payableAmount, currency, courseName);

    const mail = { subject: emailSubject, html: emailBody, attachments: [] };

    // ✅ Attach the PDF from GridFS if available
    if (payment.contractFileId) {
      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db, { bucketName: "contracts" });

      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(payment.contractFileId));

      const chunks = [];
      downloadStream.on("data", (chunk) => chunks.push(chunk));
      downloadStream.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        mail.attachments.push({
          filename: `Contract_${invoiceNumber}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        });


        const emailResult = await sendEmailSMTP({ email, name: fullName }, mail);
        return res.status(200).json({
          success: true,
          message: "Invoice email resent with attachment",
          emailResult,
        });
      });

      downloadStream.on("error", (err) => {
        console.error("❌ Error reading contract PDF:", err.message);
        return res.status(500).json({ success: false, message: "Failed to read contract from storage." });
      });
    } else {
      console.warn("⚠️ No contractFileId found — sending email without attachment");
      const emailResult = await sendEmailSMTP({ email, name: fullName }, mail);
      return res.status(200).json({
        success: true,
        message: "Invoice email resent (no contract attachment)",
        emailResult,
      });
    }

  } catch (error) {
    console.error("Resend email error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});




router.post("/manual", async (req, res) => {
  const {
    email,
    courseId,
    transactionId,
    orderId,
    paymentUrl,
    currency,
    packages,
    amount,
    payableAmount,
    discountPercentage,
    code,
  } = req.body;

  if (!email || !courseId || !transactionId || !orderId) {
    return res.status(400).json({ success: false, message: "Missing required data." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ email }).session(session);
    if (!user) throw new Error("User not found");

    const userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) throw new Error("User is not enrolled in this course");

    const userPayment = userCourse.payments.find(p => p.transactionId === transactionId);
    if (!userPayment) throw new Error("Transaction ID not found in user payments");

    const course = await Course.findById(courseId).session(session);
    if (!course) throw new Error("Course not found");

    const coursePayment = course.payments.find(p => p.transactionId === transactionId);
    if (!coursePayment) throw new Error("Transaction ID not found in course payments");

    // Generate next Invoice Number
    let currentInvoiceNumber = course.currentInvoiceNumber || "EAFO-003/25/0100";
    const match = currentInvoiceNumber.match(/(\d{4})$/);
    let nextInvoiceNumber;

    if (match) {
      const currentNumber = parseInt(match[1], 10);
      const newNumber = (currentNumber + 1).toString().padStart(4, "0");
      nextInvoiceNumber = currentInvoiceNumber.replace(/(\d{4})$/, newNumber);
      course.currentInvoiceNumber = nextInvoiceNumber;
    } else {
      nextInvoiceNumber = "EAFO-003/25/0100";
      course.currentInvoiceNumber = nextInvoiceNumber;
    }

    const normalizedPackages = (packages || []).map(pkg => ({
      name: pkg.name,
      amount: parseFloat(pkg.amount),
      currency: pkg.currency,
      quantity: parseInt(pkg.quantity) || 1
    }));
    
    const calculatedTotalAmount = normalizedPackages.reduce(
      (sum, item) => sum + (item.amount * item.quantity),
      0
    );
    
    // Update User Payment
    Object.assign(userPayment, {
      invoiceNumber: nextInvoiceNumber,
      paymentLink: paymentUrl || null,
      status: "Pending",
      orderId,
      time: moment.tz("Europe/Moscow").toDate(),
      packages: normalizedPackages,
      totalAmount: calculatedTotalAmount,
      payableAmount,
      currency,
      discountPercentage,
      discountCode: code
    });
    
    // Update Course Payment
    Object.assign(coursePayment, {
      invoiceNumber: nextInvoiceNumber,
      paymentLink: paymentUrl || null,
      orderId,
      status: "Pending",
      time: moment.tz("Europe/Moscow").toDate(),
      packages: normalizedPackages,
      totalAmount: calculatedTotalAmount,
      payableAmount,
      currency,
      discountPercentage,
      discountCode: code
    });
    
    

    // Save updates
    await user.save({ session });
    await course.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Invoice generated and saved successfully",
      invoiceNumber: nextInvoiceNumber,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Invoice generation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});


router.put("/payment/mark-paid", async (req, res) => {
  const { invoiceNumber, email, courseId } = req.body;

  if (!invoiceNumber || !email || !courseId) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ email }).session(session);
    const course = await Course.findById(courseId).session(session);
    if (!user || !course) throw new Error("User or course not found");

    // Find payment in course
    const coursePayment = course.payments.find(p => p.invoiceNumber === invoiceNumber);
    if (!coursePayment) throw new Error("Invoice not found in course");

    // Generate or update AKT number
    let baseAkt = course.currentAktNumber || course.aktNumber;
    if (!baseAkt) {
      console.warn("Missing aktNumber on course, using fallback");
      baseAkt = "EAFO-003/25/000";
    }

    console.log(`Current AKT base: ${baseAkt}`);
    const match = baseAkt.match(/^(.*\/)(\d{3})$/);
    let newAktNumber = baseAkt;

    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2], 10) + 1;
      newAktNumber = `${prefix}${number.toString().padStart(3, "0")}`;
      course.currentAktNumber = newAktNumber;
    } else {
      console.warn("Invalid aktNumber format:", baseAkt);
    }

    // Update course payment

    const paidAt = moment.tz("Europe/Moscow").toDate();

    coursePayment.status = "Paid";
    coursePayment.paidAt = paidAt;
    coursePayment.aktNumber = newAktNumber;

    // Update user course payment
    const userCourse = user.courses.find(c => c.courseId.toString() === courseId);
    if (!userCourse) throw new Error("User is not enrolled in this course");

    const userPayment = userCourse.payments.find(p => p.invoiceNumber === invoiceNumber);
    if (!userPayment) throw new Error("Invoice not found in user payments");

    userPayment.status = "Paid";
    userPayment.paidAt = paidAt;
    userPayment.aktNumber = newAktNumber;

    // Save both models
    await course.save({ session });
    await user.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Payment marked as paid",
      aktNumber: newAktNumber,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});



 

// Route for email sending with attachment
router.post("/email-send", upload.single("attachment"), async (req, res) => {
    try {
        const recipients = JSON.parse(req.body.recipients);
        const mail = JSON.parse(req.body.mail);


        if (!recipients || recipients.length === 0) {
            return res.status(400).json({ success: false, message: "❌ Recipients required." });
        }

        if (!mail || !mail.subject || !mail.html) {
            return res.status(400).json({ success: false, message: "❌ Missing email content." });
        }

        const emailPromises = recipients.map(async (recipient) => {
            try {
                //Send Email using Rusender API
                const result = await sendEmailRusender(recipient, mail);
                return result;
            } catch (error) {
                return { email: recipient.email, status: "Failed", error: error.message };
            }
        });

        const results = await Promise.all(emailPromises);

        res.json({
            success: true,
            message: "Emails sent successfully.",
            results,
        });

    } catch (error) {
        console.error("Internal Server Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});



router.post("/test-remainder", async (req, res) => {
  const {
    email,
    firstName,
    middleName,
    lastName,
    gender,
    registrationType,
    package: packageName,
    registeredAt,
    amount,
    currency,
    isRussian = true,
    courseId
  } = req.body;

  if (!email || !courseId) {
    return res.status(400).json({ success: false, message: "Email and courseId are required." });
  }

  try {
    const salutation =
      gender?.toLowerCase() === "женщина" || gender?.toLowerCase() === "female"
        ? isRussian ? "Уважаемая" : "Dear Ms."
        : isRussian ? "Уважаемый" : "Dear Mr.";

    const fullName = `${firstName} ${middleName || ""}`.trim();
    const formattedDate = registeredAt
      ? new Date(registeredAt).toLocaleDateString(isRussian ? "ru-RU" : "en-GB")
      : "";

    const subject = isRussian
      ? "Тестирование для отбора на Конкурсное участие в XI EAFO Базовых медицинских  курсах по онкологии и онкопатологии"
      : "Testing for Competitive Participation in Basic Medical Courses";

      const html = isRussian
      ? `<p><strong>${salutation} ${fullName}!</strong></p>

      <p><strong>Заявка на Конкурсное участие в XI EAFO Базовых медицинских курсах по онкологии и онкопатологии одобрена!</strong></p>

      <p>Пожалуйста, ознакомьтесь <strong>с правилами прохождения тестирования:</strong></p>

      <p>1. Тест будет состоять из 40 вопросов с одним правильным ответом</p>
      <p>2. Для ответа на все вопросы будет 20 минут</p>
      <p>3. Экзамен проходит в защищённом режиме с системой дистанционного контроля. Мы отслеживаем Вашу активность во время экзамена, и любое подозрительное поведение фиксируется.</p>

      <p>Во время экзамена запрещены следующие действия:</p>
      <ul>
        <li>-Свертывание окна браузера</li>
        <li>-Изменение размера окна браузера</li>
        <li>-Открытие новой вкладки</li>
        <li>-Запуск других программ</li>
        <li>-Создание снимка экрана</li>
        <li>-Нажатие Ctrl + C</li>
        <li>-Нажатие Ctrl + V</li>
        <li>-Нажатие клавиши Print Screen</li>
        <li>-Нажатие клавиши F12.</li>
      </ul>

      <p><strong>Если будут выявлены нарушения правил, Вы получите предупреждение о подозрительном действии. В случае трёх нарушений, тест будет завершён досрочно.</strong></p>

      <p>По итогам результатов тестирования, а также оценки других критериев конкурсного отбора (мотивационное письмо, резюме, средний балл, наличие языковых сертификатов) будет составлен  список участников, согласно которому будет осуществлен отбор на Конкурсное участие.</p>

      <p>Напоминаем, что Вы выбрали следующую <strong>категорию и формат участия:</strong></p>

      <ul>
        <li>Категория участия: <strong>${registrationType || "-"}</strong></li>
        <li>Пакет участия: <strong>${packageName || "-"}</strong></li>
        <li>Дата подачи заявки: <strong>${formattedDate || "-"}</strong></li>
        <li>Стоимость участия: <strong>${amount || "-"} ${currency || "RUB"}</strong></li>
      </ul>

      <p><strong>Обращаем внимание, что для сохранения указанной выше цены необходимо решить тест и прикрепить все необходимые документы в личном кабинете <a href="https://www.eafo.info"/>EAFO</a></strong>.</p>

      <p style="color:red">до 15 июня 2025 года.<br/>

      <p>Контакты: электронная почта - basic@eafo.info, телефон: +7 (985) 125-77-88 (Telegram, Whatsapp)</p>

      <p>Техническая поддержка: support@eafo.info</p>

      <p>С уважением,<br/>Организационный комитет EAFO</p>`

      : `
        <p><strong>${salutation} ${fullName}!</strong></p>

        <p>You previously applied for Competitive Participation in the XI EAFO Basic Medical Courses. We are pleased to inform you that your application has been approved!</p>

        <p>To participate in the selection process, you need to complete the entrance test. A personal link to the test has been sent to your email.</p>

        <p>If you have any questions or need assistance, feel free to contact us at <a href="mailto:basic@eafo.info">basic@eafo.info</a> — we’re always happy to help!</p>

        <p><strong>Please read the test rules carefully:</strong></p>
        <ol>
          <li>The test consists of 40 questions with only one correct answer each.</li>
          <li>You will have 20 minutes to complete all questions.</li>
          <li>The test is conducted in a secure proctored environment. Your activity during the exam is monitored, and any suspicious behavior is logged.</li>
        </ol>

        <p><strong>The following actions are prohibited during the exam:</strong></p>
        <ul>
          <li>Minimizing the browser window</li>
          <li>Resizing the browser window</li>
          <li>Opening new browser tabs</li>
          <li>Launching other software</li>
          <li>Taking screenshots</li>
          <li>Using Ctrl + C / Ctrl + V</li>
          <li>Pressing Print Screen / F12</li>
        </ul>

        <p>Any violations will trigger a warning. After three warnings, the test will be terminated automatically.</p>

        <p>Based on your test results and other selection criteria (motivation letter, resume, GPA, language certificates), a ranked list of participants will be created. Access to Competitive Participation will be granted accordingly.</p>

        <p>More about the selection process:<br/>
        <a href="https://eafo.vercel.app/categories-of-participation">https://eafo.vercel.app/categories-of-participation</a></p>

        <p><strong>Your chosen participation details:</strong></p>
        <ul>
          <li><strong>Participation Category:</strong> ${participationCategory || "-"}</li>
          <li><strong>Participation Package:</strong> ${packageName || "-"}</li>
          <li><strong>Application Date:</strong> ${formattedDate || "-"}</li>
          <li><strong>Participation Fee:</strong> ${price || "-"}</li>
        </ul>

        <p><strong>Please note:</strong> To secure the stated fee, you must complete the test and upload the required documents to your EAFO personal account <strong>by June 15, 2025</strong>.</p>

        <p>If you have questions regarding the XI EAFO Basic Medical Courses, your application, pricing, or accommodation, contact us via:<br/>
        <a href="mailto:basic@eafo.info">basic@eafo.info</a> or WhatsApp/Telegram: +7 (985) 125-77-88</p>

        <p>For technical support regarding the website or your profile, email us at: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

        <p><strong>Thank you for participating in the XI EAFO Basic Medical Courses selection process. We look forward to your test results!</strong></p>

        <p>Best regards,<br/>EAFO Organizing Committee</p>
      `;
    // Send the email
    await sendEmailRusender({ email, name: fullName }, { subject, html });
    console.log("✅ Email sent to:", email);

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      console.warn("⚠️ User not found:", email);
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.log("✅ User found:", user._id);

    // Find the course
    const course = user.courses.find((c) => c.courseId.toString() === courseId.toString());
    if (!course) {
      console.warn("⚠️ Course not found in user.courses:", courseId);
      return res.status(404).json({ success: false, message: "Course not found for this user." });
    }
    console.log("✅ Course found in user.courses:", course.courseId);

    // Log emails object before
    console.log("📨 Emails status before update:", course.emails);

    // Update the emails object
    course.emails = {
      ...(course.emails || {}),
      reminderSent: true,
      sentAt: new Date(),
    };

    console.log("📩 Emails status after update:", course.emails);

    user.markModified("courses"); // Required for nested array update
    await user.save();

    console.log("💾 User saved successfully");

    res.status(200).json({ success: true, message: "Reminder email sent and status saved." });
  } catch (err) {
    console.error("❌ Error in /test-remainder:", err);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});




router.post("/confirmation", async (req, res) => {
  const {
    email,
    firstName,
    middleName,
    lastName,
    gender,
    registrationType,
    package: packageName,
    registeredAt,
    amount,
    currency,
    isRussian = true,
    courseId,
  } = req.body;

  if (!email || !courseId) {
    return res.status(400).json({ success: false, message: "Email and courseId are required." });
  }

  try {
    const salutation =
      gender?.toLowerCase() === "женщина" || gender?.toLowerCase() === "female"
        ? isRussian ? "Уважаемая" : "Dear Ms."
        : isRussian ? "Уважаемый" : "Dear Mr.";

    const fullName = `${firstName || ""} ${middleName || ""}`.trim();
    const formattedDate = registeredAt
      ? new Date(registeredAt).toLocaleDateString(isRussian ? "ru-RU" : "en-GB")
      : "";

    const subject = isRussian
      ? "Подтверждение: Конкурсное участие в Базовых медицинских курсах"
      : "Confirmation: Competitive Participation in Basic Medical Courses";

      const html = isRussian
      ? `
        <p><strong>${salutation} ${fullName}!</strong></p>

        <p>Ваш слот для <strong>Конкурсного участия</strong> в XI EAFO Базовых медицинских курсах подтвержден!</p>

        <p>Вы ранее подали заявку, и мы рады сообщить, что она была <strong>одобрена</strong>.</p>

        <p>На Вашу электронную почту отправлена персональная ссылка для прохождения <strong>вступительного теста</strong>.</p>

        <p><strong>Напоминаем Ваши регистрационные данные:</strong></p>
        <ul>
          <li><strong>Категория участия:</strong> ${registrationType || "-"}</li>
          <li><strong>Пакет участия:</strong> ${packageName || "-"}</li>
          <li><strong>Дата подачи заявки:</strong> ${formattedDate || "-"}</li>
          <li><strong>Стоимость участия:</strong> ${amount || "-"} ${currency || "RUB"}</li>
        </ul>

        <p><strong>Важно:</strong> для сохранения указанной стоимости, пожалуйста, пройдите тестирование и загрузите необходимые документы в личном кабинете EAFO до <strong>15 июня 2025 года</strong>.</p>

        <p>Если у Вас возникнут вопросы, пожалуйста, свяжитесь с нами: <a href="mailto:basic@eafo.info">basic@eafo.info</a> или через Telegram/WhatsApp: +7 (985) 125-77-88</p>

        <p>Тех. поддержка: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

        <p><strong>Благодарим за участие и ждем Ваши результаты!</strong></p>
        <p>С уважением,<br/>Организационный комитет EAFO</p>
      `
      : `
        <p><strong>${salutation} ${fullName}!</strong></p>

        <p>Your slot for <strong>Competitive Participation</strong> in the XI EAFO Basic Medical Courses has been <strong>confirmed</strong>.</p>

        <p>You previously submitted an application, and we are pleased to inform you that it has been <strong>approved</strong>.</p>

        <p>A personal test link has been sent to your email for the <strong>entrance examination</strong>.</p>

        <p><strong>Your registration details:</strong></p>
        <ul>
          <li><strong>Participation Category:</strong> ${registrationType || "-"}</li>
          <li><strong>Participation Package:</strong> ${packageName || "-"}</li>
          <li><strong>Application Date:</strong> ${formattedDate || "-"}</li>
          <li><strong>Participation Fee:</strong> ${amount || "-"} ${currency || "USD"}</li>
        </ul>

        <p><strong>Note:</strong> To retain this fee, please complete your test and upload the necessary documents in your EAFO account before <strong>June 15, 2025</strong>.</p>

        <p>If you have any questions, contact us via email: <a href="mailto:basic@eafo.info">basic@eafo.info</a> or WhatsApp/Telegram: +7 (985) 125-77-88</p>

        <p>Tech support: <a href="mailto:support@eafo.info">support@eafo.info</a></p>

        <p><strong>Thank you for participating, and we look forward to your test results!</strong></p>
        <p>Best regards,<br/>EAFO Organizing Committee</p>
      `;

    await sendEmailRusender({ email, name: fullName }, { subject, html });
    console.log("✅ Confirmation email sent to:", email);

    // Update database
    const user = await User.findOne({ email });
    if (!user) {
      console.warn("⚠️ User not found:", email);
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const course = user.courses.find((c) => c.courseId.toString() === courseId.toString());
    if (!course) {
      console.warn("⚠️ Course not found for user:", courseId);
      return res.status(404).json({ success: false, message: "Course not found for this user." });
    }

    console.log("📨 Previous emails object:", course.emails);

    course.emails = {
      ...(course.emails || {}),
      confirmationSent: true,
      sentAt: new Date(),
    };

    console.log("📩 Updated emails object:", course.emails);

    user.markModified("courses");
    await user.save();
    console.log("💾 User updated with confirmationSent status");

    res.status(200).json({ success: true, message: "Confirmation email sent and status saved." });
  } catch (err) {
    console.error("❌ Confirmation email error:", err);
    res.status(500).json({ success: false, message: "Failed to send confirmation email." });
  }
});




module.exports = router;
