const mongoose = require("mongoose");

// Item Schema (For Nested Items)
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
});

// Rule Schema (Nested Inside Course)
const ruleSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  conditions: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
      option: { type: String }, // The selected option from the question
      operator: { type: String, enum: ["AND", "OR"], required: true },
    },
  ],
  linkedItems: [{ type: mongoose.Schema.Types.ObjectId }], // Reference to items inside the course
});

const paymentSchema = new mongoose.Schema({
  email: { type: String, required: false },
  transactionId: { type: String, required: true },
  invoiceNumber: { type: String, required: false, default: "" },
  paymentId: { type: String, required: false },
  package: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  paymentLink: { type: String, required: false },
  status: {
    type: String,
    enum: ["Not created", "Pending", "Paid", "Failed", "Expired"],
    default: "Not created",
  },
  time: { type: Date },
});

// Course Schema
const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    nameRussian: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    descriptionRussian: { type: String, default: "", trim: true },

    slug: { type: String, required: true, unique: true },

    date: { type: Date, required: true },
    endDate: { type: Date, required: true },
    bannerUrl: { type: String, required: true, trim: true },
    bannerUrlRussian: { type: String, required: true, trim: true },
    websiteLink: { type: String, required: true, trim: true },
    invoiceNumber: { type: String, required: true, trim: true },

    currentInvoiceNumber: { type: String, required: false, trim: true },
   
    items: [itemSchema],
    forms: [
      {
        formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
        formName: { type: String },
        isUsedForRussian: { type: Boolean, default: false },
        isUsedForRegistration: { type: Boolean, default: false },
      },
    ],
    payments: [paymentSchema],
    rules: [ruleSchema],
  },
  { timestamps: true }
);

courseSchema.pre("save", function (next) {
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  next();
});

module.exports = mongoose.model("Course", courseSchema);
