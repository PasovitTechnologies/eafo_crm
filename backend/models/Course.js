const mongoose = require("mongoose");

// Item Schema (For Nested Items)
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" }
});

// Rule Schema (Nested Inside Course)
const ruleSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  conditions: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
      option: { type: String }, // The selected option from the question
      operator: { type: String, enum: ["AND", "OR"], required: true }
    }
  ],
  linkedItems: [{ type: mongoose.Schema.Types.ObjectId }] // Reference to items inside the course
});

const paymentSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true , default: "INV/EAFO-000-00001" },
  paymentId: { type: String, required: true },
  package: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  paymentLink: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
  time: { type: Date, default: Date.now }
});


// Course Schema
const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },        // Course name (EN)
    nameRussian: { type: String, required: true, trim: true, index: true }, // Course name (RU)
    description: { type: String, default: "", trim: true },                 // Description (EN)
    descriptionRussian: { type: String, default: "", trim: true },          // Description (RU)
    
    slug: { type: String, required: true, unique: true },                   // Unique slug for URL-friendly name

    date: { type: Date, required: true },                                   // Course date
    endDate: { type: Date, required: true },
    bannerUrl: { type: String, required: true, trim: true },                // Banner URL (EN)
    bannerUrlRussian: { type: String, required: true, trim: true },         // Banner URL (RU)
    websiteLink: { type: String, required: true, trim: true }, 
    invoiceNumber: { type: String, required: true, trim: true }, 
    
    currentInvoiceNumber: { type: String, required: false, trim: true },            // Invoice number
    // Invoice number
    items: [itemSchema], // Array of items
    forms: [
      {
        formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" }, // Form reference
        formName: { type: String },                                     // Store form name
        isUsedForRussian: { type: Boolean, default: false },            // ✅ Added field
        isUsedForRegistration: { type: Boolean, default: false }        // ✅ Added field
      }
    ],
    payments: [paymentSchema],
    rules: [ruleSchema] // Array of rules stored within the course
  },
  { timestamps: true }
);

courseSchema.pre("save", function (next) {
  this.slug = this.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
  next();
});

module.exports = mongoose.model("Course", courseSchema);
