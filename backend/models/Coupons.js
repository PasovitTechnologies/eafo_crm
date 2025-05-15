// models/Coupon.js
const mongoose = require('mongoose');

const couponUserStatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['not_used', 'used', 'paid'],
    default: 'not_used',
  },
  liked: { type: Boolean, default: false },
}, { _id: false });

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true },
  type: { type: String, enum: ['common', 'user'], required: true },
  percentage: { type: Number, required: true },
  users: [couponUserStatusSchema],
  totalLimit: { type: Number, default: null },
  currentLimit: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

module.exports = { couponSchema };
