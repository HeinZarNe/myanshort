const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    userId: { type: String },
    shortId: { type: String },
    originalUrl: { type: String, unique: true },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Url", urlSchema);