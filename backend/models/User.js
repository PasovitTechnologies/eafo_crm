const mongoose = require("mongoose");
const moment = require("moment-timezone");

const fileSchema = new mongoose.Schema(
  {
    fileId: mongoose.Schema.Types.ObjectId,
    fileName: String,
    contentType: String,
    size: Number,
    uploadDate: Date,
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    passport: fileSchema,
    motivation: fileSchema,
    resume: fileSchema,
    academicCertificates: fileSchema,
    certificatePdf: fileSchema,
    certificateLink: String,
    referral: String,
    institutionDocument: fileSchema,
    uploadedAt: {
      type: Date,
      default: () => moment.tz("Europe/Moscow").toDate(),
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    dashboardLang: { type: String, default: "en" },
    registeredAt: { type: Date, default: Date.now },
    profileImage: {
      data: Buffer,
      contentType: String,
    },

    // Personal Details Section
    personalDetails: {
      title: { type: String, required: true },
      firstName: { type: String, required: true },
      middleName: { type: String },
      lastName: { type: String, required: true },
      phone: { type: String, required: true },
      countryCode: { type: String, default: "+1" },
      dob: { type: Date, required: true },
      country: { type: String, required: true },
      gender: { type: String, required: true },
      acceptTerms: { type: Boolean, required: true },
    },

    // Professional Details Section
    professionalDetails: {
      university: { type: String, required: true },
      department: { type: String, required: true },
      profession: { type: String },
      position: { type: String },
    },
    documents: documentSchema,

    // Webinars Section
    webinars: [
      {
        webinarId: { type: mongoose.Schema.Types.ObjectId, ref: "Webinar" },
        registeredAt: {
          type: Date,
          default: () => moment.tz("Europe/Moscow").toDate(),
        },
      },
    ],

    // Courses & Payments Section
    courses: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // ✅ Reference to Course
        submittedAt: {
          type: Date,
          default: () => moment.tz("Europe/Moscow").toDate(), // ✅ Set to Moscow time
        },
        // 📝 Array of registered forms
        registeredForms: [
          {
            formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" }, // ✅ Form reference
            formName: { type: String }, // ✅ Form name
            isUsedForRegistration: { type: Boolean, default: false }, // ✅ Registration flag
            isUsedForRussian: { type: Boolean, default: false }, // ✅ Russian flag
          },
        ],

        // 💳 Payments array
        payments: [
          {
            transactionId: {
              type: String, // 6-digit string
              required: true,
            },
            packages: [
              {
                name: { type: String, required: true },
                quantity: { type: String, required: true },
                amount: { type: Number, required: true },
                currency: { type: String, required: true },
              },
            ],
            totalAmount: { type: Number, required: true }, // Sum of package amounts
            payableAmount: { type: Number, required: false }, // After discount
            currency: { type: String, required: true },

            orderId: { type: String, required: false },
            invoiceNumber: { type: String, default: "" },
            aktNumber: { type: String },
            paymentId: { type: String, required: false },
            paymentLink: { type: String, required: false },
            time: { type: Date },
            status: { type: String, default: "Not created" },

            discountCode: { type: String },
            discountPercentage: { type: Number },
            discountStatus: { type: String },
            paidAt: { type: Date },
            contractFileId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "contracts.files", // optional, for reference clarity
            },
            submittedAt: Date,
          },
        ],

        qrCodes: [
          {
            qrFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
            formId: { type: mongoose.Schema.Types.ObjectId, required: true },
            courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
            url: { type: String, required: true },
            generatedAt: {
              type: Date,
              default: () => moment.tz("Europe/Moscow").toDate(),
            },
            isActive: { type: Boolean, default: true },
          },
        ],

        notes: [
          {
            text: { type: String, required: true },
            createdAt: {
              type: Date,
              default: () => moment.tz("Europe/Moscow").toDate(),
            },
          },
        ],

        emails: {
          reminderSent: Boolean,
          confirmationSent: Boolean,
          sentAt: Date,
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("User", userSchema);
