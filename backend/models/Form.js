const mongoose = require("mongoose");

// 🧠 Condition Schema
const conditionSchema = new mongoose.Schema({
  triggerQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Form", // ✅ Corrected reference to the Course model
    required: true,
  },
  condition: {
    type: String,
    required: true, // Expected answer (e.g., "Yes", "No")
  },
  logic: {
    type: String,
    enum: ["AND", "OR"],
    default: "AND", // Logical operator for chaining conditions
  },
});

// 🟢 Rule Schema
const ruleSchema = new mongoose.Schema({
  conditions: [conditionSchema],
  action: {
    type: String,
    enum: ["show", "hide"],
    default: "show",
  },
  targetQuestionIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form", // ✅ Corrected reference
      required: true,
    },
  ],
});

// 🟢 Question Schema
const questionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    type: {
      type: String,
      enum: [
        "text",
        "textarea",
        "select",
        "radio",
        "date",
        "phone",
        "country",
        "category",
        "file",
        "email",
        "number",
        "checkbox",
        "multiple",
        "multi-select",
        "content",
        "accept",
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    options: {
      type: [{ type: mongoose.Schema.Types.Mixed }],
      default: [],
    },
    isConditional: {
      type: Boolean,
      default: false,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    isUsedForInvoice: {
      type: Boolean,
      default: false,
    },
    // NEW: Add these fields for file upload control
    multiple: {
      type: Boolean,
      default: false, // Default to single file upload
    },
    maxFiles: {
      type: Number,
      min: 1,
    },
    maxFileSize: { // In MB
      type: Number,
      default: 5, // 5MB default
    },
    acceptedFileTypes: {
      type: [String],
      default: ["*"], // All types allowed by default
      validate: {
        validator: function(types) {
          // Ensure array contains either "*" or specific types
          return types.includes("*") || types.every(t => typeof t === "string");
        },
        message: "File types must be an array of strings or ['*']"
      }
    },
    rules: [ruleSchema],
  },
  { timestamps: true }
);


const submissionSchema = new mongoose.Schema({
  email: String,
  formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: false },
  responses: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: mongoose.Schema.Types.Mixed,
    files: [  // <-- Changed from `file` to `files`
      {
        fileId: mongoose.Schema.Types.ObjectId,
        fileName: String,
        contentType: String,
        size: Number,
        uploadDate: Date,
        preview: String // optional if needed
      }
    ],
    isUsedForInvoice: Boolean
  }]
  ,
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  isUsedForRegistration: Boolean,
  isUsedForRussian: Boolean
}, { timestamps: true });




// 📝 Form Schema

const formSchema = new mongoose.Schema(
  {
    formName: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    formLogo: {
      data: { 
        type: Buffer 
      },
      contentType: { 
        type: String 
      },
      // Optional: store URL if you want to keep both options
      url: { 
        type: String 
      }
    },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // Ensure it references a course
    isUsedForRussian: { type: Boolean, default: false }, // New field
    isUsedForRegistration: { type: Boolean, default: false }, // New field
    questions: [questionSchema],
    submissions: [submissionSchema],
  },
  { timestamps: true }
);

// 🚀 Export Models
const Question = mongoose.model("Question", questionSchema);
const Form = mongoose.model("Form", formSchema);
const Submission = mongoose.model("Submission", submissionSchema);


module.exports = { Question, Form, Submission };
