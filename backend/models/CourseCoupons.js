// models/CourseCoupons.js
const mongoose = require('mongoose');
const { couponSchema } = require('./Coupons');

const courseCouponsSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
  coupons: [couponSchema],
});

module.exports = mongoose.model('CourseCoupons', courseCouponsSchema);
