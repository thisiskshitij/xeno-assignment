const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true // Ensure each Google user has a unique ID
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Ensure each user email is unique
  },
  // You can add other fields as needed (e.g., createdAt, lastLogin)
  createdAt: {
      type: Date,
      default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;