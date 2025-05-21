const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, unique: true }, // Added field
  groupid: { type: Number }, // Optional now, or move into `groups` if it's a list
  candidateId: { type: String, default: null },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }, //In production, store hashed passwords
  groups: { type: [Number], default: [] }, // Added if you're using groups array
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Candidate', candidateSchema);
