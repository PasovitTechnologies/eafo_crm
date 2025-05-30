const mongoose = require("mongoose");
const moment = require("moment-timezone");


const fileSchema = new mongoose.Schema({
  fileId: mongoose.Schema.Types.ObjectId,
  fileName: String,
  contentType: String,
  size: Number,
  uploadDate: Date,
}, { _id: false });

const documentSchema = new mongoose.Schema({
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
}, { _id: false });

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
        registeredAt: { type: Date, default: () => moment.tz("Europe/Moscow").toDate() },      },
    ],

    // Courses & Payments Section
    courses: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },  // ✅ Reference to Course
        submittedAt: {
          type: Date,
          default: () => moment.tz("Europe/Moscow").toDate(), // ✅ Set to Moscow time
        },        
        // 📝 Array of registered forms
        registeredForms: [
          {
            formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },   // ✅ Form reference
            formName: { type: String },                                      // ✅ Form name
            isUsedForRegistration: { type: Boolean, default: false },        // ✅ Registration flag
            isUsedForRussian: { type: Boolean, default: false }         // ✅ Russian flag
          }
        ],
        
        // 💳 Payments array
        payments: [
          {
            transactionId: {
              type: String,    // 6-digit string
              required: true
            }, 
            package: { type: String, required: false },         // e.g., "Package 1"
            amount: { type: Number, required: false },           // e.g., 24500
            currency: { type: String, required: false },         // e.g., "INR"
            orderId: { type: String, required: false },         // e.g., "INR"

            // 👇 Fields you will push LATER during payment processing
            invoiceNumber: { type: String, required: false, default: "" },
            paymentId: { type: String, required: false },         // Unique ID from payment gateway
            paymentLink: { type: String, required: false },       // URL to payment link
            time: { type: Date },                                 // Will push manually later
            status: { type: String, default: "Not created" },    
            discountCode: { type: String, required: false },            
            discountPercentage: { type: String, required: false },
            discountStatus: { type: String, required: false },
            payableAmount: { type: String, required: false },

          }
        ],

        qrCodes: [{
          qrFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
          formId: { type: mongoose.Schema.Types.ObjectId, required: true },
          courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
          url: { type: String, required: true },
          generatedAt: { type: Date, default: () => moment.tz("Europe/Moscow").toDate() },
          isActive: { type: Boolean, default: true }
        }],

        notes: [{
          paymentId: { type: mongoose.Schema.Types.ObjectId, required: true },
          text: { type: String, required: true },
          createdAt: { type: Date, default: () => moment.tz("Europe/Moscow").toDate() }
          }]
      
        
      }
    ]
,    
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("User", userSchema);
