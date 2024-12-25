const Url = require("../models/urlModel");
const shortid = require("shortid");
const validator = require("validator");
exports.shortenUrl = async (req, res) => {
  let { originalUrl, userId } = req.body;
  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = `https://${originalUrl}`;
  }
  if (!validator.isURL(originalUrl)) {
    return res.status(400).json({ message: "Invalid URL" });
  }
  const shortId = shortid.generate();
  const newUrl = new Url({ shortId, originalUrl, userId });
  try {
    await newUrl.save();
    res.json({ shortId });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ message: "URL already exists" });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
      console.error(err);
    }
  }
};

exports.redirectUrl = async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.findOne({ shortId });
    if (entry) {
      entry.clicks += 1;
      await entry.save();
      res.redirect(entry.originalUrl);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}expired-url`);
    }
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
    console.error(err);
  }
};

exports.deleteUrl = async (req, res) => {
  const { shortId } = req.params;
  try {
    const entry = await Url.findOneAndDelete({ shortId });
    if (entry) {
      res.status(200).json({ message: "Url deleted successfully" });
    } else {
      res.status(404).json({ message: "URL not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllUrls = async (req, res) => {
  try {
    const urls = await Url.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    res.json(urls);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
    console.error(err);
  }
};
