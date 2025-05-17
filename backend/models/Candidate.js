const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  groupid: { type: Number, required: true },
  candidateId: { type: String, default: null },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }, // Ideally hash this in production
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Candidate', candidateSchema);
