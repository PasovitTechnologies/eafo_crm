const mongoose = require("mongoose");

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
      agreePersonalData: { type: Boolean, required: true },
      acceptTerms: { type: Boolean, required: true },
    },

    // Professional Details Section
    professionalDetails: {
      university: { type: String, required: true },
      department: { type: String, required: true },
      profession: { type: String },
      position: { type: String },
    },

    // Webinars Section
    webinars: [
      {
        webinarId: { type: mongoose.Schema.Types.ObjectId, ref: "Webinar" },
        registeredAt: { type: Date, default: Date.now },
      },
    ],

    // Courses & Payments Section
    courses: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },  // ✅ Reference to Course
        submittedAt: { type: Date, default: Date.now },                     // ✅ Submission timestamp
        
        // 📝 Array of registered forms
        registeredForms: [
          {
            formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },   // ✅ Form reference
            formName: { type: String },                                      // ✅ Form name
            isUsedForRegistration: { type: Boolean, default: false },        // ✅ Registration flag
            isUsedForRussian: { type: Boolean, default: false },             // ✅ Russian flag
          }
        ],
        
        // 💳 Payments array
        payments: [
          {
            invoiceNumber: { type: String, required: true, default: "INV/EAFO-000-00001"  },
            paymentId: { type: String, required: true },                     // ✅ Unique payment ID
            paymentLink: { type: String, required: true },                   // ✅ Link to payment gateway
            package: { type: String, required: true },                       // ✅ Payment package
            amount: { type: Number, required: true },                        // ✅ Payment amount
            currency: { type: String, required: true },                      // ✅ Currency used
            time: { type: Date, default: Date.now },
            status: { type: String, default: "Not created" }                 // ✅ Payment status
          }
        ]
      }
    ]
,    
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("User", userSchema);
