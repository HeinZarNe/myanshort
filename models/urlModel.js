const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    name: { type: String },
    userId: { type: String },
    shortId: { type: String },
    originalUrl: { type: String, unique: true },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);
urlSchema.index({ user: 1, originalUrl: 1 }, { unique: true });
module.exports = mongoose.model("Url", urlSchema);
