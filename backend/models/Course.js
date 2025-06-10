const mongoose = require("mongoose");
const { couponSchema } = require('./Coupons');

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

  transactionId: { type: String, required: true }, // Shared ID for the whole transaction
  invoiceNumber: { type: String, required: false, default: "" },
  paymentId: { type: String, required: false },
  aktNumber: { type: String },
  paymentLink: { type: String, required: false },
  orderId: { type: String, required: false },

  // Multiple packages per transaction
  packages: [
    {
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      quantity: { type: String, required: true},
      currency: { type: String, required: true },
    }
  ],

  totalAmount: { type: Number, required: true },       // Sum of all package amounts
  payableAmount: { type: Number, required: false },    // Final amount after discount (optional)

  discountCode: { type: String, required: false },
  discountPercentage: { type: String, required: false },
  discountStatus: { type: String, required: false },

  paidAt: { type: Date },
  time: { type: Date },

  status: {
    type: String,
    enum: ["Not created", "Pending", "Paid", "Failed", "Expired", "free"],
    default: "Not created",
  },
  contractFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'contracts.files', // optional, for reference clarity
  },
  submittedAt: Date
  
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
    aktNumber: { type: String, required: true, trim: true },
    currentAktNumber: { type: String, required: false, trim: true },

    status: {
      type: String,
      enum: ["Active", "Not Active"],
      default: "Active",
    },
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
    rules: [ruleSchema]
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
