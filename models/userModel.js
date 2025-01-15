const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    username: { type: String, unique: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
